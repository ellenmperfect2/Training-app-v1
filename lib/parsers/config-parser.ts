// Parses and validates a <training-config> XML block against
// training-config-schema.json field definitions.

import type { TrainingConfig, CardioWeeklyTarget, StrengthWeeklyTarget, ClimbingWeeklyTarget } from '../storage';

// ── Flat field schema ────────────────────────────────────────────────────────

const SCHEMA_FIELDS = {
  'generated-date': { type: 'date' },
  'expires-date': { type: 'date' },
  'fatigue-state': { type: 'enum', values: ['low', 'moderate', 'high', 'rest'] },
  'cardio-priority': { type: 'enum', values: ['maintain', 'build', 'peak', 'taper'] },
  'cardio-zone2-minimum-hours': { type: 'number', min: 0, max: 20 },
  'cardio-anaerobic-flag': { type: 'enum', values: ['none', 'develop', 'maintain', 'reduce'] },
  'strength-priority': { type: 'enum', values: ['maintain', 'build', 'peak', 'deload'] },
  'posterior-chain-emphasis': { type: 'enum', values: ['low', 'medium', 'high'] },
  'single-leg-emphasis': { type: 'enum', values: ['low', 'medium', 'high'] },
  'push-emphasis': { type: 'enum', values: ['low', 'medium', 'high'] },
  'pull-emphasis': { type: 'enum', values: ['low', 'medium', 'high'] },
  'core-emphasis': { type: 'enum', values: ['low', 'medium', 'high'] },
  'climbing-priority': { type: 'enum', values: ['maintain', 'build', 'peak', 'rest'] },
  'climbing-frequency-max': { type: 'number', min: 0, max: 7 },
  'conditioning-frequency': { type: 'number', min: 0, max: 7 },
  'loaded-carry-sessions': { type: 'number', min: 0, max: 7 },
  'loaded-carry-direction': { type: 'enum', values: ['increase', 'decrease', 'hold'] },
  'objective-proximity-flag': {
    type: 'enum',
    values: ['normal', 'approaching', 'taper', 'peak-week'],
  },
  'override-reason': { type: 'string' },
} as const;

type SchemaKey = keyof typeof SCHEMA_FIELDS;

// ── Sub-block schemas ────────────────────────────────────────────────────────

const CARDIO_TARGET_SCHEMA: Record<string, SubFieldSchema> = {
  'direction': { type: 'enum', values: ['increase', 'decrease', 'hold'] },
  'sessions': { type: 'number', min: 0, max: 14 },
  'primary-zone': { type: 'enum', values: ['z1-2', 'z3', 'z4-5'] },
  'session-duration-hours': { type: 'number', min: 0, max: 6 },
  'note': { type: 'string', maxLength: 120 },
};

const STRENGTH_TARGET_SCHEMA: Record<string, SubFieldSchema> = {
  'direction': { type: 'enum', values: ['increase', 'decrease', 'hold'] },
  'sessions': { type: 'number', min: 0, max: 7 },
  'primary-focus': {
    type: 'enum',
    values: ['posterior-chain', 'single-leg', 'push', 'pull', 'core', 'full-body'],
  },
  'rep-scheme': { type: 'enum', values: ['strength', 'hypertrophy', 'endurance'] },
  'note': { type: 'string', maxLength: 120 },
};

const CLIMBING_TARGET_SCHEMA: Record<string, SubFieldSchema> = {
  'direction': { type: 'enum', values: ['increase', 'decrease', 'hold'] },
  'sessions': { type: 'number', min: 0, max: 7 },
  'primary-focus': {
    type: 'enum',
    values: ['endurance', 'power-endurance', 'projecting', 'conditioning', 'rest'],
  },
  'note': { type: 'string', maxLength: 120 },
};

type SubFieldSchema =
  | { type: 'enum'; values: readonly string[] }
  | { type: 'number'; min: number; max: number }
  | { type: 'string'; maxLength?: number };

// ── Helpers ──────────────────────────────────────────────────────────────────

// Extract a named XML sub-block and return its inner content + remaining text.
function extractSubBlock(
  content: string,
  tagName: string
): { inner: string; remaining: string } | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
  const match = content.match(regex);
  if (!match) return null;
  return { inner: match[1], remaining: content.replace(match[0], '') };
}

