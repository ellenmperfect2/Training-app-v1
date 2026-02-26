// Cross-domain stimulus accumulation engine.
// Reads workout log entries for a given date range and returns
// aggregate stimulus maps and level classifications.

import type {
  StimulusMap,
  WorkoutLog,
  CardioSession,
  StrengthSession,
  ClimbingSession,
  ConditioningSession,
} from '../storage';
import exerciseLibrary from '../../data/exercise-library.json';
import stimulusMappingData from '../../data/stimulus-mapping.json';

export type StimulusLevel = 'low' | 'medium' | 'high';

export interface StimulusContext {
  baseline: string;
  contributors: string[];
  implication: string;
}

export interface StimulusResult {
  raw: StimulusMap;
  levels: Record<keyof StimulusMap, StimulusLevel>;
  flags: string[];
  contexts: Record<keyof StimulusMap, StimulusContext>;
}

export interface CardioSessionSummary {
  level: StimulusLevel;
  dominantGroup: string | null;
  factors: string[];
}

const EMPTY_MAP = (): StimulusMap => ({
  posteriorChain: 0,
  quadDominant: 0,
  push: 0,
  pull: 0,
  core: 0,
  loadedCarry: 0,
  forearmsGrip: 0,
});

function addMaps(a: StimulusMap, b: StimulusMap, weight = 1): StimulusMap {
  return {
    posteriorChain: a.posteriorChain + b.posteriorChain * weight,
    quadDominant: a.quadDominant + b.quadDominant * weight,
    push: a.push + b.push * weight,
    pull: a.pull + b.pull * weight,
    core: a.core + b.core * weight,
    loadedCarry: a.loadedCarry + b.loadedCarry * weight,
    forearmsGrip: a.forearmsGrip + b.forearmsGrip * weight,
  };
}

function toLevel(value: number): StimulusLevel {
  if (value <= 1.5) return 'low';
  if (value <= 3.5) return 'medium';
  return 'high';
}

function getCardioStimulus(session: CardioSession): StimulusMap {
  const { activityType, packWeight, weightsUsed, elevationGain, duration } = session;
  const elevGainFt = elevationGain ?? 0;
  const hours = duration / 3600;
  const elevPerHour = hours > 0 ? elevGainFt / hours : 0;

  const mappings = stimulusMappingData.cardioStimulusMappings;

  let match = mappings.find((m) => {
    const types = Array.isArray(m.corosType) ? m.corosType : [m.corosType];
    if (!types.includes(activityType)) return false;
    if (!m.condition) return true;

    // Evaluate condition string
    if (m.condition.includes('elevationGainPerHour < 500')) return elevPerHour < 500;
    if (m.condition.includes('elevationGainPerHour >= 500')) return elevPerHour >= 500;
    if (m.condition.includes("packWeight === 'none'")) return packWeight === 'none';
    if (m.condition.includes("packWeight !== 'none'")) return packWeight !== 'none' && packWeight !== undefined;
    if (m.condition.includes('weightsUsed === false')) return weightsUsed === false;
    if (m.condition.includes('weightsUsed === true')) return weightsUsed === true;
    return true;
  });

  // Fallback: match activityType without condition
  if (!match) {
    match = mappings.find((m) => {
      const types = Array.isArray(m.corosType) ? m.corosType : [m.corosType];
      return types.includes(activityType);
    });
  }

  if (!match) return EMPTY_MAP();

  // Scale by session duration (hours)
  const base = match.stimulusWeights as StimulusMap;
  return addMaps(EMPTY_MAP(), base, hours);
}

function getStrengthStimulus(session: StrengthSession): StimulusMap {
  const result = EMPTY_MAP();
  const exercises = exerciseLibrary.exercises;

  for (const ex of session.exercises) {
    const def = exercises.find((e) => e.id === ex.exerciseId);
    if (!def) continue;
    const setCount = ex.sets.length;
    const weights = def.stimulusWeights as StimulusMap;
    // Each set contributes scaled stimulus
    result.posteriorChain += weights.posteriorChain * setCount;
    result.quadDominant += weights.quadDominant * setCount;
    result.push += weights.push * setCount;
    result.pull += weights.pull * setCount;
    result.core += weights.core * setCount;
    result.loadedCarry += weights.loadedCarry * setCount;
    result.forearmsGrip += weights.forearmsGrip * setCount;
  }

  return result;
}

function getClimbingStimulus(session: ClimbingSession): StimulusMap {
  const base = stimulusMappingData.climbingStimulus.allTypes.stimulusWeights as StimulusMap;
  const sessionCount = session.climbs.length;
  // Each climb route = 1 unit of stimulus
  return addMaps(EMPTY_MAP(), base, sessionCount);
}

