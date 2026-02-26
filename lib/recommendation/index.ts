// Single-day recommendation engine.
// Reads training-config.json and the most recent recovery classification.
// Implements the full decision tree from the kickoff spec.

import type {
  TrainingConfig,
  RecoveryClassification,
  WorkoutLog,
  ActivatedObjective,
  UserPreferences,
} from '../storage';
import { DEFAULT_USER_PREFERENCES } from '../storage';
import type { ClassificationDetail } from '../recovery';
import { getMandatoryRestGroups } from '../stimulus-engine';
import type { StimulusMap } from '../storage';
import { getZoneThresholds, computeZoneTotals } from '../zones';
import exerciseLibrary from '../../data/exercise-library.json';

export interface RecommendationCard {
  title: string;
  parameters: string;
  exercises: ExerciseRecommendation[];
  activityDescription: string | null;
  recoveryState: RecoveryClassification;
  recoveryNote: string;
  modificationFlag: string | null;
  configInfluenceNote: string | null;
  proximityNote: string | null;
  whyNote: string;
}

export interface ExerciseRecommendation {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  note?: string;
}

// Exercises suppressed by each limitation type
const LIMITATION_EXERCISES: Record<string, string[]> = {
  knee: ['barbell-squat', 'barbell-lunge', 'single-leg-rdl'],
  shoulder: ['bench-press', 'barbell-shoulder-press', 'pushup', 'pullup', 'inverted-row', 'cable-lat-pulldown', 'cable-row'],
  ankle: ['barbell-lunge', 'single-leg-rdl'],
  back: ['deadlift', 'barbell-squat', 'barbell-lunge'],
  forearm: ['pullup', 'cable-lat-pulldown', 'hanging-leg-lifts', 'deadlift'],
  other: [],
};

// Exercises suppressed by recommendation type suppression
const SUPPRESSION_TYPE_EXERCISES: Record<string, string[]> = {
  'heavy-lower-body': ['barbell-squat', 'deadlift', 'barbell-lunge', 'single-leg-rdl'],
  'high-impact-cardio': [],
  'climbing': [],
};

const DEFAULT_CONFIG: TrainingConfig = {
  'generated-date': 'default',
  'expires-date': 'never',
  'fatigue-state': 'low',
  'cardio-priority': 'build',
  'cardio-zone2-minimum-hours': 4,
  'strength-priority': 'build',
  'posterior-chain-emphasis': 'medium',
  'single-leg-emphasis': 'medium',
  'push-emphasis': 'medium',
  'pull-emphasis': 'medium',
  'core-emphasis': 'medium',
  'climbing-priority': 'build',
  'climbing-frequency-max': 3,
  'conditioning-frequency': 2,
  'loaded-carry-sessions': 1,
  'objective-proximity-flag': 'normal',
  'override-reason': 'Default baseline config.',
};

// ── Zone analysis helpers ──────────────────────────────────────────────────

function getLast4WeeksCardio(log: WorkoutLog, today: string) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return log.cardio.filter((s) => s.date >= cutoffStr && s.date <= today);
}

function getWeekStart(today: string): string {
  const now = new Date(today);
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return now.toISOString().slice(0, 10);
}

