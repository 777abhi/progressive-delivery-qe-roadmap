import { describe, it, expect } from 'vitest';
import { evaluateProgressiveReleaseGate } from '../src/releaseGate/progressiveGate.js';

describe('Day 7: Progressive Delivery CI/CD Release Gate', () => {
  const baseInput = {
    flagSpaces: [
      { key: 'new_checkout_ui', values: [false, true] },
      { key: 'async_fraud_check', values: [false, true] },
    ],
    shadowSamples: Array.from({ length: 10 }, (_, i) => ({
      requestId: `req-${i}`,
      baselineStatus: 200,
      shadowStatus: 200,
      baselineLatencyMs: 40,
      shadowLatencyMs: 42,
      baselineBody: { ok: true },
      shadowBody: { ok: true },
    })),
    baselineCanary: { requests: 200, errors: 1, latenciesMs: Array(200).fill(45) },
    canaryMetrics: { requests: 100, errors: 0, latenciesMs: Array(100).fill(46) },
    managedFlags: [
      {
        key: 'new_checkout_ui',
        type: 'release' as const,
        owner: 'checkout-qe',
        createdAt: '2026-11-10T00:00:00Z',
        ttlDays: 30,
        rolloutPercentage: 25,
        hasFallbackDefault: true,
        referencedInCode: true,
      },
    ],
    nowIso: '2026-11-15T00:00:00Z',
  };

  it('returns PASS when all progressive delivery gates are green', () => {
    const report = evaluateProgressiveReleaseGate(baseInput);
    expect(report.verdict).toBe('PASS');
    expect(report.canaryVerdict).toBe('PROMOTE');
    expect(report.blockingReasons).toHaveLength(0);
  });

  it('returns FAIL when canary SLO or flag lifecycle regresses', () => {
    const report = evaluateProgressiveReleaseGate({
      ...baseInput,
      canaryMetrics: { requests: 100, errors: 10, latenciesMs: Array(100).fill(150) },
    });
    expect(report.verdict).toBe('FAIL');
    expect(report.canaryVerdict).toBe('ROLLBACK');
    expect(report.blockingReasons.length).toBeGreaterThan(0);
  });
});
