# Summit Dashboard — CLAUDE.md
**v13 — theme system, topo library, EDIT ACTIVITY LOG — 2026-02-26**
**v14 — elevation NaN fix: getWorkoutLog sanitizes duration/distance/elevationGain on read; fit-parser guards session-level header fields against NaN — 2026-02-27**
**v15 — CardioSession.packWeight changed from string enum to number (lbs); activity log distances now in miles — 2026-02-27**

Claude Code reads this file at the start of every session. It reflects the current architectural state of the app. Update this file (incrementing v[N]) after any change to file ownership, localStorage structure, data shapes, command types, or system architecture.

---

## Architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- **Storage:** localStorage only — no backend, no database, no API calls
- **AI integration:** Claude.ai paste workflows only — no API keys, no environment variables
- **Deployment:** Vercel via GitHub (repo: ellenmperfect2/Training-app-v1)
- **Theme system:** JS context-based (ThemeProvider + useTheme). All color tokens come from `lib/theme.js`. CSS custom properties are updated at runtime by ThemeProvider to make existing Tailwind color utilities (bg-glacier-*, text-glacier-*) theme-responsive. Default theme: `"light"`.
- **Fonts:** DM Serif Display + DM Sans (Google Fonts). DM Serif Display used only for workout title, objective name, and key numeric callouts. All other text uses DM Sans.

---

## File Ownership Map

| Area | Files | Owned by Command |
|------|-------|-----------------|
| Objective library | `data/objective-library.json`, `data/benchmark-library.json`, `data/assessment-library.json` | ADD OBJECTIVE FROM SPEC, UPDATE BENCHMARK |
| Config schema | `data/training-config-schema.json`, `data/objective-spec-schema.json` | UPDATE CONFIG SCHEMA, UPDATE OBJECTIVE SPEC SCHEMA |
| Default config | `data/training-config.json` | APPLY TRAINING CONFIG |
| Activity types | `data/coros-activity-types.json` | PROCESS DAILY DATA |
| Exercise library | `data/exercise-library.json` | ADD EXERCISE |
| Workout templates | `data/exercise-library.json` (templates array) | ADD WORKOUT TEMPLATE |
| Stimulus mapping | `data/stimulus-mapping.json` | PROCESS DAILY DATA |
| Recovery engine | `lib/recovery/index.ts` | UPDATE RECOVERY RULES |
| Recommendation engine | `lib/recommendation/index.ts` | APPLY TRAINING CONFIG |
| Stimulus engine | `lib/stimulus-engine/index.ts` | PROCESS DAILY DATA |
| Parsers | `lib/parsers/` | PROCESS DAILY DATA |
| Prompt templates | `lib/prompt-templates/index.ts` | UPDATE PROMPT LOGIC |
| Objective matcher | `lib/objective-matcher.js` | ADD OBJECTIVE MATCHER |
| Activity log UI | `components/activity/ActivityLog.tsx`, `app/activity/` | VIEW ACTIVITY LOG, EDIT ACTIVITY LOG |
| Storage types + helpers | `lib/storage/index.ts` | Any command adding/changing data shapes |
| Zone system | `lib/zones.ts`, `lib/storage/index.ts` (UserZones), `components/zones/`, `app/zones/` | MANAGE ZONES |
| FIT parser | `lib/fit-parser.ts` | PROCESS DAILY DATA |
| User preferences | `lib/storage/index.ts` (UserPreferences), `components/preferences/`, `app/preferences/` | MANAGE USER PREFERENCES |
| Settings screen | `components/settings/`, `app/settings/` | MANAGE SETTINGS |
| Check-in history | `components/checkin/CheckInHistory.tsx`, `app/checkin/history/` | MANAGE CHECKIN LOG |
| Benchmark checklist | `components/benchmarks/BenchmarkChecklist.tsx`, `app/benchmarks/` | MANAGE BENCHMARK LOG |
| Theme tokens | `lib/theme.js` | AESTHETIC UPDATE |
| Theme context | `lib/theme-context.js` | AESTHETIC UPDATE |
| Topo utilities | `lib/topo-utils.js` | ADD TOPO, ASSIGN TOPO |
| Topo library | `data/topo-library.json` | ADD TOPO |
| Topo page config | `data/topo-page-config.json` | ASSIGN TOPO |
| Topo renderer | `components/TopoLayer.jsx` | AESTHETIC UPDATE |
| Survey grid | `components/SurveyGrid.jsx` | AESTHETIC UPDATE |
| UI components | `components/` | AESTHETIC UPDATE, PROCESS DAILY DATA, MANAGE OBJECTIVES, MANAGE USER PREFERENCES, MANAGE SETTINGS |
| Pages / Nav | `app/`, `components/ui/Nav.tsx` | AESTHETIC UPDATE, PROCESS DAILY DATA, MANAGE USER PREFERENCES, MANAGE SETTINGS |