function buildZoneRecommendation(
  log: WorkoutLog,
  today: string,
  config: TrainingConfig,
  activeObjectives: ActivatedObjective[],
  prefs: UserPreferences
): { cardioNote: string | null; cardioParams: string | null } {
  const sessions = getLast4WeeksCardio(log, today);
  if (sessions.length === 0) return { cardioNote: null, cardioParams: null };

  const zones = getZoneThresholds();
  const totals = computeZoneTotals(sessions);
  const totalHours = totals.totalHours;
  const anaerobicPct = totalHours > 0
    ? ((totals.z4Hours + totals.z5Hours) / totalHours) * 100
    : 0;

  const minZ2 = config['cardio-zone2-minimum-hours'];
  const weekStart = getWeekStart(today);
  const thisWeekZ2 = computeZoneTotals(
    log.cardio.filter((s) => s.date >= weekStart && s.date <= today)
  ).z2Hours;

  const z2low = zones.z2.low + prefs.hrCalibrationOffset;
  const z2high = zones.z2.high + prefs.hrCalibrationOffset;
  const z4low = zones.z4.low + prefs.hrCalibrationOffset;
  const z4high = zones.z4.high + prefs.hrCalibrationOffset;

  // ── With active objectives ──────────────────────────────────────────────

  if (activeObjectives.length > 0) {
    // Work from nearest objective
    const sorted = [...activeObjectives].sort((a, b) => a.weeksRemaining - b.weeksRemaining);
    const obj = sorted[0];

    const thresholdRequired = obj.thresholdCapacityRequired ?? false;
    const introWeeks = obj.thresholdIntroductionWeeksOut ?? 8;
    const altFt = obj.maxAltitudeFt ?? 0;
    const weeks = obj.weeksRemaining;

    // Condition 1: threshold introduction phase — window is open, deficit exists
    if (thresholdRequired && weeks <= introWeeks && anaerobicPct < 15 && totalHours > 2) {
      const altNote = altFt > 8000 ? ' at altitude' : '';
      return {
        cardioNote: `${obj.name} demands threshold capacity${altNote}. Z4–Z5 has been ${Math.round(anaerobicPct)}% of 4-week cardio volume — ${weeks} week${weeks === 1 ? '' : 's'} remaining.`,
        cardioParams: `3 × 10 min at threshold effort (target HR ${z4low}–${z4high} bpm) with 10 min Z1 recovery between efforts`,
      };
    }

    // Condition 2: aerobic base thin, still in base phase (before threshold window)
    if (minZ2 > 0 && thisWeekZ2 < minZ2 && weeks > introWeeks) {
      const remaining = Math.round((minZ2 - thisWeekZ2) * 10) / 10;
      return {
        cardioNote: `Z2 this week: ${thisWeekZ2.toFixed(1)}h (minimum ${minZ2}h). Aerobic base phase is appropriate — threshold work begins in ~${introWeeks} weeks.`,
        cardioParams: `Zone 2 cardio (target HR ${z2low}–${z2high} bpm) — ${remaining}h remaining to meet weekly minimum`,
      };
    }

    // Condition 3: altitude objective approaching, threshold work absent
    if (altFt > 8000 && weeks <= 8 && thresholdRequired && anaerobicPct < 10 && totalHours > 2) {
      const avgWeeklyZ2 = totals.z2Hours / 4;
      const z2Status = minZ2 > 0 && avgWeeklyZ2 >= minZ2 * 0.85 ? 'on track' : 'behind';
      return {
        cardioNote: `${obj.name} is above 8000ft. Aerobic base is ${z2Status}. Z4–Z5 has been only ${Math.round(anaerobicPct)}% of cardio with ${weeks} weeks remaining — altitude demands threshold capacity.`,
        cardioParams: `3 × 10 min at threshold effort (target HR ${z4low}–${z4high} bpm) with 10 min Z1 recovery`,
      };
    }

    return { cardioNote: null, cardioParams: null };
  }

  // ── No objectives: methodology-based aerobic/anaerobic targets ──────────

  const methodologyAerobicTarget: Record<string, number> = {
    'uphill-athlete': 80,
    'general-endurance': 70,
    'balanced': 60,
  };
  const methodologyLabels: Record<string, string> = {
    'uphill-athlete': 'Uphill Athlete',
    'general-endurance': 'General Endurance',
    'balanced': 'Balanced',
  };

  const aerobicTarget = methodologyAerobicTarget[prefs.preferredMethodology] ?? 80;
  const anaerobicTarget = 100 - aerobicTarget;
  const label = methodologyLabels[prefs.preferredMethodology] ?? 'Uphill Athlete';

  if (totalHours > 0) {
    if (totals.aerobicPct < aerobicTarget) {
      return {
        cardioNote: `${label}: aerobic target is ${aerobicTarget}% Z1–Z2. Current 4-week balance is ${totals.aerobicPct}%.`,
        cardioParams: `Zone 2 cardio (target HR ${z2low}–${z2high} bpm) to build aerobic base toward ${aerobicTarget}% target`,
      };
    }
    if (Math.round(anaerobicPct) < anaerobicTarget && totalHours > 2) {
      return {
        cardioNote: `${label}: threshold target is ${anaerobicTarget}% Z4–Z5. Current 4-week balance is ${Math.round(anaerobicPct)}%.`,
        cardioParams: `3 × 10 min at threshold effort (target HR ${z4low}–${z4high} bpm) with 10 min Z1 recovery`,
      };
    }
  }

  return { cardioNote: null, cardioParams: null };
}

