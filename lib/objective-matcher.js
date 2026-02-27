// lib/objective-matcher.js
// ADD OBJECTIVE MATCHER command — do not modify via any other command type.
//
// Exports a single function getContributingObjectives(workoutEntry) that
// returns an array of objective contribution matches for a given workout
// log entry. Called at read time by the activity log UI only.
//
// Read sources: activeObjectives localStorage, objective-library.json,
//   exercise-library.json (for muscle group lookups), workoutLog (caller-supplied).
//
// Never writes to localStorage. Never modifies workoutLog entries.
// Never imports from /lib/recommendation, /lib/recovery, /lib/fit-parser.ts,
// or /lib/zones.ts.

import objectiveLibrary from '../data/objective-library.json';
import exerciseLibraryData from '../data/exercise-library.json';

// ── Constants ────────────────────────────────────────────────────────────────

const MOUNTAIN_CARDIO_TYPES = new Set([
  'Hike',
  'MountainHike',
  'BackcountrySkiing',
  'Snowshoeing',
  'OutdoorRun',
  'Skiing',
  'GeneralCardio',
]);

const MOUNTAIN_OBJECTIVE_TYPES = new Set([
  'mountain',
  'alpine',
  'alpine-hiking',
  'hiking',
  'ski-touring',
  'outdoor-endurance',
  'running',
  'trail-running',
  'backpacking',
]);

