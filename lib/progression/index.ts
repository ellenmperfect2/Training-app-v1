// Hard-coded progressive overload detection and climbing grade trajectory logic.

import type { ProgressionHistory, StrengthSession, ClimbingSession } from '../storage';

export interface ProgressionFlag {
  exerciseId: string;
  exerciseName: string;
  message: string;
}

export interface ClimbingFlag {
  discipline: string;
  message: string;
}

// Update progression history after a strength session is saved
export function updateStrengthProgression(
  history: ProgressionHistory,
  session: StrengthSession
): ProgressionHistory {
  const updated = { ...history, byExercise: { ...history.byExercise } };

  for (const ex of session.exercises) {
    if (!updated.byExercise[ex.exerciseId]) {
      updated.byExercise[ex.exerciseId] = [];
    }
    updated.byExercise[ex.exerciseId] = [
      ...updated.byExercise[ex.exerciseId],
      { date: session.date, sets: ex.sets },
    ];
  }

  return updated;
}

// Update climbing grade history after a climbing session is saved
export function updateClimbingProgression(
  history: ProgressionHistory,
  session: ClimbingSession
): ProgressionHistory {
  const updated = { ...history, climbingGrades: { ...history.climbingGrades } };
  const discipline = session.sessionType;

  const sends = session.climbs
    .filter((c) => c.result === 'send')
    .map((c) => c.grade);

  if (sends.length === 0) return updated;

  const highest = getHighestGrade(discipline, sends);
  if (!highest) return updated;

  if (!updated.climbingGrades[discipline]) {
    updated.climbingGrades[discipline] = [];
  }

  updated.climbingGrades[discipline] = [
    ...updated.climbingGrades[discipline],
    { date: session.date, highestSend: highest },
  ];

  return updated;
}

// Check for progressive overload triggers per exercise
// Rule: beat all sets in two consecutive sessions → flag for weight increase
export function checkProgressionFlags(
  history: ProgressionHistory,
  exerciseLibrary: Array<{ id: string; name: string }>
): ProgressionFlag[] {
  const flags: ProgressionFlag[] = [];

  for (const [exerciseId, dataPoints] of Object.entries(history.byExercise)) {
    if (dataPoints.length < 2) continue;

    const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const lastBeatsAll = didBeatAllSets(last.sets, prev.sets);
    const prevBeatsAll = sorted.length >= 3
      ? didBeatAllSets(prev.sets, sorted[sorted.length - 3].sets)
      : false;

    if (lastBeatsAll && (prevBeatsAll || sorted.length === 2)) {
      const def = exerciseLibrary.find((e) => e.id === exerciseId);
      const name = def?.name ?? exerciseId;
      flags.push({
        exerciseId,
        exerciseName: name,
        message: `Consider increasing weight next ${name} session.`,
      });
    }
  }

  return flags;
}

function didBeatAllSets(
  current: Array<{ reps: number; weight: number }>,
  previous: Array<{ reps: number; weight: number }>
): boolean {
  if (current.length === 0 || previous.length === 0) return false;
  // Beat = matched or exceeded reps at same or greater weight in every set
  const minSets = Math.min(current.length, previous.length);
  for (let i = 0; i < minSets; i++) {
    const c = current[i];
    const p = previous[i];
    if (c.weight < p.weight) return false;
    if (c.weight === p.weight && c.reps <= p.reps) return false;
  }
  return true;
}

// Climbing grade trajectory: plateau flag if highest send flat for 4+ weeks
export function checkClimbingPlateauFlags(
  history: ProgressionHistory
): ClimbingFlag[] {
  const flags: ClimbingFlag[] = [];

  for (const [discipline, dataPoints] of Object.entries(history.climbingGrades)) {
    if (dataPoints.length < 2) continue;

    const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
    // Get data points from last 6 weeks
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const cutoff = sixWeeksAgo.toISOString().slice(0, 10);
    const recent = sorted.filter((p) => p.date >= cutoff);

    if (recent.length < 2) continue;

    const grades = recent.map((p) => p.highestSend);
    const first = grades[0];
    const allSame = grades.every((g) => g === first);

    // Check if flat for 4+ weeks
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeekCutoff = fourWeeksAgo.toISOString().slice(0, 10);
    const fourWeekData = sorted.filter((p) => p.date >= fourWeekCutoff);

    if (fourWeekData.length >= 2) {
      const fourWeekGrades = fourWeekData.map((p) => p.highestSend);
      if (fourWeekGrades.every((g) => g === fourWeekGrades[0])) {
        flags.push({
          discipline,
          message: `${formatDiscipline(discipline)} grade has been flat for 4+ weeks — plateau detected.`,
        });
      }
    }
  }

  return flags;
}

function formatDiscipline(discipline: string): string {
  return discipline
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Grade comparison helpers for V-scale (bouldering) and YDS
export function getHighestGrade(discipline: string, grades: string[]): string | null {
  if (grades.length === 0) return null;

  if (discipline === 'bouldering') {
    return grades.sort((a, b) => compareVGrade(b, a))[0];
  }
  return grades.sort((a, b) => compareYDS(b, a))[0];
}

function compareVGrade(a: string, b: string): number {
  const parseV = (g: string) => {
    const m = g.match(/^V(\d+)/i);
    return m ? parseInt(m[1]) : -1;
  };
  return parseV(a) - parseV(b);
}

function compareYDS(a: string, b: string): number {
  const ydsOrder = ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d',
    '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d',
    '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d',
    '5.15a', '5.15b', '5.15c', '5.15d'];
  return ydsOrder.indexOf(a) - ydsOrder.indexOf(b);
}

// Last session per exercise (for strength logger display)
export function getLastStrengthSession(
  history: ProgressionHistory,
  exerciseId: string
): Array<{ reps: number; weight: number; unit: string }> | null {
  const dataPoints = history.byExercise[exerciseId];
  if (!dataPoints || dataPoints.length === 0) return null;
  const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1].sets;
}