export function buildRecommendation(params: {
  config: TrainingConfig | null;
  recovery: RecoveryClassification | null;
  log: WorkoutLog;
  activeObjectives: ActivatedObjective[];
  today: string;
  planWeek?: {
    keyWorkouts: string[];
    notes: string;
  } | null;
  recoveryDetail?: ClassificationDetail | null;
  userPreferences?: UserPreferences | null;
}): RecommendationCard {
  const { config: rawConfig, recovery, log, activeObjectives, today, planWeek, recoveryDetail } = params;
  const prefs = params.userPreferences ?? DEFAULT_USER_PREFERENCES;

  // Step 2: Resolve config
  const config = rawConfig ?? DEFAULT_CONFIG;
  const usingDefault = !rawConfig;
  const proximity = config['objective-proximity-flag'];

  // Step 3: Resolve recovery
  const resolvedRecovery = recovery ?? resolveRecentRecovery(log, today);
  const finalRecovery = resolvedRecovery ?? 'moderate';
  const noCheckInWarning = !resolvedRecovery
    ? 'No check-in in the last 48 hours — using moderate recovery as default.'
    : null;

  // Step 4: Check mandatory rest muscle groups
  const mandatoryRest = getMandatoryRestGroups(log, today);
  const forearmsRest = mandatoryRest.includes('forearmsGrip');
  const posteriorRest = mandatoryRest.includes('posteriorChain');

  // Compute preference-based exercise suppression
  const suppressedExerciseIds = computeSuppressedExercises(prefs);

  // Zone analysis for cardio recommendations
  const { cardioNote, cardioParams } = buildZoneRecommendation(
    log, today, config, activeObjectives, prefs
  );

  // Step 5–6: Build recommendation based on recovery + proximity
  let card: RecommendationCard;

  if (finalRecovery === 'rest' || proximity === 'peak-week') {
    card = buildRestDay(finalRecovery, proximity);
  } else if (finalRecovery === 'fatigued') {
    card = buildFatiguedDay(finalRecovery);
  } else {
    // full or moderate
    card = buildTrainingDay(config, finalRecovery, planWeek, forearmsRest, posteriorRest, suppressedExerciseIds);
  }

  // Step 6: Proximity modifier
  if (proximity === 'taper' && finalRecovery !== 'rest') {
    card = applyTaperModifier(card);
  } else if (proximity === 'approaching') {
    card.proximityNote = 'Objective approaching — protecting key benchmark sessions.';
  }

  // Attach recovery note
  if (noCheckInWarning) {
    card.recoveryNote = noCheckInWarning;
  }

  // Override whyNote with data-specific version
  card.whyNote = buildDataWhyNote(finalRecovery, recoveryDetail, config, activeObjectives, prefs, usingDefault);

  // Append zone-based cardio context to whyNote (after main why note)
  if (cardioNote && card.recoveryState !== 'rest' && card.recoveryState !== 'fatigued') {
    card.whyNote = card.whyNote ? `${card.whyNote} ${cardioNote}` : cardioNote;
    if (cardioParams && card.exercises.length === 0 && !card.activityDescription) {
      card.parameters = cardioParams;
    }
  }

  // Override configInfluenceNote
  card.configInfluenceNote = buildConfigNote(config, finalRecovery, usingDefault, prefs);

  return card;
}

// ── Preference helpers ─────────────────────────────────────────────────────