function getConditioningStimulus(session: ConditioningSession): StimulusMap {
  const result = EMPTY_MAP();
  const { pullup, deadhang, hangboard } = stimulusMappingData.conditioningStimulus;

  for (const set of session.pullupSets) {
    const w = pullup.stimulusWeights as StimulusMap;
    result.pull += w.pull;
    result.core += w.core;
    result.forearmsGrip += w.forearmsGrip;
  }
  for (const set of session.deadhangSets) {
    const w = deadhang.stimulusWeights as StimulusMap;
    result.pull += w.pull;
    result.forearmsGrip += w.forearmsGrip;
  }
  for (const set of session.hangboardSets) {
    const w = hangboard.stimulusWeights as StimulusMap;
    result.pull += w.pull * set.rounds;
    result.forearmsGrip += w.forearmsGrip * set.rounds;
  }

  return result;
}

// ── Context builders ───────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GROUP_LABELS: Record<string, string> = {
  posteriorChain: 'posterior chain',
  quadDominant: 'quads',
  push: 'push muscles',
  pull: 'pull muscles',
  core: 'core',
  loadedCarry: 'loaded carry',
  forearmsGrip: 'forearms and grip',
};

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

function buildImplication(key: keyof StimulusMap, level: StimulusLevel): string {
  const label = GROUP_LABELS[key] ?? String(key);
  if (level === 'high') {
    const hints: Partial<Record<keyof StimulusMap, string>> = {
      forearmsGrip: 'Hold off on climbing and pullups until load drops.',
      posteriorChain: 'Avoid heavy deadlifts and loaded hinge movements.',
      pull: 'Monitor elbow and shoulder — back off pull volume.',
    };
    const hint = hints[key] ?? 'Allow recovery before adding more volume.';
    return `High ${label} load. ${hint}`;
  }
  if (level === 'medium') {
    return `Moderate ${label} stimulus — maintain current volume.`;
  }
  return `Low ${label} stimulus — room to add volume if feeling fresh.`;
}

interface Contributor {
  label: string;
  map: StimulusMap;
}

function buildStimulusContext(
  key: keyof StimulusMap,
  level: StimulusLevel,
  contributors: Contributor[]
): StimulusContext {
  const relevant = contributors
    .filter((c) => (c.map as unknown as Record<string, number>)[key] > 0.05)
    .map((c) => {
      const v = Math.round((c.map as unknown as Record<string, number>)[key] * 10) / 10;
      return `${c.label}: +${v}`;
    });

  return {
    baseline: 'Score >3.5 = high · 1.5–3.5 = medium · <1.5 = low (current week)',
    contributors: relevant.length > 0 ? relevant : ['No sessions this week'],
    implication: buildImplication(key, level),
  };
}

// ── Main weekly computation ────────────────────────────────────────────────

export function computeWeeklyStimulus(
  log: WorkoutLog,
  startDate: string,
  endDate: string
): StimulusResult {
  const total = EMPTY_MAP();
  const contributors: Contributor[] = [];

  for (const s of log.cardio) {
    if (s.date >= startDate && s.date <= endDate) {
      const contrib = getCardioStimulus(s);
      const hours = Math.round(s.duration / 3600 * 10) / 10;
      contributors.push({ label: `${s.activityType} (${dayLabel(s.date)}, ${hours}h)`, map: contrib });
      Object.keys(total).forEach((k) => {
        (total as unknown as Record<string, number>)[k] += (contrib as unknown as Record<string, number>)[k];
      });
    }
  }

  for (const s of log.strength) {
    if (s.date >= startDate && s.date <= endDate) {
      const contrib = getStrengthStimulus(s);
      const exercises = exerciseLibrary.exercises;
      const names = s.exercises
        .slice(0, 2)
        .map((ex) => exercises.find((e) => e.id === ex.exerciseId)?.name ?? ex.exerciseId)
        .join(', ');
      const suffix = s.exercises.length > 2 ? '…' : '';
      contributors.push({ label: `Strength: ${names}${suffix} (${dayLabel(s.date)})`, map: contrib });
      Object.keys(total).forEach((k) => {
        (total as unknown as Record<string, number>)[k] += (contrib as unknown as Record<string, number>)[k];
      });
    }
  }

  for (const s of log.climbing) {
    if (s.date >= startDate && s.date <= endDate) {
      const contrib = getClimbingStimulus(s);
      contributors.push({ label: `Climbing (${dayLabel(s.date)}, ${s.climbs.length} routes)`, map: contrib });
      Object.keys(total).forEach((k) => {
        (total as unknown as Record<string, number>)[k] += (contrib as unknown as Record<string, number>)[k];
      });
    }
  }

  for (const s of log.conditioning) {
    if (s.date >= startDate && s.date <= endDate) {
      const contrib = getConditioningStimulus(s);
      contributors.push({ label: `Conditioning (${dayLabel(s.date)})`, map: contrib });
      Object.keys(total).forEach((k) => {
        (total as unknown as Record<string, number>)[k] += (contrib as unknown as Record<string, number>)[k];
      });
    }
  }

  const levels = Object.fromEntries(
    Object.keys(total).map((k) => [k, toLevel((total as unknown as Record<string, number>)[k])])
  ) as Record<keyof StimulusMap, StimulusLevel>;

  const flags: string[] = [];
  if (levels.forearmsGrip === 'high') {
    flags.push('Forearm/grip load is high — monitor before next climbing session');
  }
  if (levels.pull === 'high') {
    flags.push('Pull volume is high this week');
  }
  if (levels.posteriorChain === 'high') {
    flags.push('Posterior chain load is high this week');
  }
  if (levels.quadDominant === 'high') {
    flags.push('Quad-dominant load is high this week');
  }

  const contexts = Object.fromEntries(
    Object.keys(total).map((k) => [
      k,
      buildStimulusContext(k as keyof StimulusMap, levels[k as keyof StimulusMap], contributors),
    ])
  ) as Record<keyof StimulusMap, StimulusContext>;

  return { raw: total, levels, flags, contexts };
}

