// Validates an <objective-spec> XML block against objective-spec-schema.json.
// Returns { valid: true, spec } or { valid: false, errors: string[] }.

export interface ObjectiveSpec {
  meta: {
    id: string;
    name: string;
    type: string;
    version: string;
    generatedDate: string;
  };
  profile: {
    durationDays: number;
    dailyElevationGainFt: number;
    dailyMileage: number;
    maxAltitudeFt: number;
    packWeight: 'none' | 'light' | 'moderate' | 'heavy';
    activityType: string;
  };
  benchmarks: {
    aerobicCapacity: {
      sustainedOutputHours: number;
      zone2Percentage: number;
      loadedAerobicTest: {
        description: string;
        packWeight: string;
        durationHours: number;
        elevationGainFt: number;
        passingStandard: string;
      };
    };
    muscularEndurance: {
      loadedCarryTest: {
        description: string;
        packWeight: string;
        elevationGainFt: number;
        durationHours: number;
        passingStandard: string;
        missMeans: string;
      };
      descentDurabilityTest: {
        description: string;
        elevationLossFt: number;
        packWeight: string;
        passingStandard: string;
        missMeans: string;
      };
      backToBackTest: {
        day1Description: string;
        day2Description: string;
        passingStandard: string;
      };
    };
    cumulativeFatigue: {
      simulationBlock: {
        day1: string;
        day2: string;
        day3: string;
        passingStandard: string;
      };
    };
    readinessTiers: {
      ready: string;
      borderline: string;
      notReady: string;
    };
  };
  assessmentWorkouts: AssessmentWorkout[];
  trainingPlanLogic: {
    primaryStimulus: string;
    secondaryStimulus: string;
    tertiaryStimulus: string;
    reduceStimulus: string;
    keyWorkoutTypes: string[];
    taperWeeks: number;
    simulationBlockWeeksOut: number;
  };
}

export interface AssessmentWorkout {
  id: string;
  name: string;
  mapsToBenchmark: string;
  terrain: string;
  equipment: string;
  workout: string;
  track: string;
  passingStandard: string;
  missMeans: string;
}

const VALID_PACK_WEIGHTS = ['none', 'light', 'moderate', 'heavy'];
const VALID_BENCHMARK_PATHS = [
  'aerobic-capacity.loaded-aerobic-test',
  'muscular-endurance.loaded-carry-test',
  'muscular-endurance.descent-durability-test',
  'muscular-endurance.back-to-back-test',
  'cumulative-fatigue.simulation-block',
];
const MIN_ASSESSMENTS = 4;
const MAX_ASSESSMENTS = 6;

type ValidationResult =
  | { valid: true; spec: ObjectiveSpec }
  | { valid: false; errors: string[] };

