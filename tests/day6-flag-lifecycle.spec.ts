import { describe, it, expect } from 'vitest';
import { auditFlagLifecycle } from '../src/lifecycle/flagLifecycleAuditor.js';

describe('Day 6: Feature Flag Lifecycle & Staleness Auditor', () => {
  it('flags stale release flags, missing fallbacks, and dead unreferenced flags', () => {
    const report = auditFlagLifecycle(
      [
        {
          key: 'healthy_flag',
          type: 'release',
          owner: 'checkout-qe',
          createdAt: '2026-11-10T00:00:00Z',
          ttlDays: 30,
          rolloutPercentage: 50,
          hasFallbackDefault: true,
          referencedInCode: true,
        },
        {
          key: 'stale_experiment',
          type: 'experiment',
          owner: 'growth-qe',
          createdAt: '2026-08-01T00:00:00Z',
          ttlDays: 30,
          rolloutPercentage: 100,
          hasFallbackDefault: false,
          referencedInCode: false,
        },
      ],
      '2026-11-15T00:00:00Z'
    );

    expect(report.passed).toBe(false);
    expect(report.healthyFlags).toBe(1);
    expect(report.findings.map((f) => f.ruleId)).toEqual(
      expect.arrayContaining(['MISSING_FALLBACK', 'DEAD_UNREFERENCED_FLAG', 'STALE_FLAG_TTL'])
    );
  });
});
