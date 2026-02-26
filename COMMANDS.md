# Summit Dashboard — Command Taxonomy

Claude Code must read this file at the start of every session before acting on any instruction.

---

## STANDING RULES
These rules apply to every command type without exception. They do not need to be restated in a prompt to be in effect.

### CLAUDE.md UPDATE RULE
After any change that affects file ownership, localStorage structure, data shapes, command type scope, or system architecture: update CLAUDE.md to reflect the change before confirming completion. The updated file must be named:
`CLAUDE — v[N] — [brief summary of what changed] — [YYYY-MM-DD]`

### SKILL PROMPT UPDATE RULE
After any change that affects how prompts should be written to this app, adds new decisioning rules, changes architectural constraints, or adds context an LLM would need to make safe changes: produce an updated version of the Summit Coach skill prompt with the relevant sections revised and a new version number and date. Output the full updated skill prompt as a code block so it can be copied into the Claude.ai project. The file must be named:
`Summit Coach Skill Prompt — v[N] — [brief summary of what changed] — [YYYY-MM-DD]`

### FILE NAMING RULE
All files produced or updated by Claude Code must follow this naming convention:
`[Document name] — v[N] — [brief summary of what changed] — [YYYY-MM-DD]`
First-time files with no prior version omit the version:
`[Document name] — [brief summary] — [YYYY-MM-DD]`
Version number increments with every substantive change. Summary should be 3–6 words describing what changed.

---

## AESTHETIC UPDATE
- **Scope:** CSS, layout, colors, typography, spacing, component styling
- **Never touch:** any data files, parsers, logic, prompt templates, recommendation engine, recovery engine, training config, objective library
- **Triggers:** "make it look", "design", "color", "font", "layout", "mobile", "dark mode", "spacing", "UI"

---

## ADD OBJECTIVE FROM SPEC
- **Scope:** benchmark-library.json, assessment-library.json, objective-library.json, and the objective selector UI
- **Never touch:** active user objective data, training logs, training config, exercise library, archived objectives
- **Process:**
  1. Receive the pasted `<objective-spec>` block
  2. Validate every field against objective-spec-schema.json
  3. Check for id collision with existing library entries
  4. Display plain language summary of what will be written
  5. Confirm with user before writing anything
  6. Write benchmark entry to benchmark-library.json
  7. Write assessment entries to assessment-library.json
  8. Write objective profile to objective-library.json
  9. Confirm exactly what was added
  10. Remind user to push to GitHub to deploy
- **Triggers:** "add this objective", "paste objective spec", "encode this objective", "new objective spec"

---

## MANAGE ZONES
- **Scope:** `userZones` localStorage key, zone management UI (`/zones`), `/lib/zones.ts`, any file that reads zone thresholds
- **Never Touch:** `objective-library.json`, `benchmark-library.json`, `assessment-library.json`, `training-config.json`, `training-config-schema.json`, `/lib/recovery`
- **Triggers:** "heart rate zones", "zones", "MAF", "max HR", "age-based zones", "update zones", "zone setup"

---

## MANAGE USER PREFERENCES
- **Scope:** `userPreferences` localStorage key, preferences UI screen (`/preferences`), `/lib/recommendation` (reading preference values only)
- **Never Touch:** `objective-library.json`, `benchmark-library.json`, `assessment-library.json`, `training-config.json`, `training-config-schema.json`, `objective-spec-schema.json`
- **Triggers:** "preferences", "HR calibration", "limitations", "suppress recommendation", "methodology", "objective notes"

---

## MANAGE SETTINGS
- **Scope:** Settings screen UI (`/settings`), data export/import logic, localStorage read/write for all keys during import/export operations only
- **Never Touch:** `/lib/recommendation`, `/lib/recovery`, `/lib/zones.js`, `objective-library.json`, `benchmark-library.json`, `assessment-library.json`, `training-config.json`, `training-config-schema.json`, `objective-spec-schema.json`
- **Triggers:** "settings", "export", "import", "backup", "restore", "clear all data"

