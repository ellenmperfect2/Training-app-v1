// Generates copy-ready prompts for Claude.ai paste workflows.
// No API calls. Output is text the user copies into Summit Coach project.

import type {
  DailyCheckIn,
  WorkoutLog,
  ActivatedObjective,
  TrainingConfig,
  PersonalBaseline,
} from '../storage';

// ── Weekly Analysis Prompt ─────────────────────────────────────────────────

export function generateWeeklyAnalysisPrompt(params: {
  checkIns: DailyCheckIn[];
  workoutLog: WorkoutLog;
  activeObjectives: ActivatedObjective[];
  activeConfig: TrainingConfig | null;
  baseline: PersonalBaseline;
  today: string;
}): string {
  const { checkIns, workoutLog, activeObjectives, activeConfig, baseline, today } = params;

  const last7Days = getLast7DaysCheckIns(checkIns, today);
  const last4Weeks = getLast4WeeksWorkouts(workoutLog, today);

  const sections: string[] = [
    'TRAINING ANALYSIS:',
    '',
    `Date: ${today}`,
    '',
    '## PERSONAL BASELINES',
    formatBaseline(baseline),
    '',
    '## LAST 7 DAYS — DAILY CHECK-INS',
    formatCheckIns(last7Days),
    '',
    '## LAST 4 WEEKS — CARDIO',
    formatCardioLog(last4Weeks.cardio),
    '',
    '## LAST 4 WEEKS — STRENGTH',
    formatStrengthLog(last4Weeks.strength),
    '',
    '## LAST 4 WEEKS — CLIMBING',
    formatClimbingLog(last4Weeks.climbing),
    '',
    '## LAST 4 WEEKS — CONDITIONING',
    formatConditioningLog(last4Weeks.conditioning),
    '',
    '## ACTIVE OBJECTIVES',
    formatActiveObjectives(activeObjectives, today),
    '',
    '## CURRENT TRAINING CONFIG',
    formatCurrentConfig(activeConfig),
    '',
    '## OUTPUT FORMAT CONTRACT',
    'Respond with:',
    '1. 200-400 word plain language analysis',
    '2. A complete <training-config> block with every required field.',
    '   No fields may be omitted. No fields may be added.',
    '   override-reason must cite specific data observations.',
  ];

  return sections.join('\n');
}

function formatBaseline(baseline: PersonalBaseline): string {
  const hrv = baseline.hrv30DayAverage ?? baseline.manualHrv;
  const rhr = baseline.restingHR30DayAverage ?? baseline.manualRestingHR;
  if (!hrv && !rhr) return 'No baseline established yet (< 14 days of data).';
  return [
    `HRV 30-day average: ${hrv ? `${hrv}ms` : 'not yet established'}`,
    `Resting HR 30-day average: ${rhr ? `${rhr}bpm` : 'not yet established'}`,
    `Baseline established: ${baseline.baselineEstablished ? 'Yes' : 'No (< 14 days)'}`,
  ].join('\n');
}