// packWeight is now stored as a number (lbs). Non-zero = any value > 0.
// PACK_WEIGHT_SIGNIFICANT maps to the objective profile's string enum (unchanged).
const PACK_WEIGHT_SIGNIFICANT = new Set(['moderate', 'heavy']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function stimulusContains(value, keyword) {
  if (!value) return false;
  return value.toLowerCase().includes(keyword.toLowerCase());
}

function objectiveStimuliContain(logic, keyword) {
  return (
    stimulusContains(logic?.primaryStimulus, keyword) ||
    stimulusContains(logic?.secondaryStimulus, keyword) ||
    stimulusContains(logic?.tertiaryStimulus, keyword)
  );
}

function getLibraryEntry(libraryId) {
  return objectiveLibrary.find((e) => e.id === libraryId) ?? null;
}

function getExerciseById(exerciseId) {
  return exerciseLibraryData.exercises.find((e) => e.id === exerciseId) ?? null;
}

// Adds an entry to matches only if no entry already exists with the same
// objectiveId + domain combination.
function addMatchIfNotPresent(matches, entry) {
  const exists = matches.some(
    (m) => m.objectiveId === entry.objectiveId && m.domain === entry.domain,
  );
  if (!exists) matches.push(entry);
}

// ── Session type detection ────────────────────────────────────────────────────

function isCardioSession(entry) {
  return entry.source === 'fit';
}

function isStrengthSession(entry) {
  return Array.isArray(entry.exercises);
}

function isClimbingSession(entry) {
  return Array.isArray(entry.climbs);
}

function isConditioningSession(entry) {
  return Array.isArray(entry.pullupSets);
}

// ── Per-session match logic ───────────────────────────────────────────────────

function matchCardio(session, objective, libraryEntry, matches) {
  const logic = libraryEntry?.trainingPlanLogic;
  const profile = libraryEntry?.profile;
  if (!logic || !profile) return;

  const actType = session.activityType ?? '';
  const packWeightLbs = session.packWeight ?? 0; // numeric lbs
  const elevationGain = session.elevationGain ?? 0; // in feet (CardioSession.elevationGain)

  // Rule 1: Mountain/hiking/running activity type AND objective is mountain/alpine/
  // ski-touring/outdoor endurance → aerobic domain match.
  if (
    MOUNTAIN_CARDIO_TYPES.has(actType) &&
    MOUNTAIN_OBJECTIVE_TYPES.has((profile.activityType ?? '').toLowerCase())
  ) {
    const isPrimary =
      stimulusContains(logic.primaryStimulus, 'aerobic') ||
      stimulusContains(logic.primaryStimulus, 'endurance');
    addMatchIfNotPresent(matches, {
      objectiveId: objective.id,
      objectiveName: objective.name,
      domain: 'aerobic',
      strength: isPrimary ? 'primary' : 'contributing',
    });
  }

  // Rule 2: Pack weight present and non-zero AND objective profile pack weight is
  // moderate or heavy → loaded-carry domain match.
  if (
    packWeightLbs > 0 &&
    PACK_WEIGHT_SIGNIFICANT.has(profile.packWeight ?? '')
  ) {
    addMatchIfNotPresent(matches, {
      objectiveId: objective.id,
      objectiveName: objective.name,
      domain: 'loaded-carry',
      strength: 'contributing',
    });
  }

  // Rule 3: Elevation gain > 1000ft AND objective has a daily elevation gain
  // benchmark → aerobic domain match (if not already matched by Rule 1).
  if (
    elevationGain > 1000 &&
    profile.dailyElevationGainFt != null
  ) {
    addMatchIfNotPresent(matches, {
      objectiveId: objective.id,
      objectiveName: objective.name,
      domain: 'aerobic',
      strength: 'contributing',
    });
  }

  // Cross-domain rule: loaded hike (packWeight non-zero AND elevationGain > 500ft)
  // also contributes toward the loaded-carry benchmark for any objective with a
  // loaded carry benchmark, regardless of activity type label.
  if (
    packWeightLbs > 0 &&
    elevationGain > 500 &&
    PACK_WEIGHT_SIGNIFICANT.has(profile.packWeight ?? '')
  ) {
    addMatchIfNotPresent(matches, {
      objectiveId: objective.id,
      objectiveName: objective.name,
      domain: 'loaded-carry',
      strength: 'contributing',
    });
  }
}

function matchStrength(session, objective, libraryEntry, matches) {
  const logic = libraryEntry?.trainingPlanLogic;
  if (!logic) return;

  const hasStrengthInPrimary = stimulusContains(logic.primaryStimulus, 'strength');
  const hasStrengthInSecondary = stimulusContains(logic.secondaryStimulus, 'strength');
  if (!hasStrengthInPrimary && !hasStrengthInSecondary) return;

  // Inspect exercises to determine which muscle groups were worked.
  const sessionMuscleGroups = new Set();
  let hasSingleLeg = false;
  for (const ex of session.exercises ?? []) {
    const def = getExerciseById(ex.exerciseId);
    if (!def) continue;
    sessionMuscleGroups.add(def.primaryMuscleGroup);
    (def.secondaryMuscleGroups ?? []).forEach((g) => sessionMuscleGroups.add(g));
    if (def.singleLeg) hasSingleLeg = true;
  }

  // Rule 1: Session includes posterior chain / single-leg / core AND objective's
  // training plan logic lists these as primary or secondary stimulus → primary match.
  const logicWantsPosteriorOrSingleLeg =
    stimulusContains(logic.primaryStimulus, 'posterior') ||
    stimulusContains(logic.primaryStimulus, 'single-leg') ||
    stimulusContains(logic.secondaryStimulus, 'posterior') ||
    stimulusContains(logic.secondaryStimulus, 'single-leg');

  const logicWantsCore =
    stimulusContains(logic.primaryStimulus, 'core') ||
    stimulusContains(logic.secondaryStimulus, 'core');

  const sessionHasPosteriorOrSingleLeg =
    sessionMuscleGroups.has('posterior-chain') || hasSingleLeg;
  const sessionHasCore = sessionMuscleGroups.has('core');

  const directMuscleMatch =
    (sessionHasPosteriorOrSingleLeg && logicWantsPosteriorOrSingleLeg) ||
    (sessionHasCore && logicWantsCore);

  // Primary if: muscle groups directly match AND strength appears in primaryStimulus,
  // OR primaryStimulus explicitly names the matched muscle group.
  const isPrimary =
    directMuscleMatch &&
    (hasStrengthInPrimary ||
      stimulusContains(logic.primaryStimulus, 'posterior') ||
      stimulusContains(logic.primaryStimulus, 'single-leg') ||
      stimulusContains(logic.primaryStimulus, 'core'));

  // Rule 2: Any strength session contributes to objectives where primary or
  // secondary stimulus is strength (covered by guard at top of function).
  addMatchIfNotPresent(matches, {
    objectiveId: objective.id,
    objectiveName: objective.name,
    domain: 'strength',
    strength: isPrimary ? 'primary' : 'contributing',
  });
}

function matchClimbing(session, objective, libraryEntry, matches) {
  const logic = libraryEntry?.trainingPlanLogic;
  if (!logic) return;

  const hasClimbingStimulus =
    objectiveStimuliContain(logic, 'climbing') ||
    objectiveStimuliContain(logic, 'forearm') ||
    objectiveStimuliContain(logic, 'grip');

  if (!hasClimbingStimulus) return;

  // Endurance/power-endurance focus maps more strongly to mountain objectives
  // than projecting. Use sessionType as proxy:
  //   top-rope, lead, outdoor-* → endurance-leaning
  //   bouldering → projecting
  const isEnduranceFocus = session.sessionType !== 'bouldering';
  const isClimbingPrimary = stimulusContains(logic.primaryStimulus, 'climbing');

  addMatchIfNotPresent(matches, {
    objectiveId: objective.id,
    objectiveName: objective.name,
    domain: 'climbing',
    strength: isClimbingPrimary && isEnduranceFocus ? 'primary' : 'contributing',
  });
}

function matchConditioning(session, objective, libraryEntry, matches) {
  const logic = libraryEntry?.trainingPlanLogic;
  if (!logic) return;

  const hasConditioningStimulus =
    objectiveStimuliContain(logic, 'conditioning') ||
    objectiveStimuliContain(logic, 'threshold');

  if (!hasConditioningStimulus) return;

  addMatchIfNotPresent(matches, {
    objectiveId: objective.id,
    objectiveName: objective.name,
    domain: 'conditioning',
    strength: stimulusContains(logic.primaryStimulus, 'conditioning')
      ? 'primary'
      : 'contributing',
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Given a single workout log entry, returns an array of active objectives
 * that the session contributed meaningful progress toward.
 *
 * @param {object} workoutEntry - A CardioSession, StrengthSession,
 *   ClimbingSession, or ConditioningSession from workoutLog.
 * @returns {{ objectiveId: string, objectiveName: string,
 *   domain: 'aerobic'|'strength'|'climbing'|'loaded-carry'|'conditioning',
 *   strength: 'primary'|'contributing' }[]}
 *   Returns empty array if no active objectives match.
 *   Never throws — catches all errors and returns [].
 */
export function getContributingObjectives(workoutEntry) {
  try {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem('activeObjectives');
    if (!raw) return [];

    const activeObjectives = JSON.parse(raw);
    if (!Array.isArray(activeObjectives) || activeObjectives.length === 0) return [];

    const matches = [];

    for (const objective of activeObjectives) {
      const libraryEntry = getLibraryEntry(objective.libraryId);
      if (!libraryEntry) continue;

      if (isCardioSession(workoutEntry)) {
        matchCardio(workoutEntry, objective, libraryEntry, matches);
      } else if (isStrengthSession(workoutEntry)) {
        matchStrength(workoutEntry, objective, libraryEntry, matches);
      } else if (isClimbingSession(workoutEntry)) {
        matchClimbing(workoutEntry, objective, libraryEntry, matches);
      } else if (isConditioningSession(workoutEntry)) {
        matchConditioning(workoutEntry, objective, libraryEntry, matches);
      }
    }

    return matches;
  } catch (err) {
    console.warn('[objective-matcher] getContributingObjectives failed:', err);
    return [];
  }
}
