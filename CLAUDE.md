# Summit Dashboard — CLAUDE.md
**v1 — initial build + Prompt 1 changes — 2026-02-26**

Claude Code reads this file at the start of every session. It reflects the current architectural state of the app. Update this file (incrementing v[N]) after any change to file ownership, localStorage structure, data shapes, command types, or system architecture.

---

## Architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- **Storage:** localStorage only — no backend, no database, no API calls
- **AI integration:** Claude.ai paste workflows only — no API keys, no environment variables
- **Deployment:** Vercel via GitHub (repo: ellenmperfect2/Training-app-v1)

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
| Storage types + helpers | `lib/storage/index.ts` | Any command adding/changing data shapes |
| UI components | `components/` | AESTHETIC UPDATE, PROCESS DAILY DATA, MANAGE OBJECTIVES |
| Pages / Nav | `app/`, `components/ui/Nav.tsx` | AESTHETIC UPDATE, PROCESS DAILY DATA |

---

## localStorage Keys

| Key | Shape | Owner |
|-----|-------|-------|
| `activeObjectives` | `ActivatedObjective[]` | ACTIVATE OBJECTIVE, MANAGE OBJECTIVES |
| `archivedObjectives` | `ArchivedObjective[]` | COMPLETE OBJECTIVE, MANAGE OBJECTIVES |
| `combinedPlan` | `CombinedTrainingPlan \| null` | UPDATE TRAINING PLAN |
| `conflicts` | `ConflictList` | REWEIGHT OBJECTIVES |
| `workoutLog` | `{ cardio: ParsedCorosSession[]; strength: StrengthSession[]; climbing: ClimbingSession[]; conditioning: ConditioningSession[] }` | PROCESS DAILY DATA |
| `checkInLog` | `DailyCheckIn[]` | PROCESS DAILY DATA |
| `personalBaseline` | `PersonalBaseline` | PROCESS DAILY DATA |
| `stimulusHistory` | array | PROCESS DAILY DATA |
| `progressionHistory` | array | PROCESS DAILY DATA |
| `activeTrainingConfig` | `TrainingConfig` | APPLY TRAINING CONFIG |
| `configHistory` | array | APPLY TRAINING CONFIG |

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
- `packWeight === 'none'` / `packWeight !== 'none'`
- `weightsUsed === false` / `weightsUsed === true`   ← CHANGED from inclineUsed in Prompt 1

---

## Architectural Constraints

- No server-side code, no API routes, no environment variables
- All logic is hard-coded — no dynamic rules from external sources
- The recommendation engine (`/lib/recommendation`) must never call external APIs
- The recovery engine (`/lib/recovery`) must never be modified except by UPDATE RECOVERY RULES
- JSON data files in `/data` are the single source of truth for objective/benchmark/assessment definitions
- localStorage is the single source of truth for all user data
