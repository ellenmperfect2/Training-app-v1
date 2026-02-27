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
  USER_PREFERENCES: 'userPreferences',
  USER_ZONES: 'userZones',
  LAST_EXPORT_DATE: 'lastExportDate',
  BENCHMARK_COMPLETION_LOG: 'benchmarkCompletionLog',
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
  const log = read<WorkoutLog>(STORAGE_KEYS.WORKOUT_LOG, {
    cardio: [],
    strength: [],
    climbing: [],
    conditioning: [],
  });
  // Clamp non-finite numeric fields — guards against NaN stored by older parser versions
  log.cardio = log.cardio.map((s) => ({
    ...s,
    duration: Number.isFinite(s.duration) ? s.duration : 0,
    distance: Number.isFinite(s.distance) ? s.distance : 0,
    elevationGain: Number.isFinite(s.elevationGain) ? s.elevationGain : 0,
  }));
  return log;
}

export function setWorkoutLog(log: WorkoutLog): void {
  write(STORAGE_KEYS.WORKOUT_LOG, log);
}

export function appendCardioSession(session: CardioSession): void {
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

// ── User Preferences ───────────────────────────────────────────────────────

export type LimitationType = 'knee' | 'shoulder' | 'ankle' | 'back' | 'forearm' | 'other';
export type MethodologyType = 'uphill-athlete' | 'general-endurance' | 'balanced';
export type SuppressedRecommendationType = 'high-impact-cardio' | 'heavy-lower-body' | 'climbing';

export interface UserPreferences {
  hrCalibrationOffset: number;
  activeLimitations: LimitationType[];
  preferredMethodology: MethodologyType;
  objectiveNotes: Record<string, string>;
  suppressedRecommendationTypes: SuppressedRecommendationType[];
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  hrCalibrationOffset: 0,
  activeLimitations: [],
  preferredMethodology: 'uphill-athlete',
  objectiveNotes: {},
  suppressedRecommendationTypes: [],
};

export function getUserPreferences(): UserPreferences {
  return read<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_USER_PREFERENCES);
}

export function setUserPreferences(prefs: UserPreferences): void {
  write(STORAGE_KEYS.USER_PREFERENCES, prefs);
}

// ── User Zones ─────────────────────────────────────────────────────────────

export function getUserZones(): UserZones {
  return read<UserZones>(STORAGE_KEYS.USER_ZONES, DEFAULT_USER_ZONES);
}

export function setUserZones(zones: UserZones): void {
  write(STORAGE_KEYS.USER_ZONES, zones);
}

// ── Last Export Date ────────────────────────────────────────────────────────
// Device-local tracking only — not included in export payload.

export function getLastExportDate(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEYS.LAST_EXPORT_DATE);
}

export function setLastExportDate(isoDate: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.LAST_EXPORT_DATE, isoDate);
}

export function clearLastExportDate(): void {
  remove(STORAGE_KEYS.LAST_EXPORT_DATE);
}

// ── Benchmark Completion Log ───────────────────────────────────────────────
// Key format: `${objectiveId}.${benchmarkId}` (e.g. "alpine-traverse-5day.aerobic-capacity.loaded-aerobic-test")

export interface BenchmarkCompletion {
  completedDate: string; // ISO date string (YYYY-MM-DD)
  passed: boolean;
  notes?: string;
}

export type BenchmarkCompletionLog = Record<string, BenchmarkCompletion>;

export function getBenchmarkCompletionLog(): BenchmarkCompletionLog {
  return read<BenchmarkCompletionLog>(STORAGE_KEYS.BENCHMARK_COMPLETION_LOG, {});
}

export function setBenchmarkCompletionLog(log: BenchmarkCompletionLog): void {
  write(STORAGE_KEYS.BENCHMARK_COMPLETION_LOG, log);
}

export function upsertBenchmarkCompletion(
  objectiveId: string,
  benchmarkId: string,
  completion: BenchmarkCompletion
): void {
  const log = getBenchmarkCompletionLog();
  log[`${objectiveId}.${benchmarkId}`] = completion;
  setBenchmarkCompletionLog(log);
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
  // From objective training-plan-logic — set at activation time
  thresholdCapacityRequired?: boolean;
  thresholdIntroductionWeeksOut?: number;
  // From objective profile — set at activation time
  maxAltitudeFt?: number;
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
  cardio: CardioSession[];
  strength: StrengthSession[];
  climbing: ClimbingSession[];
  conditioning: ConditioningSession[];
}