---

## MANAGE BENCHMARK LOG
- **Scope:** benchmark checklist UI (`/benchmarks`), `benchmarkCompletionLog` localStorage key (read/write only). Read access to `benchmark-library.json`, `assessment-library.json`, and `activeObjectives`.
- **Never touch:** `benchmark-library.json` (no writes), `assessment-library.json` (no writes), `objective-library.json`, `/lib/recommendation`, `/lib/recovery`, any other localStorage key
- **Triggers:** "benchmark checklist", "log benchmark", "benchmark result", "readiness check", "did I pass", "benchmark status"

---

## MANAGE CHECKIN LOG
- **Scope:** Check-in history UI (`/checkin/history`), `checkInLog` localStorage key (read and write only)
- **Never Touch:** `/lib/recovery`, `/lib/recommendation`, `personalBaseline` localStorage key, any other localStorage key, any data file
- **Triggers:** "check-in history", "edit check-in", "delete check-in", "view past check-ins", "check-in log"

---

## MANAGE OBJECTIVES
- **Scope:** Objective management UI, localStorage `activeObjectives` and `archivedObjectives` read/write, objective selector
- **Never touch:** `objective-library.json`, `benchmark-library.json`, `assessment-library.json`, `/lib/recommendation`, `/lib/recovery`, `training-config.json`
- **Triggers:** "manage objectives", "objective screen", "deactivate objective", "reactivate objective", "edit target date", "edit priority weight"

---

## ACTIVATE OBJECTIVE
- **Scope:** active objectives in localStorage, training plan display, weighting UI, conflict detection
- **Never touch:** objective library files, benchmark definitions, assessment definitions, training logs, training config
- **Process:** user selects from library, enters target date and personal details, app activates with encoded benchmarks and generates training plan phase structure
- **Triggers:** "activate objective", "start training for", "set my objective"

---

## COMPLETE OBJECTIVE
- **Scope:** localStorage active objectives, objective history
- **Never touch:** objective library files, training logs, benchmark definitions, assessment definitions
- **Process:**
  1. Move objective from active to archived state
  2. Capture completion date, final readiness tier, assessment results, training period summary
  3. Remove from active recommendations and combined plan
  4. Preserve all associated training log data permanently
  5. Make available in Objective History view
- **Triggers:** "mark complete", "archive objective", "I completed this", "objective done"

---

## UPDATE TRAINING PLAN
- **Scope:** training plan display, week structure, key workout descriptions, notes field
- **Never touch:** benchmark definitions, objective profiles, weighting sliders, completed weeks, training config, objective library files
- **Process:** flag affected weeks, preserve completed weeks, show summary of changes
- **Triggers:** "change the plan", "update my training", "restructure", "modify weeks", "adjust the schedule"

---

## UPDATE BENCHMARK
- **Scope:** benchmark definitions for a named objective in benchmark-library.json
- **Never touch:** other objectives' benchmarks, training plan, completed assessments, training config, assessment library
- **Process:** explain impact on readiness tier before writing, confirm, update only the named objective's entry
- **Triggers:** "change the benchmark", "update the standard", "harder", "easier", "rescope"

---

## UPDATE PROMPT LOGIC
- **Scope:** /lib/prompt-templates only
- **Never touch:** data files, UI, stored user data, parsers, recommendation engine, recovery engine, training config, objective library
- **Process:** show before/after diff, explain behavioral difference
- **Triggers:** "change how Claude thinks", "update the prompt", "prompt logic", "rewrite the prompt"

---

## REWEIGHT OBJECTIVES
- **Scope:** weighting UI, visual prioritization, conflict flags, training plan emphasis display
- **Never touch:** training plan data, benchmark definitions, objective library, training config
- **Process:** update visual hierarchy immediately, surface conflicts, enable Regenerate Plan button
- **Triggers:** "change priority", "reweight", "more important", "less important", "adjust weights"

