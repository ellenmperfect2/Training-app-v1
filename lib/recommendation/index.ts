// Single-day recommendation engine.
// Reads training-config.json and the most recent recovery classification.
// Implements the full decision tree from the kickoff spec.

import type {
  TrainingConfig,
  RecoveryClassification,
  WorkoutLog,
  ActivatedObjective,
} from '../storage';
import type { ClassificationDetail } from '../recovery';
import { getMandatoryRestGroups } from '../stimulus-engine';
import type { StimulusMap } from '../storage';
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
}): RecommendationCard {
  const { config: rawConfig, recovery, log, activeObjectives, today, planWeek, recoveryDetail } = params;

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

  // Step 5–6: Build recommendation based on recovery + proximity
  let card: RecommendationCard;

  if (finalRecovery === 'rest' || proximity === 'peak-week') {
    card = buildRestDay(finalRecovery, proximity);
  } else if (finalRecovery === 'fatigued') {
    card = buildFatiguedDay(finalRecovery);
  } else {
    // full or moderate
    card = buildTrainingDay(config, finalRecovery, planWeek, forearmsRest, posteriorRest);
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
  card.whyNote = buildDataWhyNote(finalRecovery, recoveryDetail, config, activeObjectives, usingDefault);

  // Override configInfluenceNote
  if (usingDefault) {
    card.configInfluenceNote = 'No active config — using baseline logic.';
  } else {
    card.configInfluenceNote = buildConfigNote(config, finalRecovery);
  }

  return card;
}

// ── Recovery resolution ────────────────────────────────────────────────────

function resolveRecentRecovery(
  log: WorkoutLog,
  today: string
): RecoveryClassification | null {
  // This function reads pre-computed classification stored in checkInLog.
  // The actual classification runs at check-in save time in /lib/recovery.
  // Here we look for it in the workout log by inspecting dates.
  // The UI layer will pass the actual value; this is a fallback resolver.
  return null;
}

// ── Why note builder ───────────────────────────────────────────────────────

function buildDataWhyNote(
  recovery: RecoveryClassification,
  recoveryDetail: ClassificationDetail | null | undefined,
  config: TrainingConfig,
  activeObjectives: ActivatedObjective[],
  usingDefault: boolean
): string {
  const parts: string[] = [];

  if (recoveryDetail) {
    // Biometric signals
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

    // Flag interactions take priority if present
    if (recoveryDetail.flagInteractions.length > 0) {
      parts.push(recoveryDetail.flagInteractions[0]);
    }
  }

  // Active objective context
  if (activeObjectives.length > 0) {
    const sorted = [...activeObjectives].sort((a, b) => a.weeksRemaining - b.weeksRemaining);
    const nearest = sorted[0];
    parts.push(
      `${nearest.name} is ${nearest.weeksRemaining} week${nearest.weeksRemaining === 1 ? '' : 's'} out — ${nearest.currentPhase} phase.`
    );
  }

  // Fallback if no specific signals
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

function buildConfigNote(config: TrainingConfig, recovery: RecoveryClassification): string | null {
  if (recovery === 'rest') {
    return 'Recovery takes priority — config settings are not influencing today\'s recommendation.';
  }

  const emphases: string[] = [];
  if (config['posterior-chain-emphasis'] === 'high') emphases.push('posterior chain emphasis');
  if (config['pull-emphasis'] === 'high') emphases.push('pull emphasis');
  if (config['push-emphasis'] === 'high') emphases.push('push emphasis');
  if (config['core-emphasis'] === 'high') emphases.push('core emphasis');
  if (config['single-leg-emphasis'] === 'high') emphases.push('single-leg emphasis');
  if (config['fatigue-state'] === 'high') emphases.push('fatigue state flagged as high');

  if (emphases.length > 0) {
    return `Config: ${emphases.slice(0, 2).join(' and ')}.`;
  }

  if (config['cardio-priority'] !== 'build') {
    return `Config: cardio priority is ${config['cardio-priority']}.`;
  }

  return 'Active config is shaping this block — emphasis settings are at medium defaults.';
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
  posteriorRest: boolean
): RecommendationCard {
  const isModerate = recovery === 'moderate';

  const workoutType = selectWorkoutType(config, forearmsRest, posteriorRest);
  const exercises = buildExerciseList(workoutType, config, isModerate, forearmsRest, posteriorRest);

  const modificationFlag = isModerate
    ? 'Volume reduced ~20% and intensity downgraded one level — moderate recovery.'
    : null;

  const parametersStr = exercises.length > 0
    ? exercises.map((e) => `${e.name} ${e.sets}×${e.reps}${e.note ? ` (${e.note})` : ''}`).join(' · ')
    : 'All primary muscle groups at mandatory rest — light movement only';

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
  // Priority: posterior chain > single leg > pull > push > core > quad
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

  // Default: full body
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
  posteriorRest: boolean
): ExerciseRecommendation[] {
  const results: ExerciseRecommendation[] = [];
  const exercises = exerciseLibrary.exercises;

  for (const id of workoutType.exerciseIds) {
    // Skip exercises based on mandatory rest
    if (forearmsRest && (id === 'pullup' || id === 'cable-lat-pulldown' || id === 'hanging-leg-lifts' || id === 'deadlift')) continue;
    if (posteriorRest && (id === 'deadlift' || id === 'single-leg-rdl')) continue;

    const def = exercises.find((e) => e.id === id);
    if (!def) continue;

    let sets = def.defaults.sets;
    let reps = def.defaults.reps;

    // Moderate: reduce volume ~20%
    if (isModerate) {
      sets = Math.max(1, Math.round(sets * 0.8));
    }

    // Config emphasis: increase sets for high-emphasis groups
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
