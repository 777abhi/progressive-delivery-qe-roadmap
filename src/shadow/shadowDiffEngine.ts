export interface ShadowSample {
  requestId: string;
  baselineStatus: number;
  shadowStatus: number;
  baselineLatencyMs: number;
  shadowLatencyMs: number;
  baselineBody: Record<string, unknown>;
  shadowBody: Record<string, unknown>;
}

export interface ShadowDiffFinding {
  requestId: string;
  type: 'STATUS_MISMATCH' | 'SCHEMA_DRIFT' | 'VALUE_MISMATCH';
  field?: string;
  baselineValue?: unknown;
  shadowValue?: unknown;
}

export interface ShadowDiffReport {
  totalSamples: number;
  parityPassCount: number;
  parityRatePct: number;
  baselineP95Ms: number;
  shadowP95Ms: number;
  p95DeltaMs: number;
  findings: ShadowDiffFinding[];
  passed: boolean;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

export function compareShadowTraffic(
  samples: ShadowSample[],
  options: { maxP95DeltaMs?: number; minParityRatePct?: number; ignoreFields?: string[] } = {}
): ShadowDiffReport {
  const maxP95DeltaMs = options.maxP95DeltaMs ?? 50;
  const minParityRatePct = options.minParityRatePct ?? 99;
  const ignore = new Set(options.ignoreFields ?? []);

  const findings: ShadowDiffFinding[] = [];
  let parityPassCount = 0;

  for (const s of samples) {
    let sampleOk = true;
    if (s.baselineStatus !== s.shadowStatus) {
      sampleOk = false;
      findings.push({
        requestId: s.requestId,
        type: 'STATUS_MISMATCH',
        baselineValue: s.baselineStatus,
        shadowValue: s.shadowStatus,
      });
    }

    const keys = new Set([...Object.keys(s.baselineBody), ...Object.keys(s.shadowBody)]);
    for (const k of keys) {
      if (ignore.has(k)) continue;
      const inBase = k in s.baselineBody;
      const inShadow = k in s.shadowBody;
      if (!inBase || !inShadow) {
        sampleOk = false;
        findings.push({
          requestId: s.requestId,
          type: 'SCHEMA_DRIFT',
          field: k,
          baselineValue: inBase ? typeof s.baselineBody[k] : 'MISSING',
          shadowValue: inShadow ? typeof s.shadowBody[k] : 'MISSING',
        });
      } else if (JSON.stringify(s.baselineBody[k]) !== JSON.stringify(s.shadowBody[k])) {
        sampleOk = false;
        findings.push({
          requestId: s.requestId,
          type: 'VALUE_MISMATCH',
          field: k,
          baselineValue: s.baselineBody[k],
          shadowValue: s.shadowBody[k],
        });
      }
    }

    if (sampleOk) parityPassCount++;
  }

  const baselineP95Ms = percentile95(samples.map((s) => s.baselineLatencyMs));
  const shadowP95Ms = percentile95(samples.map((s) => s.shadowLatencyMs));
  const p95DeltaMs = shadowP95Ms - baselineP95Ms;
  const parityRatePct =
    samples.length === 0 ? 100 : Number(((parityPassCount / samples.length) * 100).toFixed(2));

  const passed = parityRatePct >= minParityRatePct && p95DeltaMs <= maxP95DeltaMs;

  return {
    totalSamples: samples.length,
    parityPassCount,
    parityRatePct,
    baselineP95Ms,
    shadowP95Ms,
    p95DeltaMs,
    findings,
    passed,
  };
}