export function getDailyStimulusForDomain(
  log: WorkoutLog,
  date: string
): StimulusMap {
  const total = EMPTY_MAP();

  const add = (m: StimulusMap) => {
    Object.keys(total).forEach((k) => {
      (total as unknown as Record<string, number>)[k] += (m as unknown as Record<string, number>)[k];
    });
  };

  log.cardio.filter((s) => s.date === date).forEach((s) => add(getCardioStimulus(s)));
  log.strength.filter((s) => s.date === date).forEach((s) => add(getStrengthStimulus(s)));
  log.climbing.filter((s) => s.date === date).forEach((s) => add(getClimbingStimulus(s)));
  log.conditioning.filter((s) => s.date === date).forEach((s) => add(getConditioningStimulus(s)));

  return total;
}

// Check if a muscle group has been "high" for 3+ consecutive days
export function getMandatoryRestGroups(
  log: WorkoutLog,
  asOfDate: string
): Array<keyof StimulusMap> {
  const mandatoryRest: Array<keyof StimulusMap> = [];
  const groups = Object.keys(EMPTY_MAP()) as Array<keyof StimulusMap>;

  for (const group of groups) {
    let consecutiveHigh = 0;
    for (let i = 2; i >= 0; i--) {
      const d = new Date(asOfDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayMap = getDailyStimulusForDomain(log, dateStr);
      if (toLevel(dayMap[group]) === 'high') {
        consecutiveHigh++;
      } else {
        consecutiveHigh = 0;
      }
    }
    if (consecutiveHigh >= 3) {
      mandatoryRest.push(group);
    }
  }

  return mandatoryRest;
}

export function getCurrentWeekDates(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
  };
}

// ── Single-session cardio load summary (for upload summary) ─────────────────

const CARDIO_TYPE_LABELS: Record<string, string> = {
  OutdoorHike: 'Outdoor hike',
  OutdoorRun: 'Outdoor run',
  IndoorRun: 'Indoor run',
  OutdoorCycling: 'Outdoor cycling',
  IndoorCycling: 'Indoor cycling',
  GeneralCardio: 'General cardio',
};

export function getCardioSessionStimulusSummary(session: CardioSession): CardioSessionSummary {
  const map = getCardioStimulus(session);

  // Use dominant group level as the session load classification
  let dominantKey: keyof StimulusMap | null = null;
  let dominantVal = 0;
  for (const [k, v] of Object.entries(map)) {
    if (v > dominantVal) {
      dominantVal = v;
      dominantKey = k as keyof StimulusMap;
    }
  }

  const level = dominantVal > 0 ? toLevel(dominantVal) : 'low';

  // Build factors list
  const factors: string[] = [];
  const typeLabel = CARDIO_TYPE_LABELS[session.activityType] ?? session.activityType;
  factors.push(`Activity type: ${typeLabel}`);

  if (session.duration > 0) {
    const hrs = Math.round((session.duration / 3600) * 10) / 10;
    factors.push(`Duration: ${hrs}h`);
  }

  if (session.elevationGain > 0) {
    factors.push(`Elevation gain: ${Math.round(session.elevationGain)}ft — increases posterior chain and loaded carry stimulus`);
  }

  if (session.packWeight && session.packWeight !== 'none') {
    factors.push(`Pack weight: ${session.packWeight} — increases loaded carry and posterior chain stimulus`);
  }

  if (session.weightsUsed) {
    factors.push('Weights used — adds loaded carry stimulus');
  }

  if (session.avgHR) {
    factors.push(`Avg HR: ${session.avgHR} bpm`);
  }

  if (session.perceivedEffort) {
    factors.push(`Perceived effort: ${session.perceivedEffort}/10`);
  }

  const dominantLabel = dominantKey ? (GROUP_LABELS[dominantKey] ?? String(dominantKey)) : null;

  return { level, dominantGroup: dominantLabel, factors };
}
