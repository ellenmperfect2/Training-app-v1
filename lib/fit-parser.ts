// FIT file parser.
// Runs entirely in the browser — no server calls.
// Returns a partial CardioSession ready for annotation and storage.

import FitParser from 'fit-file-parser';
import { getZoneThresholds, getZoneForHR } from './zones';
import type { CardioSession, ZoneDistribution, ZoneThresholds } from './storage';

// ── Activity type mapping ──────────────────────────────────────────────────

function mapActivityType(sport: string, subSport?: string): string {
  const s = (sport ?? '').toLowerCase();
  const ss = (subSport ?? '').toLowerCase();

  if (s === 'hiking' || s === 'mountaineering') {
    if (ss === 'mountain') return 'MountainHike';
    return 'Hike';
  }
  if (s === 'running') {
    if (ss === 'treadmill' || ss === 'indoor_running') return 'IndoorRun';
    return 'OutdoorRun';
  }
  if (s === 'cycling') {
    if (ss === 'spin' || ss === 'indoor_cycling') return 'IndoorCycling';
    return 'OutdoorCycling';
  }
  if (s === 'cross_country_skiing' || s === 'alpine_skiing') return 'BackcountrySkiing';
  if (s === 'snowboarding') return 'Skiing';
  if (s === 'snowshoeing') return 'Snowshoeing';
  if (s === 'walking') return 'Walk';
  if (s === 'swimming') return 'Swimming';
  return 'GeneralCardio';
}

// ── Zone distribution calculation ─────────────────────────────────────────

function calculateZoneDistribution(
  records: Array<{ timestamp?: string; heart_rate?: number }>,
  zones: ZoneThresholds
): ZoneDistribution | null {
  const hrRecords = records.filter((r) => r.heart_rate != null && r.timestamp != null);
  if (hrRecords.length < 2) return null;

  const zoneSecs: Record<string, number> = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

  for (let i = 0; i < hrRecords.length - 1; i++) {
    const curr = hrRecords[i];
    const next = hrRecords[i + 1];
    const tCurr = new Date(curr.timestamp!).getTime();
    const tNext = new Date(next.timestamp!).getTime();
    const dt = Math.min((tNext - tCurr) / 1000, 10); // cap at 10s to handle pauses
    const zone = getZoneForHR(curr.heart_rate!, zones);
    zoneSecs[`z${zone}`] += dt;
  }

  // Last record = 1 second
  const last = hrRecords[hrRecords.length - 1];
  zoneSecs[`z${getZoneForHR(last.heart_rate!, zones)}`] += 1;

  return {
    z1: Math.round(zoneSecs.z1 / 6) / 10,
    z2: Math.round(zoneSecs.z2 / 6) / 10,
    z3: Math.round(zoneSecs.z3 / 6) / 10,
    z4: Math.round(zoneSecs.z4 / 6) / 10,
    z5: Math.round(zoneSecs.z5 / 6) / 10,
  };
}

// ── Training load calculation ──────────────────────────────────────────────

function calculateTrainingLoad(
  zd: ZoneDistribution | null
): CardioSession['trainingLoad'] {
  if (!zd) return null;

  const weights = { z1: 0.5, z2: 1.0, z3: 1.5, z4: 2.5, z5: 3.5 };
  const weightedSecs =
    zd.z1 * 60 * weights.z1 +
    zd.z2 * 60 * weights.z2 +
    zd.z3 * 60 * weights.z3 +
    zd.z4 * 60 * weights.z4 +
    zd.z5 * 60 * weights.z5;

  const score = Math.min(100, Math.round(weightedSecs / 60));
  const classification: 'low' | 'moderate' | 'high' =
    score < 40 ? 'low' : score <= 70 ? 'moderate' : 'high';

  return { score, classification };
}

// ── Annotation field rules ─────────────────────────────────────────────────