export interface ZoneDistribution {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
}

export interface CardioSession {
  id: string;
  date: string;
  startTime: string;
  activityType: string;
  source: 'fit';
  duration: number;           // seconds
  distance: number;           // meters
  elevationGain: number;      // feet
  avgHR: number | null;
  maxHR: number | null;
  zoneDistribution: ZoneDistribution | null;
  trainingLoad: { score: number; classification: 'low' | 'moderate' | 'high' } | null;
  weightsUsed?: boolean;
  packWeight?: string;
  terrain?: string;
  perceivedEffort?: number;
  notes?: string;
}

export interface ZoneThresholds {
  z1: { low: number; high: number };
  z2: { low: number; high: number };
  z3: { low: number; high: number };
  z4: { low: number; high: number };
  z5: { low: number; high: number };
}

export interface UserZones {
  method: 'age-based' | 'maf' | 'custom';
  age: number | null;
  maxHR: number | null;
  mafNumber: number | null;
  customZones: ZoneThresholds | null;
  activeZones: ZoneThresholds;
  lastUpdated: string | null;
}

export const DEFAULT_USER_ZONES: UserZones = {
  method: 'age-based',
  age: null,
  maxHR: null,
  mafNumber: null,
  customZones: null,
  activeZones: {
    z1: { low: 0, high: 115 },
    z2: { low: 115, high: 140 },
    z3: { low: 140, high: 158 },
    z4: { low: 158, high: 175 },
    z5: { low: 175, high: 220 },
  },
  lastUpdated: null,
};

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

export interface CardioWeeklyTarget {
  direction: 'increase' | 'decrease' | 'hold';
  sessions: number;
  'primary-zone': 'z1-2' | 'z3' | 'z4-5';
  'session-duration-hours': number;
  note: string;
}

export interface StrengthWeeklyTarget {
  direction: 'increase' | 'decrease' | 'hold';
  sessions: number;
  'primary-focus': 'posterior-chain' | 'single-leg' | 'push' | 'pull' | 'core' | 'full-body';
  'rep-scheme': 'strength' | 'hypertrophy' | 'endurance';
  note: string;
}

export interface ClimbingWeeklyTarget {
  direction: 'increase' | 'decrease' | 'hold';
  sessions: number;
  'primary-focus': 'endurance' | 'power-endurance' | 'projecting' | 'conditioning' | 'rest';
  note: string;
}

export interface TrainingConfig {
  'generated-date': string;
  'expires-date': string;
  'fatigue-state': 'low' | 'moderate' | 'high' | 'rest';
  'cardio-priority': 'maintain' | 'build' | 'peak' | 'taper';
  'cardio-zone2-minimum-hours': number;
  'cardio-anaerobic-flag'?: 'none' | 'develop' | 'maintain' | 'reduce';
  'cardio-weekly-target'?: CardioWeeklyTarget;
  'strength-priority': 'maintain' | 'build' | 'peak' | 'deload';
  'posterior-chain-emphasis': 'low' | 'medium' | 'high';
  'single-leg-emphasis': 'low' | 'medium' | 'high';
  'push-emphasis': 'low' | 'medium' | 'high';
  'pull-emphasis': 'low' | 'medium' | 'high';
  'core-emphasis': 'low' | 'medium' | 'high';
  'strength-weekly-target'?: StrengthWeeklyTarget;
  'climbing-priority': 'maintain' | 'build' | 'peak' | 'rest';
  'climbing-frequency-max': number;
  'climbing-weekly-target'?: ClimbingWeeklyTarget;
  'conditioning-frequency': number;
  'loaded-carry-sessions': number;
  'loaded-carry-direction'?: 'increase' | 'decrease' | 'hold';
  'objective-proximity-flag': 'normal' | 'approaching' | 'taper' | 'peak-week';
  'override-reason': string;
}