// Parse key: value lines from a block of text.
function parseKVLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

// Validate a KV map against a sub-block schema. Pushes errors; returns typed result.
function validateSubBlock(
  parsed: Record<string, string>,
  schema: Record<string, SubFieldSchema>,
  blockName: string,
  errors: string[]
): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  for (const key of Object.keys(parsed)) {
    if (!(key in schema)) {
      errors.push(`Unknown field in <${blockName}>: "${key}".`);
    }
  }

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = parsed[field];
    if (value === undefined || value === '') {
      errors.push(`Missing required field: ${blockName}.${field}`);
      continue;
    }

    if (fieldSchema.type === 'enum') {
      const enumSchema = fieldSchema as { type: 'enum'; values: readonly string[] };
      if (!enumSchema.values.includes(value)) {
        errors.push(
          `Invalid value for ${blockName}.${field}: "${value}". Must be one of: ${enumSchema.values.join(', ')}`
        );
      }
      result[field] = value;
    } else if (fieldSchema.type === 'number') {
      const numSchema = fieldSchema as { type: 'number'; min: number; max: number };
      const n = parseFloat(value);
      if (isNaN(n)) {
        errors.push(`Invalid number for ${blockName}.${field}: "${value}"`);
      } else if (n < numSchema.min || n > numSchema.max) {
        errors.push(
          `Value out of range for ${blockName}.${field}: ${n}. Must be between ${numSchema.min} and ${numSchema.max}.`
        );
      }
      result[field] = n;
    } else if (fieldSchema.type === 'string') {
      const strSchema = fieldSchema as { type: 'string'; maxLength?: number };
      if (strSchema.maxLength && value.length > strSchema.maxLength) {
        errors.push(
          `${blockName}.${field} exceeds ${strSchema.maxLength} character limit (${value.length} chars).`
        );
      }
      result[field] = value;
    }
  }

  return result;
}

// ── Parse result type ────────────────────────────────────────────────────────

