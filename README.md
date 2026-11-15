# Progressive Delivery & Shift-Right QE Roadmap (7-Day Reference Lab)

Standalone Node.js 22 LTS + TypeScript + Vitest reference repository for the **Shift-Right QE: Feature Flags, Canary Releases & Progressive Delivery** 7-day track.

## Curriculum

| Day | Module | Focus |
|-----|--------|-------|
| Day 1 | `src/flags/flagEvaluator.ts` | Deterministic OpenFeature-style flag evaluation, sticky bucketing & targeting rules |
| Day 2 | `src/combinatorial/pairwiseMatrix.ts` | Pairwise (2-wise) combinatorial flag-interaction matrix & conflict detection |
| Day 3 | `src/shadow/shadowDiffEngine.ts` | Dark launch & shadow traffic diffing (status, schema drift, value, p95 delta) |
| Day 4 | `src/canary/canaryAnalyzer.ts` | Canary release statistical SLO diffing (`PROMOTE` / `HOLD` / `ROLLBACK`) |
| Day 5 | `src/killswitch/killSwitchController.ts` | Automated kill-switch & blast-radius containment with consecutive-breach hysteresis |
| Day 6 | `src/lifecycle/flagLifecycleAuditor.ts` | Feature flag lifecycle, TTL staleness & fallback-default auditing |
| Day 7 | `src/releaseGate/progressiveGate.ts` | End-to-end Progressive Delivery CI/CD release gate & CLI |

## Quickstart

```bash
npm ci
npm run build
npm test
npm run gate
```
