import { describe, it, expect } from 'vitest';
import { analyzeCanaryRelease } from '../src/canary/canaryAnalyzer.js';

describe('Day 4: Canary Analysis & Statistical SLO Diffing', () => {
  it('promotes canary when error rate and p95 latency stay within SLO', () => {
    const decision = analyzeCanaryRelease(
      { requests: 200, errors: 1, latenciesMs: Array(200).fill(50) },
      { requests: 100, errors: 0, latenciesMs: Array(100).fill(52) }
    );
    expect(decision.verdict).toBe('PROMOTE');
  });

  it('holds canary when sample size is below minimum threshold', () => {
    const decision = analyzeCanaryRelease(
      { requests: 200, errors: 1, latenciesMs: Array(200).fill(50) },
      { requests: 15, errors: 0, latenciesMs: Array(15).fill(50) }
    );
    expect(decision.verdict).toBe('HOLD');
  });

  it('triggers ROLLBACK when canary error rate or p95 latency breaches SLO', () => {
    const decision = analyzeCanaryRelease(
      { requests: 200, errors: 1, latenciesMs: Array(200).fill(50) },
      { requests: 100, errors: 8, latenciesMs: Array(100).fill(120) }
    );
    expect(decision.verdict).toBe('ROLLBACK');
    expect(decision.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