function formatCheckIns(checkIns: DailyCheckIn[]): string {
  if (checkIns.length === 0) return 'No check-in data.';

  return checkIns
    .map((c) => {
      const flags = c.flags.length > 0 ? ` | Flags: ${c.flags.join(', ')}` : '';
      const hrRange =
        c.recovery.hrRangeLow !== null && c.recovery.hrRangeHigh !== null
          ? `${c.recovery.hrRangeLow}–${c.recovery.hrRangeHigh}`
          : 'N/A';
      return [
        `${c.date}`,
        `  Sleep: ${c.sleep.quality} · ${c.sleep.hours}hrs`,
        `  HRV: ${c.recovery.hrv ?? 'N/A'}ms | RHR: ${c.recovery.restingHR ?? 'N/A'}bpm | HR range: ${hrRange}bpm`,
        `  Legs: ${c.subjectiveFeel.legs}/5 · Energy: ${c.subjectiveFeel.energy}/5 · Motivation: ${c.subjectiveFeel.motivation}/5${flags}`,
        c.notes ? `  Notes: ${c.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}

function formatCardioLog(sessions: WorkoutLog['cardio']): string {
  if (sessions.length === 0) return 'No cardio sessions.';

  return sessions
    .map((s) => {
      const elevFt = Math.round(s.elevationGainM * 3.281);
      const hrs = (s.durationMinutes / 60).toFixed(1);
      const pack = s.annotation.packWeight ? ` pack:${s.annotation.packWeight}` : '';
      return `${s.date} ${s.corosType} ${hrs}hr ${elevFt}ft gain avgHR:${s.avgHR ?? 'N/A'}${pack}`;
    })
    .join('\n');
}

function formatStrengthLog(sessions: WorkoutLog['strength']): string {
  if (sessions.length === 0) return 'No strength sessions.';

  return sessions
    .map((s) => {
      const exercises = s.exercises
        .map((e) => {
          const sets = e.sets.map((set) => `${set.reps}@${set.weight}${set.unit}`).join(', ');
          return `${e.exerciseId}: ${sets}`;
        })
        .join(' | ');
      return `${s.date}: ${exercises}`;
    })
    .join('\n');
}

function formatClimbingLog(sessions: WorkoutLog['climbing']): string {
  if (sessions.length === 0) return 'No climbing sessions.';

  return sessions
    .map((s) => {
      const sends = s.climbs.filter((c) => c.result === 'send').map((c) => c.grade);
      const attempts = s.climbs.filter((c) => c.result === 'attempt').map((c) => c.grade);
      return `${s.date} ${s.sessionType} sends:${sends.join(',') || 'none'} attempts:${attempts.join(',') || 'none'}`;
    })
    .join('\n');
}

function formatConditioningLog(sessions: WorkoutLog['conditioning']): string {
  if (sessions.length === 0) return 'No conditioning sessions.';

  return sessions
    .map((s) => {
      const parts: string[] = [];
      if (s.pullupSets.length > 0) {
        parts.push(`pullups: ${s.pullupSets.map((p) => `${p.reps}reps`).join(', ')}`);
      }
      if (s.deadhangSets.length > 0) {
        parts.push(`deadhangs: ${s.deadhangSets.map((d) => `${d.hangSeconds}s`).join(', ')}`);
      }
      if (s.hangboardSets.length > 0) {
        parts.push(`hangboard: ${s.hangboardSets.length} sets`);
      }
      return `${s.date}: ${parts.join(' | ')}`;
    })
    .join('\n');
}

function formatActiveObjectives(objectives: ActivatedObjective[], today: string): string {
  if (objectives.length === 0) return 'No active objectives — Baseline Mode.';

  return objectives
    .map((obj) => {
      const weeksOut = Math.round(
        (new Date(obj.targetDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24 * 7)
      );
      return `${obj.name} (${obj.type}) — priority weight: ${obj.priorityWeight} — ${weeksOut} weeks out — phase: ${obj.currentPhase}`;
    })
    .join('\n');
}

function formatCurrentConfig(config: TrainingConfig | null): string {
  if (!config || config['generated-date'] === 'default') return 'No active config — using defaults.';

  return [
    `Generated: ${config['generated-date']} | Expires: ${config['expires-date']}`,
    `Fatigue: ${config['fatigue-state']} | Cardio: ${config['cardio-priority']} | Strength: ${config['strength-priority']} | Climbing: ${config['climbing-priority']}`,
    `Emphasis — posterior:${config['posterior-chain-emphasis']} single-leg:${config['single-leg-emphasis']} push:${config['push-emphasis']} pull:${config['pull-emphasis']} core:${config['core-emphasis']}`,
    `Override reason: ${config['override-reason']}`,
  ].join('\n');
}

// ── Objective Spec Prompt ──────────────────────────────────────────────────

export function generateObjectiveSpecPrompt(params: {
  objectiveDescription: string;
  today: string;
}): string {
  const { objectiveDescription, today } = params;

  return [
    'OBJECTIVE BUILD:',
    '',
    objectiveDescription,
    '',
    `Today's date: ${today}`,
    '',
    '## REQUIRED OUTPUT FORMAT',
    'Respond with:',
    '1. 300-500 word plain language coaching brief',
    '2. A complete <objective-spec> XML block with every required field.',
    '   Schema:',
    '',
    '<objective-spec>',
    '  <meta>',
    '    <id>kebab-case-unique-id</id>',
    '    <n>Human Readable Name</n>',
    '    <type>activity-category</type>',
    '    <version>1.0</version>',
    `    <generated-date>${today}</generated-date>`,
    '  </meta>',
    '  <profile>',
    '    <duration-days>number</duration-days>',
    '    <daily-elevation-gain-ft>number</daily-elevation-gain-ft>',
    '    <daily-mileage>number</daily-mileage>',
    '    <max-altitude-ft>number</max-altitude-ft>',
    '    <pack-weight>none|light|moderate|heavy</pack-weight>',
    '    <activity-type>string</activity-type>',
    '  </profile>',
    '  <benchmarks>',
    '    <aerobic-capacity>',
    '      <sustained-output-hours>number</sustained-output-hours>',
    '      <zone2-percentage>number</zone2-percentage>',
    '      <loaded-aerobic-test>',
    '        <description>plain language</description>',
    '        <pack-weight>string</pack-weight>',
    '        <duration-hours>number</duration-hours>',
    '        <elevation-gain-ft>number</elevation-gain-ft>',
    '        <passing-standard>plain language</passing-standard>',
    '      </loaded-aerobic-test>',
    '    </aerobic-capacity>',
    '    <muscular-endurance>',
    '      <loaded-carry-test>',
    '        <description>plain language</description>',
    '        <pack-weight>string</pack-weight>',
    '        <elevation-gain-ft>number</elevation-gain-ft>',
    '        <duration-hours>number</duration-hours>',
    '        <passing-standard>plain language</passing-standard>',
    '        <miss-means>plain language</miss-means>',
    '      </loaded-carry-test>',
    '      <descent-durability-test>',
    '        <description>plain language</description>',
    '        <elevation-loss-ft>number</elevation-loss-ft>',
    '        <pack-weight>string</pack-weight>',
    '        <passing-standard>plain language</passing-standard>',
    '        <miss-means>plain language</miss-means>',
    '      </descent-durability-test>',
    '      <back-to-back-test>',
    '        <day1-description>plain language</day1-description>',
    '        <day2-description>plain language</day2-description>',
    '        <passing-standard>plain language</passing-standard>',
    '      </back-to-back-test>',
    '    </muscular-endurance>',
    '    <cumulative-fatigue>',
    '      <simulation-block>',
    '        <day1>plain language</day1>',
    '        <day2>plain language</day2>',
    '        <day3>plain language</day3>',
    '        <passing-standard>plain language observable criteria</passing-standard>',
    '      </simulation-block>',
    '    </cumulative-fatigue>',
    '    <readiness-tiers>',
    '      <ready>plain language</ready>',
    '      <borderline>plain language including specific risk</borderline>',
    '      <not-ready>plain language including honest risk statement</not-ready>',
    '    </readiness-tiers>',
    '  </benchmarks>',
    '  <assessment-workouts>',
    '    <!-- 4-6 assessments -->',
    '    <assessment>',
    '      <id>kebab-case-id</id>',
    '      <n>Assessment Name</n>',
    '      <maps-to-benchmark>dot.notation.path</maps-to-benchmark>',
    '      <terrain>string</terrain>',
    '      <equipment>string</equipment>',
    '      <workout>precise description</workout>',
    '      <track>what to observe and record</track>',
    '      <passing-standard>plain language</passing-standard>',
    '      <miss-means>plain language</miss-means>',
    '    </assessment>',
    '  </assessment-workouts>',
    '  <training-plan-logic>',
    '    <primary-stimulus>string</primary-stimulus>',
    '    <secondary-stimulus>string</secondary-stimulus>',
    '    <tertiary-stimulus>string</tertiary-stimulus>',
    '    <reduce-stimulus>string</reduce-stimulus>',
    '    <key-workout-types>',
    '      <type>string</type>',
    '    </key-workout-types>',
    '    <taper-weeks>number</taper-weeks>',
    '    <simulation-block-weeks-out>number</simulation-block-weeks-out>',
    '  </training-plan-logic>',
    '</objective-spec>',
  ].join('\n');
}

// ── Regenerate Plan Prompt ─────────────────────────────────────────────────

export function generateRegeneratePlanPrompt(params: {
  activeObjectives: ActivatedObjective[];
  today: string;
}): string {
  const { activeObjectives, today } = params;

  const objList = activeObjectives
    .map((o) => `- ${o.name} — priority weight: ${o.priorityWeight}`)
    .join('\n');

  return [
    'TRAINING ANALYSIS:',
    '',
    `Date: ${today}`,
    '',
    'REGENERATE PLAN REQUEST:',
    'The user has updated objective priority weights.',
    'Please restructure the combined training plan to reflect the new priorities.',
    '',
    'Active objectives with updated weights:',
    objList,
    '',
    'Respond with an updated <training-config> block reflecting the new emphasis allocation.',
  ].join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getLast7DaysCheckIns(checkIns: DailyCheckIn[], today: string): DailyCheckIn[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return checkIns
    .filter((c) => c.date >= cutoffStr && c.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getLast4WeeksWorkouts(log: WorkoutLog, today: string): WorkoutLog {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return {
    cardio: log.cardio.filter((s) => s.date >= cutoffStr && s.date <= today),
    strength: log.strength.filter((s) => s.date >= cutoffStr && s.date <= today),
    climbing: log.climbing.filter((s) => s.date >= cutoffStr && s.date <= today),
    conditioning: log.conditioning.filter((s) => s.date >= cutoffStr && s.date <= today),
  };
}
