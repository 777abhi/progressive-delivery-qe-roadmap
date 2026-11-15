import { generatePairwiseMatrix, type FlagSpace, type FlagConflictRule } from '../combinatorial/pairwiseMatrix.js';
import { compareShadowTraffic, type ShadowSample } from '../shadow/shadowDiffEngine.js';
import { analyzeCanaryRelease, type CanaryCohortMetrics, type CanarySloThresholds } from '../canary/canaryAnalyzer.js';
import { auditFlagLifecycle, type ManagedFlagMetadata } from '../lifecycle/flagLifecycleAuditor.js';

export interface ProgressiveGateInput {
  flagSpaces: FlagSpace[];
  flagConflicts?: FlagConflictRule[];
  shadowSamples: ShadowSample[];
  baselineCanary: CanaryCohortMetrics;
  canaryMetrics: CanaryCohortMetrics;
  canaryThresholds?: CanarySloThresholds;
  managedFlags: ManagedFlagMetadata[];
  nowIso: string;
}

export interface ProgressiveGateReport {
  verdict: 'PASS' | 'FAIL';
  pairwiseTestCount: number;
  shadowParityRatePct: number;
  canaryVerdict: 'PROMOTE' | 'HOLD' | 'ROLLBACK';
  lifecycleFindingsCount: number;
  blockingReasons: string[];
}

export function evaluateProgressiveReleaseGate(
  input: ProgressiveGateInput
): ProgressiveGateReport {
  const pairwise = generatePairwiseMatrix(input.flagSpaces, input.flagConflicts ?? []);
  const shadow = compareShadowTraffic(input.shadowSamples);
  const canary = analyzeCanaryRelease(
    input.baselineCanary,
    input.canaryMetrics,
    input.canaryThresholds
  );
  const lifecycle = auditFlagLifecycle(input.managedFlags, input.nowIso);

  const blockingReasons: string[] = [];

  if (pairwise.coveragePct < 100) {
    blockingReasons.push(`Pairwise flag coverage ${pairwise.coveragePct}% < 100%`);
  }
  if (!shadow.passed) {
    blockingReasons.push(
      `Shadow traffic parity failed (${shadow.parityRatePct}%, p95 delta +${shadow.p95DeltaMs}ms)`
    );
  }
  if (canary.verdict !== 'PROMOTE') {
    blockingReasons.push(`Canary verdict is ${canary.verdict}: ${canary.reasons.join('; ')}`);
  }
  if (!lifecycle.passed) {
    blockingReasons.push(
      `Flag lifecycle audit reported ${lifecycle.findings.length} finding(s)`
    );
  }

  return {
    verdict: blockingReasons.length === 0 ? 'PASS' : 'FAIL',
    pairwiseTestCount: pairwise.pairwiseTestCount,
    shadowParityRatePct: shadow.parityRatePct,
    canaryVerdict: canary.verdict,
    lifecycleFindingsCount: lifecycle.findings.length,
    blockingReasons,
  };
}
