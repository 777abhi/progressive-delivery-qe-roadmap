import { describe, it, expect } from 'vitest';
import { compareShadowTraffic } from '../src/shadow/shadowDiffEngine.js';

describe('Day 3: Dark Launch & Shadow Traffic Diffing', () => {
  it('passes when shadow responses match baseline within p95 latency budget', () => {
    const report = compareShadowTraffic([
      {
        requestId: 'r1',
        baselineStatus: 200,
        shadowStatus: 200,
        baselineLatencyMs: 40,
        shadowLatencyMs: 48,
        baselineBody: { total: 99.5, currency: 'USD', traceId: 'a' },
        shadowBody: { total: 99.5, currency: 'USD', traceId: 'b' },
      },
    ], { ignoreFields: ['traceId'] });

    expect(report.passed).toBe(true);
    expect(report.parityRatePct).toBe(100);
    expect(report.p95DeltaMs).toBe(8);
  });

  it('detects schema drift, value mismatches, and status regressions', () => {
    const report = compareShadowTraffic([
      {
        requestId: 'r1',
        baselineStatus: 200,
        shadowStatus: 500,
        baselineLatencyMs: 30,
        shadowLatencyMs: 120,
        baselineBody: { total: 100, discount: 10 },
        shadowBody: { total: 95 },
      },
    ]);

    expect(report.passed).toBe(false);
    expect(report.findings.map((f) => f.type)).toEqual(
      expect.arrayContaining(['STATUS_MISMATCH', 'VALUE_MISMATCH', 'SCHEMA_DRIFT'])
    );
  });
});
