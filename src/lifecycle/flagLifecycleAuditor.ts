export interface ManagedFlagMetadata {
  key: string;
  type: 'release' | 'experiment' | 'ops_killswitch';
  owner: string;
  createdAt: string; // ISO date
  ttlDays: number;
  rolloutPercentage: number;
  hasFallbackDefault: boolean;
  referencedInCode: boolean;
}

export interface FlagLifecycleFinding {
  flagKey: string;
  ruleId: 'STALE_FLAG_TTL' | 'MISSING_FALLBACK' | 'DEAD_UNREFERENCED_FLAG' | 'ORPHANED_OWNER';
  severity: 'HIGH' | 'MEDIUM';
  message: string;
}

export interface FlagLifecycleReport {
  totalFlags: number;
  healthyFlags: number;
  findings: FlagLifecycleFinding[];
  passed: boolean;
}

export function auditFlagLifecycle(
  flags: ManagedFlagMetadata[],
  nowIso: string
): FlagLifecycleReport {
  const nowMs = Date.parse(nowIso);
  const findings: FlagLifecycleFinding[] = [];
  const flaggedKeys = new Set<string>();

  for (const f of flags) {
    if (!f.hasFallbackDefault) {
      flaggedKeys.add(f.key);
      findings.push({
        flagKey: f.key,
        ruleId: 'MISSING_FALLBACK',
        severity: 'HIGH',
        message: `Flag "${f.key}" lacks a safe fallbackVariation for offline/SDK failure.`,
      });
    }

    if (!f.owner || f.owner.trim() === '') {
      flaggedKeys.add(f.key);
      findings.push({
        flagKey: f.key,
        ruleId: 'ORPHANED_OWNER',
        severity: 'MEDIUM',
        message: `Flag "${f.key}" has no assigned owner team.`,
      });
    }

    if (!f.referencedInCode) {
      flaggedKeys.add(f.key);
      findings.push({
        flagKey: f.key,
        ruleId: 'DEAD_UNREFERENCED_FLAG',
        severity: 'MEDIUM',
        message: `Flag "${f.key}" is no longer referenced in application code and should be retired.`,
      });
    }

    if (f.type !== 'ops_killswitch') {
      const ageDays = (nowMs - Date.parse(f.createdAt)) / (1000 * 60 * 60 * 24);
      if (ageDays > f.ttlDays) {
        flaggedKeys.add(f.key);
        findings.push({
          flagKey: f.key,
          ruleId: 'STALE_FLAG_TTL',
          severity: 'MEDIUM',
          message: `Flag "${f.key}" is ${Math.floor(ageDays)}d old (exceeds ${f.ttlDays}d TTL for ${f.type} flags).`,
        });
      }
    }
  }

  return {
    totalFlags: flags.length,
    healthyFlags: flags.length - flaggedKeys.size,
    findings,
    passed: findings.filter((x) => x.severity === 'HIGH').length === 0 && findings.length === 0,
  };
}
