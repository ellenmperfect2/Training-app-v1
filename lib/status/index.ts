// Hard-coded status logic: volume tracking, benchmark detection,
// objective timeline, progressive overload, climbing grade trajectory,
// conditioning consistency.

import type {
  WorkoutLog,
  ActivatedObjective,
  ClimbingSession,
  StrengthSession,
} from '../storage';
import { checkProgressionFlags, checkClimbingPlateauFlags } from '../progression';
import exerciseLibrary from '../../data/exercise-library.json';

export type TrafficLight = 'green' | 'yellow' | 'red';

// ── Training Volume Tracking ───────────────────────────────────────────────

export interface VolumeStatus {
  cardio: TrafficLight;
  strength: TrafficLight;
  climbing: TrafficLight;
  cardioMinutesThisWeek: number;
  strengthSessionsThisWeek: number;
  climbingSessionsThisWeek: number;
}

export function getVolumeStatus(
  log: WorkoutLog,
  startDate: string,
  endDate: string,
  targets: {
    cardioMinutesTarget: number;
    strengthSessionsTarget: number;
    climbingSessionsTarget: number;
  }
): VolumeStatus {
  const cardioMinutes = log.cardio
    .filter((s) => s.date >= startDate && s.date <= endDate)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const strengthSessions = log.strength.filter(
    (s) => s.date >= startDate && s.date <= endDate
  ).length;

  const climbingSessions = log.climbing.filter(
    (s) => s.date >= startDate && s.date <= endDate
  ).length;

  const toLight = (actual: number, target: number): TrafficLight => {
    const pct = target > 0 ? actual / target : 1;
    if (pct >= 0.85) return 'green';
    if (pct >= 0.5) return 'yellow';
    return 'red';
  };

  return {
    cardio: toLight(cardioMinutes, targets.cardioMinutesTarget),
    strength: toLight(strengthSessions, targets.strengthSessionsTarget),
    climbing: toLight(climbingSessions, targets.climbingSessionsTarget),
    cardioMinutesThisWeek: Math.round(cardioMinutes),
    strengthSessionsThisWeek: strengthSessions,
    climbingSessionsThisWeek: climbingSessions,
  };
}

// ── Benchmark Progress Detection ───────────────────────────────────────────

export interface BenchmarkMatchSuggestion {
  assessmentId: string;
  assessmentName: string;
  objectiveId: string;
  message: string;
}

// Simplified detection: checks if a session's duration/elevation matches
// the loaded-aerobic-test or loaded-carry-test passing thresholds.
// Returns suggestions to prompt the user to mark an assessment complete.
export function detectBenchmarkMatches(
  session: WorkoutLog['cardio'][0],
  activeObjectives: ActivatedObjective[],
  assessmentLibrary: Array<{
    objectiveId: string;
    assessments: Array<{
      id: string;
      name: string;
      mapsToBenchmark: string;
      passingStandard: string;
    }>;
  }>
): BenchmarkMatchSuggestion[] {
  const suggestions: BenchmarkMatchSuggestion[] = [];

  for (const obj of activeObjectives) {
    const assessments = assessmentLibrary.find((a) => a.objectiveId === obj.libraryId);
    if (!assessments) continue;

    const pending = assessments.assessments.filter(
      (a) =>
        !obj.assessmentResults.find((r) => r.assessmentId === a.id && r.result !== null)
    );

    for (const assessment of pending) {
      if (
        assessment.mapsToBenchmark === 'aerobic-capacity.loaded-aerobic-test' ||
        assessment.mapsToBenchmark === 'muscular-endurance.loaded-carry-test'
      ) {
        // Heuristic: long cardio session with elevation = potential match
        if (
          session.durationMinutes >= 90 &&
          session.elevationGainM > 300 &&
          session.annotation.packWeight &&
          session.annotation.packWeight !== 'none'
        ) {
          suggestions.push({
            assessmentId: assessment.id,
            assessmentName: assessment.name,
            objectiveId: obj.id,
            message: `This looks like your "${assessment.name}" assessment — mark complete?`,
          });
        }
      }
    }
  }

  return suggestions;
}

// ── Objective Timeline Status ──────────────────────────────────────────────

export type TimelineStatus = 'on-track' | 'behind' | 'ahead';

export function getObjectiveTimelineStatus(objective: ActivatedObjective): TimelineStatus {
  const activated = new Date(objective.activatedDate);
  const target = new Date(objective.targetDate);
  const now = new Date();

  const totalWeeks =
    (target.getTime() - activated.getTime()) / (1000 * 60 * 60 * 24 * 7);
  const elapsedWeeks = (now.getTime() - activated.getTime()) / (1000 * 60 * 60 * 24 * 7);

  if (totalWeeks <= 0) return 'on-track';

  const expectedCompletedWeeks = Math.floor(elapsedWeeks);
  const completedWeeks = objective.trainingPlan.filter((w) => w.completed).length;

  const diff = completedWeeks - expectedCompletedWeeks;
  if (diff >= 0) return 'on-track';
  if (diff === -1) return 'behind';
  return 'behind';
}

// ── Conditioning Consistency ───────────────────────────────────────────────

export interface ConditioningStatus {
  sessionsThisWeek: number;
  targetSessions: number;
  onTrack: boolean;
}

export function getConditioningStatus(
  log: WorkoutLog,
  startDate: string,
  endDate: string,
  targetSessions: number
): ConditioningStatus {
  const sessionsThisWeek = log.conditioning.filter(
    (s) => s.date >= startDate && s.date <= endDate
  ).length;

  return {
    sessionsThisWeek,
    targetSessions,
    onTrack: sessionsThisWeek >= targetSessions,
  };
}

// ── All Status Flags (aggregated) ─────────────────────────────────────────

export interface StatusLayer {
  volumeStatus: VolumeStatus;
  progressionFlags: ReturnType<typeof checkProgressionFlags>;
  climbingFlags: ReturnType<typeof checkClimbingPlateauFlags>;
  conditioningStatus: ConditioningStatus;
  objectiveStatuses: Array<{
    objectiveId: string;
    objectiveName: string;
    timelineStatus: TimelineStatus;
  }>;
}

export function computeStatusLayer(
  log: WorkoutLog,
  progressionHistory: import('../storage').ProgressionHistory,
  activeObjectives: ActivatedObjective[],
  weekStart: string,
  weekEnd: string,
  conditioningTarget: number,
  volumeTargets: {
    cardioMinutesTarget: number;
    strengthSessionsTarget: number;
    climbingSessionsTarget: number;
  }
): StatusLayer {
  return {
    volumeStatus: getVolumeStatus(log, weekStart, weekEnd, volumeTargets),
    progressionFlags: checkProgressionFlags(progressionHistory, exerciseLibrary.exercises),
    climbingFlags: checkClimbingPlateauFlags(progressionHistory),
    conditioningStatus: getConditioningStatus(log, weekStart, weekEnd, conditioningTarget),
    objectiveStatuses: activeObjectives.map((obj) => ({
      objectiveId: obj.id,
      objectiveName: obj.name,
      timelineStatus: getObjectiveTimelineStatus(obj),
    })),
  };
}
