# Summit Dashboard

A personal training dashboard for mountain athletes. Tracks cardio, strength, and climbing across multiple simultaneous objectives. No backend, no database, no API calls — all data lives in your browser's localStorage.

---

## What This App Does

- **Objective Mode:** Training shaped by an upcoming mountain objective (route, race, expedition). Supports multiple simultaneous active objectives with user-defined priority weights.
- **Baseline Mode:** Continuous improvement across cardio, strength, and climbing when no objective is active.
- **Daily Check-In:** Log sleep quality, HRV, resting HR, and subjective feel. The app classifies your recovery and adjusts today's recommendation automatically.
- **Recommendation Engine:** Fully hard-coded logic reads your training config, recovery state, and muscle group load to produce a daily workout recommendation.
- **Weekly Analysis (Claude.ai paste workflow):** Generate a prompt, paste it into Claude.ai, paste the structured response back. No API key required.
- **Objective Builder (Claude.ai paste workflow):** Describe a new objective in plain text, get a structured spec back, paste it into the app to add it to the library.

---

## Claude.ai Paste Workflows

### Weekly Analysis
1. On the dashboard, click **Generate Weekly Analysis Prompt**
2. Copy the full prompt
3. Paste into your Summit Training Analyst Claude.ai Project
4. Copy the `<training-config>` block from the response
5. Paste it back into the app via **Paste Analysis Response**
6. The app validates and applies the new training config

### Objective Builder
1. Click **Generate Objective Spec Prompt**
2. Describe your objective in the text field (route, distance, elevation, pack weight, etc.)
3. Copy the generated prompt
4. Paste into your Summit Objective Builder Claude.ai Project
5. Copy the `<objective-spec>` block from the response
6. Paste it back into the app via **Paste Objective Spec**
7. Claude Code (in your terminal) validates and writes the spec to the library files

---

## Daily Workflow

1. Open the app each morning
2. Complete the **Daily Check-In** (sleep, HRV, resting HR, subjective feel)
3. Review the **Recovery Indicator** and **Today's Recommendation**
4. Log workouts via **Upload** (Coros CSV) or native loggers (Strength / Climbing / Conditioning)
5. Check the **Weekly Stimulus Display** for muscle group balance

---

## Objective Pipeline

1. Generate an Objective Spec Prompt in the app
2. Paste into Summit Objective Builder Claude.ai Project
3. Paste the `<objective-spec>` response back to the app
4. In your terminal: Claude Code reads COMMANDS.md, runs ADD OBJECTIVE FROM SPEC
5. Activate the objective from the Objectives page
6. Enter your target date and personal details
7. Training plan phases generate automatically

---

## Claude.ai Project Setup

Create two Claude.ai Projects:

**Summit Training Analyst**
- System prompt: Analyze mountain athlete training data. Respond only with a `<training-config>` XML block conforming to the provided schema. Do not include explanation outside the block.

**Summit Objective Builder**
- System prompt: Build mountain training objectives. Respond only with an `<objective-spec>` XML block conforming to the provided schema. Do not include explanation outside the block.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

1. Push this repository to GitHub
2. Connect the GitHub repo to Vercel
3. Deploy with default settings (Next.js auto-detected)
4. No environment variables required

---

## COMMANDS.md

Claude Code reads COMMANDS.md at the start of every session. It defines the exact scope and process for every type of change. Never ask Claude Code to modify files outside a command's defined scope.

---

## Architecture Notes

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Storage:** localStorage only — no backend, no database
- **AI integration:** Claude.ai paste workflows only — no API calls, no environment variables
- **Deployment:** Vercel via GitHub