type ParseResult =
  | { valid: true; config: TrainingConfig }
  | { valid: false; errors: string[] };

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseTrainingConfigXml(input: string): ParseResult {
  const errors: string[] = [];

  const match = input.match(/<training-config>([\s\S]*?)<\/training-config>/);
  if (!match) {
    return { valid: false, errors: ['No <training-config> block found in input.'] };
  }

  let raw = match[1];

  // ── Extract sub-blocks before flat parsing ──────────────────────────────

  const cardioTargetResult = extractSubBlock(raw, 'cardio-weekly-target');
  if (cardioTargetResult) raw = cardioTargetResult.remaining;

  const strengthTargetResult = extractSubBlock(raw, 'strength-weekly-target');
  if (strengthTargetResult) raw = strengthTargetResult.remaining;

  const climbingTargetResult = extractSubBlock(raw, 'climbing-weekly-target');
  if (climbingTargetResult) raw = climbingTargetResult.remaining;

  // ── Validate sub-blocks ──────────────────────────────────────────────────

  let cardioTarget: CardioWeeklyTarget | undefined;
  let strengthTarget: StrengthWeeklyTarget | undefined;
  let climbingTarget: ClimbingWeeklyTarget | undefined;

  if (!cardioTargetResult) {
    errors.push('Missing required block: <cardio-weekly-target>');
  } else {
    const validated = validateSubBlock(
      parseKVLines(cardioTargetResult.inner),
      CARDIO_TARGET_SCHEMA,
      'cardio-weekly-target',
      errors
    );
    if (Object.keys(validated).length >= 5) {
      cardioTarget = validated as unknown as CardioWeeklyTarget;
    }
  }

  if (!strengthTargetResult) {
    errors.push('Missing required block: <strength-weekly-target>');
  } else {
    const validated = validateSubBlock(
      parseKVLines(strengthTargetResult.inner),
      STRENGTH_TARGET_SCHEMA,
      'strength-weekly-target',
      errors
    );
    if (Object.keys(validated).length >= 5) {
      strengthTarget = validated as unknown as StrengthWeeklyTarget;
    }
  }

  if (!climbingTargetResult) {
    errors.push('Missing required block: <climbing-weekly-target>');
  } else {
    const validated = validateSubBlock(
      parseKVLines(climbingTargetResult.inner),
      CLIMBING_TARGET_SCHEMA,
      'climbing-weekly-target',
      errors
    );
    if (Object.keys(validated).length >= 4) {
      climbingTarget = validated as unknown as ClimbingWeeklyTarget;
    }
  }

  // ── Parse flat fields ────────────────────────────────────────────────────

  const flatParsed = parseKVLines(raw);

  // Reject unknown flat fields
  for (const key of Object.keys(flatParsed)) {
    if (!(key in SCHEMA_FIELDS)) {
      errors.push(`Unknown field: "${key}". Parser rejects unknown fields.`);
    }
  }

  // Validate all required flat fields
  const result: Partial<TrainingConfig> = {};

  for (const [field, schema] of Object.entries(SCHEMA_FIELDS) as [SchemaKey, (typeof SCHEMA_FIELDS)[SchemaKey]][]) {
    const value = flatParsed[field];
    if (value === undefined || value === '') {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (schema.type === 'date') {
      if (value !== 'default' && value !== 'never' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push(`Invalid date format for ${field}: "${value}". Expected YYYY-MM-DD.`);
      }
      (result as Record<string, string>)[field] = value;
    } else if (schema.type === 'enum') {
      const enumSchema = schema as { type: 'enum'; values: readonly string[] };
      if (!enumSchema.values.includes(value)) {
        errors.push(
          `Invalid value for ${field}: "${value}". Must be one of: ${enumSchema.values.join(', ')}`
        );
      }
      (result as Record<string, string>)[field] = value;
    } else if (schema.type === 'number') {
      const numSchema = schema as { type: 'number'; min: number; max: number };
      const n = parseFloat(value);
      if (isNaN(n)) {
        errors.push(`Invalid number for ${field}: "${value}"`);
      } else if (n < numSchema.min || n > numSchema.max) {
        errors.push(
          `Value out of range for ${field}: ${n}. Must be between ${numSchema.min} and ${numSchema.max}.`
        );
      }
      (result as Record<string, number>)[field] = n;
    } else if (schema.type === 'string') {
      if (!value) {
        errors.push(`${field} must not be empty.`);
      }
      (result as Record<string, string>)[field] = value;
    }
  }

  // Attach sub-block results
  if (cardioTarget) result['cardio-weekly-target'] = cardioTarget;
  if (strengthTarget) result['strength-weekly-target'] = strengthTarget;
  if (climbingTarget) result['climbing-weekly-target'] = climbingTarget;

  // ── Cross-field rules ────────────────────────────────────────────────────

  const climbingPriority = flatParsed['climbing-priority'];
  const climbingFreqMax = parseFloat(flatParsed['climbing-frequency-max'] ?? '0');
  if (climbingPriority === 'rest' && climbingFreqMax > 0) {
    errors.push(
      'climbing-priority is "rest" but climbing-frequency-max is > 0. Set climbing-frequency-max to 0.'
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, config: result as TrainingConfig };
}

export function isConfigExpired(config: TrainingConfig): boolean {
  if (config['expires-date'] === 'never') return false;
  const today = new Date().toISOString().slice(0, 10);
  return config['expires-date'] < today;
}

export function isConfigExpiringSoon(config: TrainingConfig, withinDays = 2): boolean {
  if (config['expires-date'] === 'never') return false;
  const target = new Date();
  target.setDate(target.getDate() + withinDays);
  const targetStr = target.toISOString().slice(0, 10);
  return config['expires-date'] <= targetStr;
}

export function diffConfigs(
  prev: TrainingConfig,
  next: TrainingConfig
): Array<{ field: string; from: string | number; to: string | number }> {
  const diffs: Array<{ field: string; from: string | number; to: string | number }> = [];
  const skipFields = [
    'generated-date',
    'expires-date',
    'override-reason',
    'cardio-weekly-target',
    'strength-weekly-target',
    'climbing-weekly-target',
  ];

  for (const key of Object.keys(SCHEMA_FIELDS) as SchemaKey[]) {
    if (skipFields.includes(key)) continue;
    const prevVal = (prev as unknown as Record<string, string | number>)[key];
    const nextVal = (next as unknown as Record<string, string | number>)[key];
    if (prevVal !== nextVal) {
      diffs.push({ field: key, from: prevVal, to: nextVal });
    }
  }
  return diffs;
}