function getAnnotationFields(activityType: string): string[] {
  const fields: string[] = [];
  const packTypes = ['Hike', 'MountainHike', 'BackcountrySkiing', 'Snowshoeing'];
  const terrainRunTypes = ['OutdoorRun'];
  const weightsTypes = ['IndoorRun'];

  if (packTypes.includes(activityType)) fields.push('packWeight', 'terrain');
  if (terrainRunTypes.includes(activityType)) fields.push('terrain');
  if (weightsTypes.includes(activityType)) fields.push('weightsUsed');
  fields.push('perceivedEffort', 'notes');
  return fields;
}

// ── Public parse result types ──────────────────────────────────────────────

export interface FitParseResult {
  success: true;
  session: Omit<CardioSession, 'weightsUsed' | 'packWeight' | 'terrain' | 'perceivedEffort' | 'notes'>;
  activityType: string;
  noHrData: boolean;
  derivedElevation: boolean;
  annotationFields: string[];
}

export interface FitParseError {
  success: false;
  error: string;
}

// ── Main parse function ────────────────────────────────────────────────────

export async function parseFitFile(
  buffer: ArrayBuffer
): Promise<FitParseResult | FitParseError> {
  return new Promise((resolve) => {
    const parser = new FitParser({
      force: true,
      lengthUnit: 'm',
      speedUnit: 'km/h',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    parser.parse(buffer, (error, data) => {
      if (error || !data) {
        resolve({ success: false, error: error ?? 'Could not parse FIT file.' });
        return;
      }

      try {
        const sessions = data.sessions ?? [];
        const sessionData = sessions[0];
        if (!sessionData) {
          resolve({ success: false, error: 'No session data found in FIT file.' });
          return;
        }

        const durationSec = Math.round(
          Number(sessionData.total_timer_time ?? sessionData.total_elapsed_time ?? 0)
        );
        const distanceM = Math.round(Number(sessionData.total_distance ?? 0));
        let elevGainFt = Math.round(Number(sessionData.total_ascent ?? 0) * 3.281);
        const avgHR = sessionData.avg_heart_rate != null ? Number(sessionData.avg_heart_rate) : null;
        const maxHR = sessionData.max_heart_rate != null ? Number(sessionData.max_heart_rate) : null;
        const sport = String(sessionData.sport ?? 'generic');
        const subSport = String(sessionData.sub_sport ?? '');
        const startTime = String(sessionData.start_time ?? new Date().toISOString());
        const date = new Date(startTime).toISOString().slice(0, 10);

        const activityType = mapActivityType(sport, subSport);

        // Record stream
        const records = (data.records ?? []) as Array<{
          timestamp?: string;
          heart_rate?: number;
          altitude?: number;
        }>;

        // Derive elevation from record stream if session value is 0
        let derivedElevation = false;
        if (elevGainFt === 0 && records.length > 1) {
          let gain = 0;
          for (let i = 1; i < records.length; i++) {
            const prev = records[i - 1].altitude;
            const curr = records[i].altitude;
            if (prev != null && curr != null && curr > prev) gain += curr - prev;
          }
          if (gain > 0) {
            elevGainFt = Math.round(gain * 3.281);
            derivedElevation = true;
          }
        }

        const zones = getZoneThresholds();
        const noHrData = records.filter((r) => r.heart_rate != null).length < 2;
        const zoneDistribution = calculateZoneDistribution(records, zones);
        const trainingLoad = calculateTrainingLoad(zoneDistribution);

        const id = `${date}-${activityType}-${Date.now()}`;

        resolve({
          success: true,
          session: {
            id,
            date,
            startTime,
            activityType,
            source: 'fit',
            duration: durationSec,
            distance: distanceM,
            elevationGain: elevGainFt,
            avgHR,
            maxHR,
            zoneDistribution,
            trainingLoad,
          },
          activityType,
          noHrData,
          derivedElevation,
          annotationFields: getAnnotationFields(activityType),
        });
      } catch (e) {
        resolve({ success: false, error: `Parse error: ${String(e)}` });
      }
    });
  });
}