---

## localStorage Keys

| Key | Shape | Owner |
|-----|-------|-------|
| `activeObjectives` | `ActivatedObjective[]` | ACTIVATE OBJECTIVE, MANAGE OBJECTIVES |
| `archivedObjectives` | `ArchivedObjective[]` | COMPLETE OBJECTIVE, MANAGE OBJECTIVES |
| `combinedPlan` | `CombinedTrainingPlan \| null` | UPDATE TRAINING PLAN |
| `conflicts` | `ConflictList` | REWEIGHT OBJECTIVES |
| `workoutLog` | `{ cardio: CardioSession[]; strength: StrengthSession[]; climbing: ClimbingSession[]; conditioning: ConditioningSession[] }` | PROCESS DAILY DATA, EDIT ACTIVITY LOG |
| `checkInLog` | `DailyCheckIn[]` | PROCESS DAILY DATA |
| `personalBaseline` | `PersonalBaseline` | PROCESS DAILY DATA |
| `stimulusHistory` | array | PROCESS DAILY DATA |
| `progressionHistory` | array | PROCESS DAILY DATA |
| `activeTrainingConfig` | `TrainingConfig` | APPLY TRAINING CONFIG |
| `configHistory` | array | APPLY TRAINING CONFIG |
| `userPreferences` | `UserPreferences` | MANAGE USER PREFERENCES |
| `userZones` | `UserZones` | MANAGE ZONES |
| `lastExportDate` | ISO string \| null — device-local, never exported | MANAGE SETTINGS |
| `benchmarkCompletionLog` | `Record<string, BenchmarkCompletion>` — key is `objectiveId.benchmarkId` | MANAGE BENCHMARK LOG |
| `summitTheme` | `"light"` \| `"dark"` — default `"light"` | AESTHETIC UPDATE |

---

## Key Data Shape: ParsedCorosSession

```ts
interface ParsedCorosSession {
  id: string;
  date: string;
  corosType: string;         // e.g. "Hike", "OutdoorRun", "GeneralCardio"
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
    packWeight?: string;       // 'none' | 'light' | 'moderate' | 'heavy'
    terrain?: string;
    weightsUsed?: boolean;     // CHANGED in Prompt 1: was inclineUsed
    perceivedEffort?: number;
    notes?: string;
  };
}
```

**Note:** `inclineUsed` was renamed to `weightsUsed` (Prompt 1, 2026-02-26). Any future code must use `weightsUsed`. The question shown in the UI is "Were weights used? (e.g. weighted vest, pack)".

---

## Key Data Shape: DailyCheckIn

```ts
interface DailyCheckIn {
  date: string;
  sleep: {
    quality: 'Great' | 'Good' | 'Fair' | 'Low' | 'Poor';
    hours: number;             // stored as decimal (e.g. 7.5); displayed as "Xh Ym"
    bedtime?: string;
    wakeTime?: string;
  };
  recovery: { hrv, restingHR, hrRangeLow, hrRangeHigh };
  subjectiveFeel: { legs, energy, motivation };   // 1–5 each
  flags: ('stress' | 'travel' | 'illness' | 'altitude')[];
  notes: string;
  recoveryClassification?: string;
}
```

**Note (Prompt 1):** Sleep input now uses two integer fields (hours + minutes 0–59) that convert to decimal on save. Display format is "Xh Ym" everywhere.

---

## Key Data Shape: ActivatedObjective

```ts
interface ActivatedObjective {
  id: string;
  libraryId: string;
  name: string;
  type: string;
  targetDate: string;
  activatedDate: string;
  priorityWeight: number;       // 1–5 on ManageObjectives screen
  currentPhase: string;         // Recalculated on targetDate change
  weeksRemaining: number;       // Recalculated on targetDate change
  assessmentResults: AssessmentResult[];
  trainingPlan: TrainingWeek[];
  // Added Prompt 3 — set at activation time, all optional
  packWeight?: string;          // 'none' | 'light' | 'moderate' | 'heavy'
  region?: string;
  limitations?: string[];       // from: knee, shoulder, ankle, back, forearm, other
  // Added Prompt 7 — from objective training-plan-logic and profile
  thresholdCapacityRequired?: boolean;
  thresholdIntroductionWeeksOut?: number;
  maxAltitudeFt?: number;
}
```

**Phase calculation** (Prompt 3): >= 12w = Base, 8–11w = Build, 4–7w = Peak, 1–3w = Taper, 0w = Race Week

