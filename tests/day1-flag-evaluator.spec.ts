import { describe, it, expect } from 'vitest';
import { evaluateFlag, computeStickyBucket, type FeatureFlagDefinition } from '../src/flags/flagEvaluator.js';

const checkoutFlag: FeatureFlagDefinition = {
  key: 'new_checkout_ui',
  enabled: true,
  defaultVariation: true,
  fallbackVariation: false,
  rolloutPercentage: 25,
  rules: [
    {
      id: 'beta-testers',
      conditions: [
        { attribute: 'tier', operator: 'in', value: ['beta', 'internal'] },
        { attribute: 'appVersion', operator: 'semverGte', value: '2.4.0' },
      ],
      variation: true,
      rolloutPercentage: 100,
    },
  ],
};

describe('Day 1: Deterministic Feature Flag Evaluator', () => {
  it('evaluates sticky buckets deterministically for the same targetingKey', () => {
    const b1 = computeStickyBucket('new_checkout_ui', 'user-42');
    const b2 = computeStickyBucket('new_checkout_ui', 'user-42');
    expect(b1).toBe(b2);
    expect(b1).toBeGreaterThanOrEqual(0);
    expect(b1).toBeLessThan(100);
  });

  it('matches targeting rules with semverGte and in operators', () => {
    const res = evaluateFlag(checkoutFlag, {
      targetingKey: 'user-100',
      attributes: { tier: 'beta', appVersion: '2.5.1' },
    });
    expect(res.value).toBe(true);
    expect(res.reason).toBe('TARGETING_MATCH');
    expect(res.ruleId).toBe('beta-testers');
  });

  it('falls back safely when flag is disabled or targetingKey is missing', () => {
    const disabled = evaluateFlag({ ...checkoutFlag, enabled: false }, { targetingKey: 'user-1' });
    expect(disabled.value).toBe(false);
    expect(disabled.reason).toBe('DISABLED');

    const missingKey = evaluateFlag(checkoutFlag, { targetingKey: '' });
    expect(missingKey.value).toBe(false);
    expect(missingKey.reason).toBe('ERROR_FALLBACK');
  });
});
