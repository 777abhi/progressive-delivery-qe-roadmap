import { evaluateProgressiveReleaseGate } from './progressiveGate.js';

const report = evaluateProgressiveReleaseGate({
  flagSpaces: [
    { key: 'new_checkout_ui', values: [false, true] },
    { key: 'async_fraud_check', values: [false, true] },
    { key: 'pricing_tier', values: ['v1', 'v2'] },
  ],
  shadowSamples: Array.from({ length: 20 }, (_, i) => ({
    requestId: `req-${i + 1}`,
    baselineStatus: 200,
    shadowStatus: 200,
    baselineLatencyMs: 42 + (i % 5),
    shadowLatencyMs: 44 + (i % 5),
    baselineBody: { total: 100, currency: 'USD' },
    shadowBody: { total: 100, currency: 'USD' },
  })),
  baselineCanary: {
    requests: 200,
    errors: 1,
    latenciesMs: Array.from({ length: 200 }, (_, i) => 40 + (i % 20)),
  },
  canaryMetrics: {
    requests: 100,
    errors: 0,
    latenciesMs: Array.from({ length: 100 }, (_, i) => 41 + (i % 18)),
  },
  managedFlags: [
    {
      key: 'new_checkout_ui',
      type: 'release',
      owner: 'checkout-qe',
      createdAt: '2026-11-01T00:00:00Z',
      ttlDays: 30,
      rolloutPercentage: 25,
      hasFallbackDefault: true,
      referencedInCode: true,
    },
  ],
  nowIso: '2026-11-15T00:00:00Z',
});

console.log(JSON.stringify(report, null, 2));
if (report.verdict !== 'PASS') {
  process.exit(1);
}
