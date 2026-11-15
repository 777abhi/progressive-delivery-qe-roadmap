import { describe, it, expect } from 'vitest';
import { generatePairwiseMatrix, isConflict } from '../src/combinatorial/pairwiseMatrix.js';

describe('Day 2: Combinatorial Pairwise Flag Matrix', () => {
  it('compresses combinatorial explosion while achieving 100% 2-wise coverage', () => {
    const report = generatePairwiseMatrix([
      { key: 'new_checkout_ui', values: [false, true] },
      { key: 'async_fraud_check', values: [false, true] },
      { key: 'pricing_engine', values: ['legacy', 'v2', 'ml'] },
      { key: 'express_pay', values: [false, true] },
      { key: 'region_cache', values: ['off', 'edge'] },
    ]);

    expect(report.totalCombinatorialSize).toBe(48);
    expect(report.pairwiseTestCount).toBeLessThan(15);
    expect(report.coveragePct).toBe(100);
    expect(report.reductionRatio).toBeGreaterThan(3);
  });

  it('excludes mutually-exclusive flag conflicts from generated test cases', () => {
    const conflicts = [
      {
        flagA: 'legacy_checkout',
        valueA: true,
        flagB: 'express_pay',
        valueB: true,
        reason: 'Express pay requires v2 checkout pipeline',
      },
    ];
    const report = generatePairwiseMatrix(
      [
        { key: 'legacy_checkout', values: [false, true] },
        { key: 'express_pay', values: [false, true] },
        { key: 'dark_mode', values: [false, true] },
      ],
      conflicts
    );

    for (const tc of report.testCases) {
      expect(isConflict(tc, conflicts)).toBeNull();
    }
  });
});