function computeSuppressedExercises(prefs: UserPreferences): string[] {
  const ids = new Set<string>();
  for (const lim of prefs.activeLimitations) {
    for (const id of (LIMITATION_EXERCISES[lim] ?? [])) {
      ids.add(id);
    }
  }
  for (const type of prefs.suppressedRecommendationTypes) {
    for (const id of (SUPPRESSION_TYPE_EXERCISES[type] ?? [])) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

// ── Recovery resolution ────────────────────────────────────────────────────

function resolveRecentRecovery(
  log: WorkoutLog,
  today: string
): RecoveryClassification | null {
  return null;
}

// ── Why note builder ───────────────────────────────────────────────────────

function buildDataWhyNote(
  recovery: RecoveryClassification,
  recoveryDetail: ClassificationDetail | null | undefined,
  config: TrainingConfig,
  activeObjectives: ActivatedObjective[],
  prefs: UserPreferences,
  usingDefault: boolean
): string {
  const parts: string[] = [];

  if (recoveryDetail) {
    const hrvPct = recoveryDetail.hrvPct;
    const rhrDiff = recoveryDetail.rhrDiff;

    if (hrvPct !== null) {
      if (hrvPct > 0) {
        parts.push(`HRV is ${hrvPct}% below your 30-day average.`);
      } else if (hrvPct < 0) {
        parts.push(`HRV is ${Math.abs(hrvPct)}% above your 30-day average.`);
      } else {
        parts.push('HRV is at baseline.');
      }
    }

    if (rhrDiff !== null) {
      if (rhrDiff > 0) {
        parts.push(`Resting HR is ${rhrDiff} bpm elevated.`);
      } else if (rhrDiff < 0) {
        parts.push(`Resting HR is ${Math.abs(rhrDiff)} bpm below baseline.`);
      }
    }

    if (recoveryDetail.flagInteractions.length > 0) {
      parts.push(recoveryDetail.flagInteractions[0]);
    }
  }

  // Active objective context + objective notes
  if (activeObjectives.length > 0) {
    const sorted = [...activeObjectives].sort((a, b) => a.weeksRemaining - b.weeksRemaining);
    const nearest = sorted[0];
    let objPart = `${nearest.name} is ${nearest.weeksRemaining} week${nearest.weeksRemaining === 1 ? '' : 's'} out — ${nearest.currentPhase} phase.`;
    const note = prefs.objectiveNotes[nearest.id]?.trim();
    if (note) {
      objPart += ` Note: ${note}`;
    }
    parts.push(objPart);
  }

  // Active limitations
  if (prefs.activeLimitations.length > 0) {
    parts.push(`Limitations active (${prefs.activeLimitations.join(', ')}) — affected exercises suppressed.`);
  }

  // Fallback
  if (parts.length === 0) {
    if (usingDefault) {
      return 'No check-in data available — recommendation based on default settings. Log a morning check-in for personalised context.';
    }
    return recovery === 'full'
      ? 'Recovery signals are strong — executing plan as prescribed.'
      : 'No biometric data for today — classification based on sleep quality and subjective feel.';
  }

  return parts.slice(0, 3).join(' ');
}

function buildConfigNote(
  config: TrainingConfig,
  recovery: RecoveryClassification,
  usingDefault: boolean,
  prefs: UserPreferences
): string | null {
  const notes: string[] = [];

  if (recovery === 'rest') {
    notes.push('Recovery takes priority — config settings are not influencing today\'s recommendation.');
  } else if (usingDefault) {
    notes.push('No active config — using baseline logic.');
  } else {
    const emphases: string[] = [];
    if (config['posterior-chain-emphasis'] === 'high') emphases.push('posterior chain emphasis');
    if (config['pull-emphasis'] === 'high') emphases.push('pull emphasis');
    if (config['push-emphasis'] === 'high') emphases.push('push emphasis');
    if (config['core-emphasis'] === 'high') emphases.push('core emphasis');
    if (config['single-leg-emphasis'] === 'high') emphases.push('single-leg emphasis');
    if (config['fatigue-state'] === 'high') emphases.push('fatigue state flagged as high');

    if (emphases.length > 0) {
      notes.push(`Config: ${emphases.slice(0, 2).join(' and ')}.`);
    } else if (config['cardio-priority'] !== 'build') {
      notes.push(`Config: cardio priority is ${config['cardio-priority']}.`);
    } else {
      notes.push('Active config — emphasis settings at medium defaults.');
    }
  }

  // HR calibration offset
  if (prefs.hrCalibrationOffset !== 0) {
    const sign = prefs.hrCalibrationOffset > 0 ? '+' : '';
    notes.push(`HR calibration offset: ${sign}${prefs.hrCalibrationOffset} bpm.`);
  }

  // Suppressed recommendation types
  if (prefs.suppressedRecommendationTypes.length > 0) {
    notes.push(`Suppressed: ${prefs.suppressedRecommendationTypes.join(', ')}.`);
  }

  // Non-default methodology
  if (prefs.preferredMethodology !== 'uphill-athlete') {
    notes.push(`Methodology: ${prefs.preferredMethodology}.`);
  }

  return notes.length > 0 ? notes.join(' ') : null;
}

// ── Day builders ───────────────────────────────────────────────────────────

function buildRestDay(
  recovery: RecoveryClassification,
  proximity: TrainingConfig['objective-proximity-flag']
): RecommendationCard {
  const isPeakWeek = proximity === 'peak-week';
  return {
    title: isPeakWeek ? 'Peak Week — Rest and Easy Movement' : 'Rest Day',
    parameters: isPeakWeek
      ? 'Full rest or gentle walk only — arrive fresh for your objective'
      : 'Full rest — no structured training today',
    exercises: [],
    activityDescription: 'Full rest or gentle walk only.',
    recoveryState: recovery,
    recoveryNote: isPeakWeek
      ? 'Peak week — rest and easy movement only to arrive fresh.'
      : 'Full rest recommended based on today\'s recovery data.',
    modificationFlag: null,
    configInfluenceNote: null,
    proximityNote: isPeakWeek ? 'Objective is within one week — rest is the training.' : null,
    whyNote: isPeakWeek
      ? 'Arriving at your objective fresh matters more than any workout this week.'
      : 'Your body needs full rest today. Any intensity will extend recovery time.',
  };
}

function buildFatiguedDay(recovery: RecoveryClassification): RecommendationCard {
  return {
    title: 'Active Recovery — Easy Zone 1 Only',
    parameters: 'Easy movement 20–45 min, zone 1 only — conversational pace throughout. No strength, climbing, or conditioning.',
    exercises: [],
    activityDescription: 'Easy Zone 1 cardio — 20–45 min walk, easy spin, or gentle movement. No strength, no climbing, no conditioning.',
    recoveryState: recovery,
    recoveryNote: 'Fatigued — swapping to active recovery.',
    modificationFlag: 'Plan downgraded to active recovery due to fatigue.',
    configInfluenceNote: null,
    proximityNote: null,
    whyNote: 'Fatigue signals from today\'s check-in indicate your body needs easy movement rather than training stimulus.',
  };
}

function buildTrainingDay(
  config: TrainingConfig,
  recovery: RecoveryClassification,
  planWeek: { keyWorkouts: string[]; notes: string } | null | undefined,
  forearmsRest: boolean,
  posteriorRest: boolean,
  suppressedExerciseIds: string[]
): RecommendationCard {
  const isModerate = recovery === 'moderate';

  const workoutType = selectWorkoutType(config, forearmsRest, posteriorRest);
  const exercises = buildExerciseList(workoutType, config, isModerate, forearmsRest, posteriorRest, suppressedExerciseIds);

  const modificationFlag = isModerate
    ? 'Volume reduced ~20% and intensity downgraded one level — moderate recovery.'
    : null;

  const parametersStr = exercises.length > 0
    ? exercises.map((e) => `${e.name} ${e.sets}×${e.reps}${e.note ? ` (${e.note})` : ''}`).join(' · ')
    : 'All primary muscle groups at mandatory rest or suppressed — light movement only';

  return {
    title: workoutType.label,
    parameters: parametersStr,
    exercises,
    activityDescription: null,
    recoveryState: recovery,
    recoveryNote: isModerate
      ? 'Moderate recovery — reducing intensity slightly from plan.'
      : 'Full recovery — executing plan as prescribed.',
    modificationFlag,
    configInfluenceNote: null,
    proximityNote: null,
    whyNote: isModerate
      ? 'Moderate recovery — keeping movement patterns but reducing volume.'
      : 'Full recovery — executing plan as prescribed.',
  };
}

// ── Workout type selection ─────────────────────────────────────────────────

interface WorkoutType {
  id: string;
  label: string;
  muscleGroup: string;
  exerciseIds: string[];
}

function selectWorkoutType(
  config: TrainingConfig,
  forearmsRest: boolean,
  posteriorRest: boolean
): WorkoutType {
  if (config['posterior-chain-emphasis'] === 'high' && !posteriorRest) {
    return {
      id: 'lower-posterior',
      label: 'Lower Body — Posterior Chain',
      muscleGroup: 'posterior-chain',
      exerciseIds: ['deadlift', 'single-leg-rdl', 'barbell-lunge'],
    };
  }

  if (config['pull-emphasis'] === 'high' && !forearmsRest) {
    return {
      id: 'upper-pull',
      label: 'Upper Body — Pull',
      muscleGroup: 'pull',
      exerciseIds: ['pullup', 'inverted-row', 'cable-lat-pulldown', 'cable-row'],
    };
  }

  if (config['push-emphasis'] === 'high') {
    return {
      id: 'upper-push',
      label: 'Upper Body — Push',
      muscleGroup: 'push',
      exerciseIds: ['bench-press', 'barbell-shoulder-press', 'pushup'],
    };
  }

  if (config['core-emphasis'] === 'high') {
    return {
      id: 'core',
      label: 'Core',
      muscleGroup: 'core',
      exerciseIds: ['hanging-leg-lifts', 'leg-lifts-lying'],
    };
  }

  if (config['single-leg-emphasis'] === 'high' && !posteriorRest) {
    return {
      id: 'lower-quad',
      label: 'Lower Body — Quad',
      muscleGroup: 'quad-dominant',
      exerciseIds: ['barbell-squat', 'barbell-lunge', 'single-leg-rdl'],
    };
  }

  return {
    id: 'full-body',
    label: 'Full Body',
    muscleGroup: 'full',
    exerciseIds: ['barbell-squat', 'deadlift', 'bench-press', 'pullup', 'leg-lifts-lying'],
  };
}

function buildExerciseList(
  workoutType: WorkoutType,
  config: TrainingConfig,
  isModerate: boolean,
  forearmsRest: boolean,
  posteriorRest: boolean,
  suppressedExerciseIds: string[]
): ExerciseRecommendation[] {
  const results: ExerciseRecommendation[] = [];
  const exercises = exerciseLibrary.exercises;

  for (const id of workoutType.exerciseIds) {
    // Skip exercises based on mandatory rest
    if (forearmsRest && (id === 'pullup' || id === 'cable-lat-pulldown' || id === 'hanging-leg-lifts' || id === 'deadlift')) continue;
    if (posteriorRest && (id === 'deadlift' || id === 'single-leg-rdl')) continue;
    // Skip exercises suppressed by user preferences / limitations
    if (suppressedExerciseIds.includes(id)) continue;

    const def = exercises.find((e) => e.id === id);
    if (!def) continue;

    let sets = def.defaults.sets;
    let reps = def.defaults.reps;

    if (isModerate) {
      sets = Math.max(1, Math.round(sets * 0.8));
    }

    const emphasis = getEmphasisForExercise(def, config);
    if (emphasis === 'high' && !isModerate) sets = sets + 1;
    if (emphasis === 'low') sets = Math.max(1, sets - 1);

    results.push({
      exerciseId: def.id,
      name: def.name,
      sets,
      reps,
    });
  }

  return results;
}

function getEmphasisForExercise(
  def: { primaryMuscleGroup: string },
  config: TrainingConfig
): 'low' | 'medium' | 'high' {
  const emphasisMap: Record<string, keyof TrainingConfig> = {
    'posterior-chain': 'posterior-chain-emphasis',
    'quad-dominant': 'single-leg-emphasis',
    'push': 'push-emphasis',
    'pull': 'pull-emphasis',
    'core': 'core-emphasis',
  };
  const key = emphasisMap[def.primaryMuscleGroup];
  if (!key) return 'medium';
  return config[key] as 'low' | 'medium' | 'high';
}

// ── Taper modifier ─────────────────────────────────────────────────────────

function applyTaperModifier(card: RecommendationCard): RecommendationCard {
  const reduced = card.exercises.map((e) => ({
    ...e,
    sets: Math.max(1, Math.round(e.sets * 0.6)),
    note: 'Taper',
  }));

  const parametersStr = reduced.length > 0
    ? reduced.map((e) => `${e.name} ${e.sets}×${e.reps} (Taper)`).join(' · ')
    : card.parameters;

  return {
    ...card,
    exercises: reduced,
    parameters: parametersStr,
    modificationFlag: 'Taper week — volume reduced ~40%, intensity maintained.',
    proximityNote: 'Objective is 1–2 weeks away — arriving fresh is the priority.',
    whyNote: 'Taper: reduce volume, maintain intensity, protect key movements.',
  };
}
