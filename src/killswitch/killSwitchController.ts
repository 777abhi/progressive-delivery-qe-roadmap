export interface KillSwitchPolicy {
  flagKey: string;
  maxConsecutiveBreaches: number;
  maxErrorRatePct: number;
  maxP99Ms: number;
}

export interface TelemetryWindow {
  timestamp: string;
  errorRatePct: number;
  p99Ms: number;
}

export interface KillSwitchAuditEvent {
  timestamp: string;
  action: 'OK' | 'BREACH_WARNING' | 'KILL_SWITCH_TRIGGERED';
  flagKey: string;
  reason: string;
}

export interface KillSwitchState {
  flagEnabled: boolean;
  consecutiveBreaches: number;
  triggeredAt?: string;
  auditLog: KillSwitchAuditEvent[];
}

export class KillSwitchController {
  private state: KillSwitchState;

  constructor(private readonly policy: KillSwitchPolicy, initiallyEnabled = true) {
    this.state = {
      flagEnabled: initiallyEnabled,
      consecutiveBreaches: 0,
      auditLog: [],
    };
  }

  public ingestWindow(window: TelemetryWindow): KillSwitchState {
    if (!this.state.flagEnabled) {
      return this.getState();
    }

    const breached =
      window.errorRatePct > this.policy.maxErrorRatePct || window.p99Ms > this.policy.maxP99Ms;

    if (!breached) {
      this.state.consecutiveBreaches = 0;
      this.state.auditLog.push({
        timestamp: window.timestamp,
        action: 'OK',
        flagKey: this.policy.flagKey,
        reason: `Healthy window (err=${window.errorRatePct}%, p99=${window.p99Ms}ms)`,
      });
      return this.getState();
    }

    this.state.consecutiveBreaches += 1;
    const reason = `SLO breach (err=${window.errorRatePct}% vs max ${this.policy.maxErrorRatePct}%, p99=${window.p99Ms}ms vs max ${this.policy.maxP99Ms}ms)`;

    if (this.state.consecutiveBreaches >= this.policy.maxConsecutiveBreaches) {
      this.state.flagEnabled = false;
      this.state.triggeredAt = window.timestamp;
      this.state.auditLog.push({
        timestamp: window.timestamp,
        action: 'KILL_SWITCH_TRIGGERED',
        flagKey: this.policy.flagKey,
        reason: `${reason} — auto-disabled after ${this.state.consecutiveBreaches} consecutive breaches`,
      });
    } else {
      this.state.auditLog.push({
        timestamp: window.timestamp,
        action: 'BREACH_WARNING',
        flagKey: this.policy.flagKey,
        reason: `${reason} (${this.state.consecutiveBreaches}/${this.policy.maxConsecutiveBreaches})`,
      });
    }

    return this.getState();
  }

  public getState(): KillSwitchState {
    return {
      ...this.state,
      auditLog: [...this.state.auditLog],
    };
  }
}
