// Parses and validates a <training-config> XML block against
// training-config-schema.json field definitions.

import type { TrainingConfig } from '../storage';

const SCHEMA_FIELDS = {
  'generated-date': { type: 'date' },
  'expires-date': { type: 'date' },
  'fatigue-state': { type: 'enum', values: ['low', 'moderate', 'high', 'rest'] },
  'cardio-priority': { type: 'enum', values: ['maintain', 'build', 'peak', 'taper'] },
  'cardio-zone2-minimum-hours': { type: 'number', min: 0, max: 20 },
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
  'objective-proximity-flag': {
    type: 'enum',
    values: ['normal', 'approaching', 'taper', 'peak-week'],
  },
  'override-reason': { type: 'string' },
} as const;

type SchemaKey = keyof typeof SCHEMA_FIELDS;

type ParseResult =
  | { valid: true; config: TrainingConfig }
  | { valid: false; errors: string[] };

export function parseTrainingConfigXml(input: string): ParseResult {
  const errors: string[] = [];

  const match = input.match(/<training-config>([\s\S]*?)<\/training-config>/);
  if (!match) {
    return { valid: false, errors: ['No <training-config> block found in input.'] };
  }

  const raw = match[1];
  const parsed: Record<string, string> = {};

  // Parse key: value lines
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    parsed[key] = value;
  }

  // Reject unknown fields
  for (const key of Object.keys(parsed)) {
    if (!(key in SCHEMA_FIELDS)) {
      errors.push(`Unknown field: "${key}". Parser rejects unknown fields.`);
    }
  }

  // Validate all required fields
  const result: Partial<TrainingConfig> = {};

  for (const [field, schema] of Object.entries(SCHEMA_FIELDS) as [SchemaKey, (typeof SCHEMA_FIELDS)[SchemaKey]][]) {
    const value = parsed[field];
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

  // Cross-field rules
  const climbingPriority = parsed['climbing-priority'];
  const climbingFreqMax = parseFloat(parsed['climbing-frequency-max'] ?? '0');
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
  const skipFields = ['generated-date', 'expires-date', 'override-reason'];

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