---

## PROCESS DAILY DATA
- **Scope:** upload modal, annotation fields, CSV parser, daily log, hard-coded status layer
- **Never touch:** objective library, benchmark definitions, training plan structure, exercise library, training config, recommendation engine logic, recovery engine logic
- **Triggers:** "upload", "log today", "add workout", "daily check-in", "process files"

---

## ADD EXERCISE
- **Scope:** exercise-library.json and exercise picker UI
- **Never touch:** workout templates, logged data, stimulus mappings for other exercises, training config, objective library
- **Process:**
  1. Identify exercise name
  2. Assign primary muscle group: [ posterior-chain / quad-dominant / push / pull / core / loaded-carry / forearm-grip ]
  3. Assign up to two secondary muscle groups
  4. Set single-leg flag
  5. Set mountain relevance (low/medium/high/very-high)
  6. Assign stimulus weights (0.0–1.0)
  7. Set default reps, sets, rest
  8. Confirm full entry before writing
- **Triggers:** "add exercise", "new exercise", "add [name]"

---

## ADD WORKOUT TEMPLATE
- **Scope:** workout-templates.json and template selector UI
- **Never touch:** exercise library, logged data, objective library
- **Process:** select from existing exercises only, confirm before saving
- **Triggers:** "add workout template", "new template", "save this workout as a template"

---

## APPLY TRAINING CONFIG
- **Scope:** training-config.json and recommendation engine only
- **Never touch:** objective library, benchmark definitions, exercise library, training logs, assessment results, stimulus mapping, recovery engine logic, any other data files
- **Process:**
  1. Extract `<training-config>` block from pasted response
  2. Validate every field against training-config-schema.json
  3. Reject unknown fields
  4. Write validated config with expiry date
  5. Show plain language diff from previous config
  6. Never modify recommendation engine logic itself
  7. Reject and explain if any field fails validation
- **Triggers:** "apply this config", "update training config", "paste training response", "apply analysis"

---

## UPDATE CONFIG SCHEMA
- **Scope:** training-config-schema.json, training-config.json, and recommendation engine only
- **Never touch:** objective library, any other data files, UI, prompt templates, recovery engine
- **Process:** explain new field and what behavior it enables, confirm before writing, update recommendation engine to read the new field
- **Triggers:** "add a config field", "new config parameter", "extend the config schema"

---

## UPDATE OBJECTIVE SPEC SCHEMA
- **Scope:** objective-spec-schema.json only
- **Never touch:** existing objective library entries, benchmark library, assessment library, active user data
- **Process:** explain change, show before/after, confirm. Note existing entries remain valid unless explicitly migrated.
- **Triggers:** "update the objective schema", "add a spec field", "change the objective format"

---

## UPDATE RECOVERY RULES
- **Scope:** /lib/recovery only, specifically the classification rules and threshold logic
- **Never touch:** stored check-in data, personal baseline values, recommendation engine logic, training config, objective library
- **Process:** explain what rule is changing and what behavioral difference it will create in daily recovery classification. Confirm before writing.
- **Triggers:** "change the recovery rules", "update HRV thresholds", "adjust sleep classification", "recovery logic"

---

## ADD OBJECTIVE MATCHER
- **Scope:** `/lib/objective-matcher.js` only
- **Read from:** `activeObjectives` localStorage, `objective-library.json`, `exercise-library.json` (muscle group lookups), `workoutLog` (read only at call time — no writes)
- **Never touch:** `/lib/recommendation`, `/lib/recovery`, `/lib/fit-parser.ts`, `/lib/zones.ts`, `workoutLog` shape, `objective-library.json` (read only), any other localStorage key
- **Triggers:** "objective matcher", "contributing objectives", "which objectives did this session contribute to", "update objective matcher logic"
