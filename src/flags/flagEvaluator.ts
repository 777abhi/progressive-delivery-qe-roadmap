import { createHash } from 'node:crypto';

export type FlagValue = boolean | string | number;

export interface TargetingCondition {
  attribute: string;
  operator: 'eq' | 'in' | 'semverGte';
  value: string | string[];
}

export interface TargetingRule {
  id: string;
  conditions: TargetingCondition[];
  variation: FlagValue;
  rolloutPercentage?: number; // 0-100, defaults to 100 when rule matches
}

export interface FeatureFlagDefinition {
  key: string;
  enabled: boolean;
  defaultVariation: FlagValue;
  fallbackVariation: FlagValue;
  rolloutPercentage: number; // 0-100 global percentage when enabled & no rule matches
  rules: TargetingRule[];
}

export interface EvaluationContext {
  targetingKey: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface FlagEvaluationResult {
  flagKey: string;
  value: FlagValue;
  reason: 'DISABLED' | 'TARGETING_MATCH' | 'SPLIT' | 'DEFAULT' | 'ERROR_FALLBACK';
  ruleId?: string;
  bucket: number;
}

export function computeStickyBucket(flagKey: string, targetingKey: string): number {
  const hash = createHash('sha256').update(`${flagKey}:${targetingKey}`).digest();
  const num = hash.readUInt32BE(0);
  return num % 100;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function matchesCondition(
  cond: TargetingCondition,
  attrs: Record<string, string | number | boolean>
): boolean {
  const raw = attrs[cond.attribute];
  if (raw === undefined || raw === null) return false;
  const actual = String(raw);

  if (cond.operator === 'eq') {
    return actual === String(cond.value);
  }
  if (cond.operator === 'in') {
    return Array.isArray(cond.value) && cond.value.includes(actual);
  }
  if (cond.operator === 'semverGte') {
    return compareSemver(actual, String(cond.value)) >= 0;
  }
  return false;
}

export function evaluateFlag(
  flag: FeatureFlagDefinition,
  context: EvaluationContext
): FlagEvaluationResult {
  if (!context.targetingKey) {
    return {
      flagKey: flag.key,
      value: flag.fallbackVariation,
      reason: 'ERROR_FALLBACK',
      bucket: -1,
    };
  }

  const bucket = computeStickyBucket(flag.key, context.targetingKey);

  if (!flag.enabled) {
    return {
      flagKey: flag.key,
      value: flag.fallbackVariation,
      reason: 'DISABLED',
      bucket,
    };
  }

  const attrs = context.attributes ?? {};
  for (const rule of flag.rules) {
    const allMatch = rule.conditions.every((c) => matchesCondition(c, attrs));
    if (allMatch) {
      const pct = rule.rolloutPercentage ?? 100;
      if (bucket < pct) {
        return {
          flagKey: flag.key,
          value: rule.variation,
          reason: 'TARGETING_MATCH',
          ruleId: rule.id,
          bucket,
        };
      }
    }
  }

  if (bucket < flag.rolloutPercentage) {
    return {
      flagKey: flag.key,
      value: flag.defaultVariation,
      reason: 'SPLIT',
      bucket,
    };
  }

  return {
    flagKey: flag.key,
    value: flag.fallbackVariation,
    reason: 'DEFAULT',
    bucket,
  };
}