---

## Key Data Shape: TrainingConfig (new fields — added schema v2.0)

New fields added alongside the existing flat fields. All are optional (`?`) in TypeScript for backward compatibility with stored configs; required in the parser for newly pasted configs.

```ts
// New flat fields
'cardio-anaerobic-flag'?: 'none' | 'develop' | 'maintain' | 'reduce'
'loaded-carry-direction'?: 'increase' | 'decrease' | 'hold'

// New object blocks
'cardio-weekly-target'?:   { direction, sessions, 'primary-zone': 'z1-2'|'z3'|'z4-5', 'session-duration-hours', note }
'strength-weekly-target'?: { direction, sessions, 'primary-focus': 'posterior-chain'|'single-leg'|'push'|'pull'|'core'|'full-body', 'rep-scheme': 'strength'|'hypertrophy'|'endurance', note }
'climbing-weekly-target'?: { direction, sessions, 'primary-focus': 'endurance'|'power-endurance'|'projecting'|'conditioning'|'rest', note }
```

**Behavioral rules (recommendation engine):**
- `cardio-anaerobic-flag: develop` → weights cardio toward Z4–5 when fatigue-state is not high/rest
- `cardio-anaerobic-flag: reduce` → suppresses all threshold recommendations regardless of other signals
- `strength-weekly-target['rep-scheme']` → overrides exercise default reps: strength=3, hypertrophy=8, endurance=15
- `strength-weekly-target['primary-focus']` → used as workout-type tiebreaker when no emphasis field is 'high'
- Weekly target blocks are a display and context layer — the existing emphasis/priority fields remain and drive core logic

**Sub-block XML format (for pasted configs):**
```
<cardio-weekly-target>
  direction: increase
  sessions: 4
  primary-zone: z1-2
  session-duration-hours: 1.5
  note: Building aerobic base
</cardio-weekly-target>
```

---

## Activity Types (coros-activity-types.json)

Known corosType values: `IndoorRun`, `OutdoorRun`, `IndoorCycle`, `OutdoorCycle`, `Hike`, `MountainHike`, `Skiing`, `BackcountrySkiing`, `Snowshoeing`, `Walk`, `IndoorStrength`, `Yoga`, `Swimming`, `GeneralCardio`

**GeneralCardio (added Prompt 1):**
- Accepts any uploaded file regardless of filename pattern
- Annotation fields: `perceivedEffort`, `notes`
- Stimulus: neutral (all weights ~0.3 or below)
- The upload modal falls back to GeneralCardio silently when a file doesn't match the Coros filename format

---

## Stimulus Mapping Conditions (stimulus-mapping.json)

Condition strings evaluated in `lib/stimulus-engine/index.ts`:
- `elevationGainPerHour < 500` / `>= 500`
- `packWeight === 'none'` / `packWeight !== 'none'` — condition strings in JSON are unchanged; evaluated as `!packWeight || packWeight === 0` / `packWeight > 0` (CardioSession.packWeight is now `number` lbs, not a string enum)
- `weightsUsed === false` / `weightsUsed === true`   ← CHANGED from inclineUsed in Prompt 1

---

## Architectural Constraints

- No server-side code, no API routes, no environment variables
- All logic is hard-coded — no dynamic rules from external sources
- The recommendation engine (`/lib/recommendation`) must never call external APIs
- The recovery engine (`/lib/recovery`) must never be modified except by UPDATE RECOVERY RULES
- JSON data files in `/data` are the single source of truth for objective/benchmark/assessment definitions
- localStorage is the single source of truth for all user data
<<<<<<< HEAD
- **Theme system:** All color values in components must come from `useTheme()` → `T.{token}` (inline styles) or from CSS custom properties updated by ThemeProvider. No hardcoded hex values in component or page files.
- **Topo lines:** `topo-library.json` stores contour data (ADD TOPO command only). `topo-page-config.json` controls page assignments (ASSIGN TOPO command only). These two files are never modified by the same command. `topo-page-config.json` is read-only at runtime — never written by the app.
- **Font rule:** DM Serif Display (`TYPE.serif` / `TYPE.displayXl/Lg/Md/Num`) is used only for: workout title (RecommendationCard), objective name (ObjectiveCard), and key numeric callouts (weeks-out in ObjectiveCard). All other text must use DM Sans.
=======
- `getWorkoutLog` sanitizes non-finite (NaN) numeric fields on read — `duration`, `distance`, `elevationGain` in cardio sessions are clamped to 0; stored data is not mutated
>>>>>>> c789916 (Fix elevation NaN from COROS FIT files (PROCESS DAILY DATA))
