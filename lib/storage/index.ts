// All localStorage read/write helpers for Summit Dashboard.
// Never call localStorage directly outside this module.

export const STORAGE_KEYS = {
  ACTIVE_OBJECTIVES: 'activeObjectives',
  ARCHIVED_OBJECTIVES: 'archivedObjectives',
  COMBINED_PLAN: 'combinedPlan',
  CONFLICTS: 'conflicts',
  WORKOUT_LOG: 'workoutLog',
  CHECKIN_LOG: 'checkInLog',
  PERSONAL_BASELINE: 'personalBaseline',
  STIMULUS_HISTORY: 'stimulusHistory',
  PROGRESSION_HISTORY: 'progressionHistory',
  ACTIVE_TRAINING_CONFIG: 'activeTrainingConfig',
  CONFIG_HISTORY: 'configHistory',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

// ── Active Objectives ──────────────────────────────────────────────────────

export function getActiveObjectives(): ActivatedObjective[] {
  return read<ActivatedObjective[]>(STORAGE_KEYS.ACTIVE_OBJECTIVES, []);
}

export function setActiveObjectives(objectives: ActivatedObjective[]): void {
  write(STORAGE_KEYS.ACTIVE_OBJECTIVES, objectives);
}

// ── Archived Objectives ────────────────────────────────────────────────────

export function getArchivedObjectives(): ArchivedObjective[] {
  return read<ArchivedObjective[]>(STORAGE_KEYS.ARCHIVED_OBJECTIVES, []);
}

export function setArchivedObjectives(objectives: ArchivedObjective[]): void {
  write(STORAGE_KEYS.ARCHIVED_OBJECTIVES, objectives);
}

// ── Combined Plan ──────────────────────────────────────────────────────────

export function getCombinedPlan(): CombinedTrainingPlan | null {
  return read<CombinedTrainingPlan | null>(STORAGE_KEYS.COMBINED_PLAN, null);
}

export function setCombinedPlan(plan: CombinedTrainingPlan): void {
  write(STORAGE_KEYS.COMBINED_PLAN, plan);
}

// ── Conflicts ──────────────────────────────────────────────────────────────

export function getConflicts(): ConflictList {
  return read<ConflictList>(STORAGE_KEYS.CONFLICTS, []);
}

export function setConflicts(conflicts: ConflictList): void {
  write(STORAGE_KEYS.CONFLICTS, conflicts);
}

// ── Workout Log ────────────────────────────────────────────────────────────

export function getWorkoutLog(): WorkoutLog {
  return read<WorkoutLog>(STORAGE_KEYS.WORKOUT_LOG, {
    cardio: [],
    strength: [],
    climbing: [],
    conditioning: [],
  });
}

export function setWorkoutLog(log: WorkoutLog): void {
  write(STORAGE_KEYS.WORKOUT_LOG, log);
}

export function appendCardioSession(session: ParsedCorosSession): void {
  const log = getWorkoutLog();
  log.cardio = [...log.cardio, session];
  setWorkoutLog(log);
}

export function appendStrengthSession(session: StrengthSession): void {
  const log = getWorkoutLog();
  log.strength = [...log.strength, session];
  setWorkoutLog(log);
}

export function appendClimbingSession(session: ClimbingSession): void {
  const log = getWorkoutLog();
  log.climbing = [...log.climbing, session];
  setWorkoutLog(log);
}

export function appendConditioningSession(session: ConditioningSession): void {
  const log = getWorkoutLog();
  log.conditioning = [...log.conditioning, session];
  setWorkoutLog(log);
}

// ── Check-In Log ───────────────────────────────────────────────────────────

export function getCheckInLog(): DailyCheckIn[] {
  return read<DailyCheckIn[]>(STORAGE_KEYS.CHECKIN_LOG, []);
}

export function setCheckInLog(log: DailyCheckIn[]): void {
  write(STORAGE_KEYS.CHECKIN_LOG, log);
}

export function upsertCheckIn(entry: DailyCheckIn): void {
  const log = getCheckInLog();
  const idx = log.findIndex((e) => e.date === entry.date);
  if (idx >= 0) {
    log[idx] = entry;
  } else {
    log.push(entry);
  }
  log.sort((a, b) => a.date.localeCompare(b.date));
  setCheckInLog(log);
}

export function getCheckInByDate(date: string): DailyCheckIn | null {
  return getCheckInLog().find((e) => e.date === date) ?? null;
}

export function getRecentCheckIns(days: number): DailyCheckIn[] {
  const log = getCheckInLog();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return log.filter((e) => e.date >= cutoffStr);
}

// ── Personal Baseline ──────────────────────────────────────────────────────

export function getPersonalBaseline(): PersonalBaseline {
  return read<PersonalBaseline>(STORAGE_KEYS.PERSONAL_BASELINE, {
    hrv30DayAverage: null,
    restingHR30DayAverage: null,
    baselineEstablished: false,
    baselineCalculatedDate: null,
    manualHrv: null,
    manualRestingHR: null,
  });
}

export function setPersonalBaseline(baseline: PersonalBaseline): void {
  write(STORAGE_KEYS.PERSONAL_BASELINE, baseline);
}

// ── Stimulus History ───────────────────────────────────────────────────────

export function getStimulusHistory(): WeeklyStimulusSnapshot[] {
  return read<WeeklyStimulusSnapshot[]>(STORAGE_KEYS.STIMULUS_HISTORY, []);
}

export function setStimulusHistory(history: WeeklyStimulusSnapshot[]): void {
  write(STORAGE_KEYS.STIMULUS_HISTORY, history);
}

// ── Progression History ────────────────────────────────────────────────────

export function getProgressionHistory(): ProgressionHistory {
  return read<ProgressionHistory>(STORAGE_KEYS.PROGRESSION_HISTORY, {
    byExercise: {},
    climbingGrades: {},
  });
}

export function setProgressionHistory(history: ProgressionHistory): void {
  write(STORAGE_KEYS.PROGRESSION_HISTORY, history);
}

// ── Training Config ────────────────────────────────────────────────────────

export function getActiveTrainingConfig(): TrainingConfig | null {
  return read<TrainingConfig | null>(STORAGE_KEYS.ACTIVE_TRAINING_CONFIG, null);
}

export function setActiveTrainingConfig(config: TrainingConfig): void {
  // Push current config to history before replacing
  const current = getActiveTrainingConfig();
  if (current) {
    const history = getConfigHistory();
    history.push(current);
    write(STORAGE_KEYS.CONFIG_HISTORY, history);
  }
  write(STORAGE_KEYS.ACTIVE_TRAINING_CONFIG, config);
}

export function getConfigHistory(): TrainingConfig[] {
  return read<TrainingConfig[]>(STORAGE_KEYS.CONFIG_HISTORY, []);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActivatedObjective {
  id: string;
  libraryId: string;
  name: string;
  type: string;
  targetDate: string;
  activatedDate: string;
  priorityWeight: number;
  currentPhase: string;
  weeksRemaining: number;
  assessmentResults: AssessmentResult[];
  trainingPlan: TrainingWeek[];
  // Set at activation time, overrides library default
  packWeight?: string;
  region?: string;
  limitations?: string[];
}

export interface ArchivedObjective {
  id: string;
  libraryId: string;
  name: string;
  type: string;
  targetDate: string;
  activatedDate: string;
  completedDate: string;
  finalReadinessTier: 'ready' | 'borderline' | 'not-ready';
  assessmentResults: AssessmentResult[];
  trainingSummary: {
    totalWeeks: number;
    cardioHours: number;
    strengthSessions: number;
    climbingSessions: number;
    benchmarksAchieved: string[];
  };
}

export interface AssessmentResult {
  assessmentId: string;
  completedDate: string | null;
  result: 'pass' | 'borderline' | 'miss' | null;
  notes: string;
}

export interface TrainingWeek {
  weekNumber: number;
  startDate: string;
  phase: string;
  keyWorkouts: string[];
  notes: string;
  completed: boolean;
}

export interface CombinedTrainingPlan {
  generatedDate: string;
  weeks: TrainingWeek[];
}

export type ConflictList = string[];

export interface WorkoutLog {
  cardio: ParsedCorosSession[];
  strength: StrengthSession[];
  climbing: ClimbingSession[];
  conditioning: ConditioningSession[];
}

export interface ParsedCorosSession {
  id: string;
  date: string;
  corosType: string;
  filename: string;
  durationMinutes: number;
  movingTimeMinutes: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  avgHR: number | null;
  maxHR: number | null;
  calories: number | null;
  annotation: {
    packWeight?: string;
    terrain?: string;
    weightsUsed?: boolean;
    perceivedEffort?: number;
    notes?: string;
  };
}

export interface StrengthSession {
  id: string;
  date: string;
  templateUsed: string | null;
  exercises: StrengthExercise[];
  notes: string;
}

export interface StrengthExercise {
  exerciseId: string;
  sets: StrengthSet[];
}

export interface StrengthSet {
  setNumber: number;
  reps: number;
  weight: number;
  unit: 'lbs' | 'kg';
}

export interface ClimbingSession {
  id: string;
  date: string;
  sessionType: 'bouldering' | 'top-rope' | 'lead' | 'outdoor-sport' | 'outdoor-trad';
  climbs: Climb[];
  notes: string;
}

export interface Climb {
  grade: string;
  result: 'send' | 'attempt';
}

export interface ConditioningSession {
  id: string;
  date: string;
  pullupSets: PullupSet[];
  deadhangSets: DeadhangSet[];
  hangboardSets: HangboardSet[];
  notes: string;
}

export interface PullupSet {
  weightAdded: number;
  reps: number;
  assist: 'none' | 'light' | 'medium' | 'heavy';
}

export interface DeadhangSet {
  hangSeconds: number;
  restSeconds: number;
}

export interface HangboardSet {
  edgeSizeMm: number;
  hangDurationSeconds: number;
  restDurationSeconds: number;
  rounds: number;
  weight: number;
  assist: 'none' | 'light' | 'medium' | 'heavy';
}

export interface DailyCheckIn {
  date: string;
  sleep: {
    quality: 'Great' | 'Good' | 'Fair' | 'Low' | 'Poor';
    hours: number;
    bedtime?: string;
    wakeTime?: string;
  };
  recovery: {
    hrv: number | null;
    restingHR: number | null;
    hrRangeLow: number | null;
    hrRangeHigh: number | null;
  };
  subjectiveFeel: {
    legs: number;
    energy: number;
    motivation: number;
  };
  flags: Array<'stress' | 'travel' | 'illness' | 'altitude'>;
  notes: string;
  recoveryClassification?: RecoveryClassification;
}

export type RecoveryClassification = 'full' | 'moderate' | 'fatigued' | 'rest';

export interface PersonalBaseline {
  hrv30DayAverage: number | null;
  restingHR30DayAverage: number | null;
  baselineEstablished: boolean;
  baselineCalculatedDate: string | null;
  manualHrv: number | null;
  manualRestingHR: number | null;
}

export interface WeeklyStimulusSnapshot {
  weekStartDate: string;
  stimulus: StimulusMap;
}

export interface StimulusMap {
  posteriorChain: number;
  quadDominant: number;
  push: number;
  pull: number;
  core: number;
  loadedCarry: number;
  forearmsGrip: number;
}

export interface ProgressionHistory {
  byExercise: Record<string, ProgressionDataPoint[]>;
  climbingGrades: Record<string, GradeDataPoint[]>;
}

export interface ProgressionDataPoint {
  date: string;
  sets: StrengthSet[];
}

export interface GradeDataPoint {
  date: string;
  highestSend: string;
}

export interface TrainingConfig {
  'generated-date': string;
  'expires-date': string;
  'fatigue-state': 'low' | 'moderate' | 'high' | 'rest';
  'cardio-priority': 'maintain' | 'build' | 'peak' | 'taper';
  'cardio-zone2-minimum-hours': number;
  'strength-priority': 'maintain' | 'build' | 'peak' | 'deload';
  'posterior-chain-emphasis': 'low' | 'medium' | 'high';
  'single-leg-emphasis': 'low' | 'medium' | 'high';
  'push-emphasis': 'low' | 'medium' | 'high';
  'pull-emphasis': 'low' | 'medium' | 'high';
  'core-emphasis': 'low' | 'medium' | 'high';
  'climbing-priority': 'maintain' | 'build' | 'peak' | 'rest';
  'climbing-frequency-max': number;
  'conditioning-frequency': number;
  'loaded-carry-sessions': number;
  'objective-proximity-flag': 'normal' | 'approaching' | 'taper' | 'peak-week';
  'override-reason': string;
}
