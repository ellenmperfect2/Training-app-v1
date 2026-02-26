// Coros CSV parser.
// Format: [ActivityType][YYYYMMDD][HHMMSS].csv
// Timestamp is unique identifier for multiple same-day workouts.

// NOTE: This parser is no longer used — replaced by lib/fit-parser.ts
// Retained for reference only.
import activityTypesData from '../../data/coros-activity-types.json';

const KNOWN_COROS_TYPES = activityTypesData.activityTypes.map((t) => t.corosType);

// Coros CSV columns (0-indexed):
// Split, Time, Moving Time, GetDistance, Elevation Gain, Elev Loss,
// Avg Pace, Avg Moving Pace, Best Pace, Avg Run Cadence, Max Run Cadence,
// Avg Stride Length, Avg HR, Max HR, Avg Temperature, Calories
const COL = {
  SPLIT: 0,
  TIME: 1,
  MOVING_TIME: 2,
  DISTANCE: 3,
  ELEV_GAIN: 4,
  ELEV_LOSS: 5,
  AVG_PACE: 6,
  AVG_MOVING_PACE: 7,
  BEST_PACE: 8,
  AVG_RUN_CADENCE: 9,
  MAX_RUN_CADENCE: 10,
  AVG_STRIDE: 11,
  AVG_HR: 12,
  MAX_HR: 13,
  AVG_TEMP: 14,
  CALORIES: 15,
};

export interface ParseResult {
  success: true;
  session: Record<string, unknown>;
  corosType: string;
  requiresAnnotation: boolean;
  annotationFields: string[];
}

export interface ParseError {
  success: false;
  error: string;
}

export function parseCorosFilename(filename: string): {
  corosType: string | null;
  date: string | null;
  timestamp: string | null;
} {
  // Strip .csv
  const base = filename.replace(/\.csv$/i, '');

  // Try to match [ActivityType][YYYYMMDD][HHMMSS]
  const match = base.match(/^([A-Za-z]+)(\d{8})(\d{6})$/);
  if (!match) {
    return { corosType: null, date: null, timestamp: null };
  }

  const [, type, dateStr, timeStr] = match;
  const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  const timestamp = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;

  return { corosType: type, date, timestamp };
}

export function parseCorosCsv(filename: string, csvText: string): ParseResult | ParseError {
  const { corosType, date, timestamp } = parseCorosFilename(filename);

  if (!corosType || !date || !timestamp) {
    return {
      success: false,
      error: `Filename "${filename}" does not match Coros format: [ActivityType][YYYYMMDD][HHMMSS].csv`,
    };
  }

  if (!KNOWN_COROS_TYPES.includes(corosType)) {
    return {
      success: false,
      error: `Unknown Coros activity type: "${corosType}". Known types: ${KNOWN_COROS_TYPES.join(', ')}`,
    };
  }

  const lines = csvText.trim().split('\n').map((l) => l.trim());
  if (lines.length < 2) {
    return { success: false, error: 'CSV has no data rows.' };
  }

  // Find Summary row (always the last row)
  const summaryLine = lines[lines.length - 1];
  const summaryFields = parseCsvLine(summaryLine);

  if (!summaryFields[0]?.toLowerCase().includes('summary')) {
    return { success: false, error: 'Could not find Summary row in CSV.' };
  }

  // Parse summary values
  const durationMinutes = parseTimeToMinutes(summaryFields[COL.TIME]);
  const movingTimeMinutes = parseTimeToMinutes(summaryFields[COL.MOVING_TIME]);
  const distanceKm = parseFloat(summaryFields[COL.DISTANCE] ?? '0') || 0;
  const elevationGainM = parseFloat(summaryFields[COL.ELEV_GAIN] ?? '0') || 0;
  const elevationLossM = parseFloat(summaryFields[COL.ELEV_LOSS] ?? '0') || 0;
  const avgHR = parseIntOrNull(summaryFields[COL.AVG_HR]);
  const maxHR = parseIntOrNull(summaryFields[COL.MAX_HR]);
  const calories = parseIntOrNull(summaryFields[COL.CALORIES]);

  const activityDef = activityTypesData.activityTypes.find((t) => t.corosType === corosType);
  const annotationFields = activityDef?.annotationFields ?? ['notes'];

  const session: Record<string, unknown> = {
    id: `${date}-${corosType}-${timestamp}`,
    date,
    corosType,
    filename,
    durationMinutes,
    movingTimeMinutes,
    distanceKm,
    elevationGainM,
    elevationLossM,
    avgHR,
    maxHR,
    calories,
  };

  return {
    success: true,
    session,
    corosType,
    requiresAnnotation: annotationFields.length > 1, // notes-only = no required modal
    annotationFields,
  };
}

function parseCsvLine(line: string): string[] {
  // Simple CSV parser — handles quoted fields
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  // Format: HH:MM:SS or MM:SS
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  }
  return parseFloat(timeStr) || 0;
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value === '--' || value === '') return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

export function getAnnotationRequirements(corosType: string): {
  fields: string[];
  requiredFields: string[];
} {
  const def = activityTypesData.activityTypes.find((t) => t.corosType === corosType);
  if (!def) return { fields: ['notes'], requiredFields: [] };

  const packWeightTypes = ['Hike', 'MountainHike', 'BackcountrySkiing', 'Snowshoeing'];
  const requiredFields = packWeightTypes.includes(corosType) ? ['packWeight'] : [];

  return {
    fields: def.annotationFields,
    requiredFields,
  };
}
