import { describe, it, expect } from 'vitest';
import { KillSwitchController } from '../src/killswitch/killSwitchController.js';

describe('Day 5: Automated Kill-Switch & Blast-Radius Containment', () => {
  it('triggers kill-switch after consecutive SLO breaches and resets on recovery', () => {
    const ctrl = new KillSwitchController({
      flagKey: 'dynamic_pricing_v2',
      maxConsecutiveBreaches: 2,
      maxErrorRatePct: 1.0,
      maxP99Ms: 300,
    });

    // Single breach -> warning only
    let state = ctrl.ingestWindow({ timestamp: 't1', errorRatePct: 2.5, p99Ms: 250 });
    expect(state.flagEnabled).toBe(true);
    expect(state.consecutiveBreaches).toBe(1);

    // Recovery -> resets counter
    state = ctrl.ingestWindow({ timestamp: 't2', errorRatePct: 0.2, p99Ms: 180 });
    expect(state.flagEnabled).toBe(true);
    expect(state.consecutiveBreaches).toBe(0);

    // Two consecutive breaches -> kill switch fires
    ctrl.ingestWindow({ timestamp: 't3', errorRatePct: 3.1, p99Ms: 420 });
    state = ctrl.ingestWindow({ timestamp: 't4', errorRatePct: 4.0, p99Ms: 500 });
    expect(state.flagEnabled).toBe(false);
    expect(state.triggeredAt).toBe('t4');
    expect(state.auditLog.at(-1)?.action).toBe('KILL_SWITCH_TRIGGERED');
  });
});