export function parseObjectiveSpecXml(xmlString: string): ValidationResult {
  const errors: string[] = [];

  // Extract <objective-spec> block
  const match = xmlString.match(/<objective-spec>([\s\S]*?)<\/objective-spec>/);
  if (!match) {
    return { valid: false, errors: ['No <objective-spec> block found in input.'] };
  }
  const xml = match[1];

  function getTag(content: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const m = content.match(re);
    return m ? m[1].trim() : '';
  }

  function getTagContent(content: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const m = content.match(re);
    return m ? m[0] : '';
  }

  function requireText(content: string, tag: string, path: string): string {
    const val = getTag(content, tag);
    if (!val) errors.push(`Missing required field: ${path}`);
    return val;
  }

  function requireNumber(content: string, tag: string, path: string): number {
    const val = getTag(content, tag);
    const n = parseFloat(val);
    if (!val || isNaN(n)) errors.push(`Missing or invalid number: ${path}`);
    return isNaN(n) ? 0 : n;
  }

  function requireEnum(content: string, tag: string, path: string, values: string[]): string {
    const val = getTag(content, tag);
    if (!val || !values.includes(val)) {
      errors.push(`Invalid value for ${path}: "${val}". Must be one of: ${values.join(', ')}`);
    }
    return val;
  }

  // ── meta ────────────────────────────────────────────────────────────────
  const metaBlock = getTagContent(xml, 'meta');
  const id = requireText(metaBlock, 'id', 'meta.id');
  if (id && !/^[a-z0-9-]+$/.test(id)) {
    errors.push(`meta.id must be kebab-case. Got: "${id}"`);
  }
  const name = requireText(metaBlock, 'n', 'meta.n');
  const type = requireText(metaBlock, 'type', 'meta.type');
  const version = requireText(metaBlock, 'version', 'meta.version');
  const generatedDate = requireText(metaBlock, 'generated-date', 'meta.generated-date');

  // ── profile ─────────────────────────────────────────────────────────────
  const profileBlock = getTagContent(xml, 'profile');
  const durationDays = requireNumber(profileBlock, 'duration-days', 'profile.duration-days');
  const dailyElevationGainFt = requireNumber(profileBlock, 'daily-elevation-gain-ft', 'profile.daily-elevation-gain-ft');
  const dailyMileage = requireNumber(profileBlock, 'daily-mileage', 'profile.daily-mileage');
  const maxAltitudeFt = requireNumber(profileBlock, 'max-altitude-ft', 'profile.max-altitude-ft');
  const packWeight = requireEnum(profileBlock, 'pack-weight', 'profile.pack-weight', VALID_PACK_WEIGHTS) as ObjectiveSpec['profile']['packWeight'];
  const activityType = requireText(profileBlock, 'activity-type', 'profile.activity-type');

  // ── benchmarks ──────────────────────────────────────────────────────────
  const benchmarksBlock = getTagContent(xml, 'benchmarks');

  // aerobic-capacity
  const aerobicBlock = getTagContent(benchmarksBlock, 'aerobic-capacity');
  const sustainedOutputHours = requireNumber(aerobicBlock, 'sustained-output-hours', 'benchmarks.aerobic-capacity.sustained-output-hours');
  const zone2Percentage = requireNumber(aerobicBlock, 'zone2-percentage', 'benchmarks.aerobic-capacity.zone2-percentage');
  const latBlock = getTagContent(aerobicBlock, 'loaded-aerobic-test');
  const lat = {
    description: requireText(latBlock, 'description', 'benchmarks.aerobic-capacity.loaded-aerobic-test.description'),
    packWeight: requireText(latBlock, 'pack-weight', 'benchmarks.aerobic-capacity.loaded-aerobic-test.pack-weight'),
    durationHours: requireNumber(latBlock, 'duration-hours', 'benchmarks.aerobic-capacity.loaded-aerobic-test.duration-hours'),
    elevationGainFt: requireNumber(latBlock, 'elevation-gain-ft', 'benchmarks.aerobic-capacity.loaded-aerobic-test.elevation-gain-ft'),
    passingStandard: requireText(latBlock, 'passing-standard', 'benchmarks.aerobic-capacity.loaded-aerobic-test.passing-standard'),
  };

  // muscular-endurance
  const muscularBlock = getTagContent(benchmarksBlock, 'muscular-endurance');
  const lctBlock = getTagContent(muscularBlock, 'loaded-carry-test');
  const loadedCarryTest = {
    description: requireText(lctBlock, 'description', 'benchmarks.muscular-endurance.loaded-carry-test.description'),
    packWeight: requireText(lctBlock, 'pack-weight', 'benchmarks.muscular-endurance.loaded-carry-test.pack-weight'),
    elevationGainFt: requireNumber(lctBlock, 'elevation-gain-ft', 'benchmarks.muscular-endurance.loaded-carry-test.elevation-gain-ft'),
    durationHours: requireNumber(lctBlock, 'duration-hours', 'benchmarks.muscular-endurance.loaded-carry-test.duration-hours'),
    passingStandard: requireText(lctBlock, 'passing-standard', 'benchmarks.muscular-endurance.loaded-carry-test.passing-standard'),
    missMeans: requireText(lctBlock, 'miss-means', 'benchmarks.muscular-endurance.loaded-carry-test.miss-means'),
  };

  const ddtBlock = getTagContent(muscularBlock, 'descent-durability-test');
  const descentDurabilityTest = {
    description: requireText(ddtBlock, 'description', 'benchmarks.muscular-endurance.descent-durability-test.description'),
    elevationLossFt: requireNumber(ddtBlock, 'elevation-loss-ft', 'benchmarks.muscular-endurance.descent-durability-test.elevation-loss-ft'),
    packWeight: requireText(ddtBlock, 'pack-weight', 'benchmarks.muscular-endurance.descent-durability-test.pack-weight'),
    passingStandard: requireText(ddtBlock, 'passing-standard', 'benchmarks.muscular-endurance.descent-durability-test.passing-standard'),
    missMeans: requireText(ddtBlock, 'miss-means', 'benchmarks.muscular-endurance.descent-durability-test.miss-means'),
  };

  const b2bBlock = getTagContent(muscularBlock, 'back-to-back-test');
  const backToBackTest = {
    day1Description: requireText(b2bBlock, 'day1-description', 'benchmarks.muscular-endurance.back-to-back-test.day1-description'),
    day2Description: requireText(b2bBlock, 'day2-description', 'benchmarks.muscular-endurance.back-to-back-test.day2-description'),
    passingStandard: requireText(b2bBlock, 'passing-standard', 'benchmarks.muscular-endurance.back-to-back-test.passing-standard'),
  };

  // cumulative-fatigue
  const cfBlock = getTagContent(benchmarksBlock, 'cumulative-fatigue');
  const simBlock = getTagContent(cfBlock, 'simulation-block');
  const simulationBlock = {
    day1: requireText(simBlock, 'day1', 'benchmarks.cumulative-fatigue.simulation-block.day1'),
    day2: requireText(simBlock, 'day2', 'benchmarks.cumulative-fatigue.simulation-block.day2'),
    day3: requireText(simBlock, 'day3', 'benchmarks.cumulative-fatigue.simulation-block.day3'),
    passingStandard: requireText(simBlock, 'passing-standard', 'benchmarks.cumulative-fatigue.simulation-block.passing-standard'),
  };

  // readiness-tiers
  const tiersBlock = getTagContent(benchmarksBlock, 'readiness-tiers');
  const readinessTiers = {
    ready: requireText(tiersBlock, 'ready', 'benchmarks.readiness-tiers.ready'),
    borderline: requireText(tiersBlock, 'borderline', 'benchmarks.readiness-tiers.borderline'),
    notReady: requireText(tiersBlock, 'not-ready', 'benchmarks.readiness-tiers.not-ready'),
  };

  // ── assessment-workouts ─────────────────────────────────────────────────
  const awBlock = getTagContent(xml, 'assessment-workouts');
  const assessmentMatches = awBlock.match(/<assessment>([\s\S]*?)<\/assessment>/g) ?? [];

  if (assessmentMatches.length < MIN_ASSESSMENTS || assessmentMatches.length > MAX_ASSESSMENTS) {
    errors.push(
      `assessment-workouts must have ${MIN_ASSESSMENTS}–${MAX_ASSESSMENTS} assessments. Got ${assessmentMatches.length}.`
    );
  }

  const seenAssessmentIds = new Set<string>();
  const assessmentWorkouts: AssessmentWorkout[] = assessmentMatches.map((block, i) => {
    const aId = requireText(block, 'id', `assessment-workouts.assessment[${i}].id`);
    if (aId && !/^[a-z0-9-]+$/.test(aId)) {
      errors.push(`assessment id must be kebab-case. Got: "${aId}"`);
    }
    if (aId && seenAssessmentIds.has(aId)) {
      errors.push(`Duplicate assessment id: "${aId}"`);
    }
    if (aId) seenAssessmentIds.add(aId);

    const mapsToBenchmark = requireText(block, 'maps-to-benchmark', `assessment-workouts.assessment[${i}].maps-to-benchmark`);
    if (mapsToBenchmark && !VALID_BENCHMARK_PATHS.includes(mapsToBenchmark)) {
      errors.push(
        `Invalid maps-to-benchmark: "${mapsToBenchmark}". Must be one of: ${VALID_BENCHMARK_PATHS.join(', ')}`
      );
    }

    return {
      id: aId,
      name: requireText(block, 'n', `assessment-workouts.assessment[${i}].n`),
      mapsToBenchmark,
      terrain: requireText(block, 'terrain', `assessment-workouts.assessment[${i}].terrain`),
      equipment: requireText(block, 'equipment', `assessment-workouts.assessment[${i}].equipment`),
      workout: requireText(block, 'workout', `assessment-workouts.assessment[${i}].workout`),
      track: requireText(block, 'track', `assessment-workouts.assessment[${i}].track`),
      passingStandard: requireText(block, 'passing-standard', `assessment-workouts.assessment[${i}].passing-standard`),
      missMeans: requireText(block, 'miss-means', `assessment-workouts.assessment[${i}].miss-means`),
    };
  });

  // ── training-plan-logic ─────────────────────────────────────────────────
  const tplBlock = getTagContent(xml, 'training-plan-logic');
  const kwBlock = getTagContent(tplBlock, 'key-workout-types');
  const keyWorkoutTypes = (kwBlock.match(/<type>([\s\S]*?)<\/type>/g) ?? []).map((t) =>
    t.replace(/<\/?type>/g, '').trim()
  );

  const trainingPlanLogic = {
    primaryStimulus: requireText(tplBlock, 'primary-stimulus', 'training-plan-logic.primary-stimulus'),
    secondaryStimulus: requireText(tplBlock, 'secondary-stimulus', 'training-plan-logic.secondary-stimulus'),
    tertiaryStimulus: requireText(tplBlock, 'tertiary-stimulus', 'training-plan-logic.tertiary-stimulus'),
    reduceStimulus: requireText(tplBlock, 'reduce-stimulus', 'training-plan-logic.reduce-stimulus'),
    keyWorkoutTypes,
    taperWeeks: requireNumber(tplBlock, 'taper-weeks', 'training-plan-logic.taper-weeks'),
    simulationBlockWeeksOut: requireNumber(tplBlock, 'simulation-block-weeks-out', 'training-plan-logic.simulation-block-weeks-out'),
  };

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const spec: ObjectiveSpec = {
    meta: { id, name, type, version, generatedDate },
    profile: { durationDays, dailyElevationGainFt, dailyMileage, maxAltitudeFt, packWeight, activityType },
    benchmarks: {
      aerobicCapacity: { sustainedOutputHours, zone2Percentage, loadedAerobicTest: lat },
      muscularEndurance: { loadedCarryTest, descentDurabilityTest, backToBackTest },
      cumulativeFatigue: { simulationBlock },
      readinessTiers,
    },
    assessmentWorkouts,
    trainingPlanLogic,
  };

  return { valid: true, spec };
}

export function checkIdCollision(
  specId: string,
  existingLibrary: Array<{ id: string }>
): boolean {
  return existingLibrary.some((entry) => entry.id === specId);
}
