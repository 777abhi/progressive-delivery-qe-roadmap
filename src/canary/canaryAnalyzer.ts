export interface CanaryCohortMetrics {
  requests: number;
  errors: number;
  latenciesMs: number[];
}

export interface CanarySloThresholds {
  maxErrorRateDeltaPct: number;
  maxP95Ratio: number; // e.g. 1.25 means canary p95 <= 1.25 * baseline p95
  minSampleSize: number;
}

export interface CanaryDecision {
  verdict: 'PROMOTE' | 'HOLD' | 'ROLLBACK';
  baselineErrorRatePct: number;
  canaryErrorRatePct: number;
  errorRateDeltaPct: number;
  baselineP95Ms: number;
  canaryP95Ms: number;
  p95Ratio: number;
  reasons: string[];
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

export function analyzeCanaryRelease(
  baseline: CanaryCohortMetrics,
  canary: CanaryCohortMetrics,
  thresholds: CanarySloThresholds = {
    maxErrorRateDeltaPct: 0.5,
    maxP95Ratio: 1.25,
    minSampleSize: 50,
  }
): CanaryDecision {
  const baselineErrorRatePct =
    baseline.requests === 0 ? 0 : Number(((baseline.errors / baseline.requests) * 100).toFixed(3));
  const canaryErrorRatePct =
    canary.requests === 0 ? 0 : Number(((canary.errors / canary.requests) * 100).toFixed(3));
  const errorRateDeltaPct = Number((canaryErrorRatePct - baselineErrorRatePct).toFixed(3));

  const baselineP95Ms = p95(baseline.latenciesMs);
  const canaryP95Ms = p95(canary.latenciesMs);
  const p95Ratio =
    baselineP95Ms === 0 ? 1 : Number((canaryP95Ms / baselineP95Ms).toFixed(3));

  const reasons: string[] = [];

  if (canary.requests < thresholds.minSampleSize) {
    reasons.push(
      `Insufficient canary sample size (${canary.requests} < ${thresholds.minSampleSize})`
    );
    return {
      verdict: 'HOLD',
      baselineErrorRatePct,
      canaryErrorRatePct,
      errorRateDeltaPct,
      baselineP95Ms,
      canaryP95Ms,
      p95Ratio,
      reasons,
    };
  }

  if (errorRateDeltaPct > thresholds.maxErrorRateDeltaPct) {
    reasons.push(
      `Error rate delta +${errorRateDeltaPct}% exceeds max +${thresholds.maxErrorRateDeltaPct}%`
    );
  }
  if (p95Ratio > thresholds.maxP95Ratio) {
    reasons.push(`Canary p95 ratio ${p95Ratio}x exceeds max ${thresholds.maxP95Ratio}x`);
  }

  const verdict = reasons.length > 0 ? 'ROLLBACK' : 'PROMOTE';
  if (verdict === 'PROMOTE') {
    reasons.push('All canary error-rate and p95 latency SLOs within budget');
  }

  return {
    verdict,
    baselineErrorRatePct,
    canaryErrorRatePct,
    errorRateDeltaPct,
    baselineP95Ms,
    canaryP95Ms,
    p95Ratio,
    reasons,
  };
}
