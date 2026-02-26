// Recovery classification engine and personal baseline calculator.
// All rules are hard-coded. No external calls.

import type { DailyCheckIn, PersonalBaseline, RecoveryClassification } from '../storage';

// ── Personal Baseline ──────────────────────────────────────────────────────

const BASELINE_MIN_DAYS = 14;
const BASELINE_ROLLING_DAYS = 30;

export function calculateBaseline(checkIns: DailyCheckIn[]): PersonalBaseline {
  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < BASELINE_MIN_DAYS) {
    return {
      hrv30DayAverage: null,
      restingHR30DayAverage: null,
      baselineEstablished: false,
      baselineCalculatedDate: null,
      manualHrv: null,
      manualRestingHR: null,
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BASELINE_ROLLING_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = sorted.filter((c) => c.date >= cutoffStr);

  const hrvValues = recent
    .map((c) => c.recovery.hrv)
    .filter((v): v is number => v !== null && v > 0);
  const rhrValues = recent
    .map((c) => c.recovery.restingHR)
    .filter((v): v is number => v !== null && v > 0);

  const hrv30DayAverage =
    hrvValues.length > 0 ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length : null;
  const restingHR30DayAverage =
    rhrValues.length > 0 ? rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length : null;

  return {
    hrv30DayAverage: hrv30DayAverage ? Math.round(hrv30DayAverage * 10) / 10 : null,
    restingHR30DayAverage: restingHR30DayAverage
      ? Math.round(restingHR30DayAverage * 10) / 10
      : null,
    baselineEstablished: hrv30DayAverage !== null && restingHR30DayAverage !== null,
    baselineCalculatedDate: new Date().toISOString().slice(0, 10),
    manualHrv: null,
    manualRestingHR: null,
  };
}

// ── Classification Engine ──────────────────────────────────────────────────

type Score = 'full' | 'moderate' | 'fatigued' | 'rest';

function scoreOrder(s: Score): number {
  return { full: 0, moderate: 1, fatigued: 2, rest: 3 }[s];
}

function worstScore(scores: Score[]): Score {
  return scores.reduce((worst, s) =>
    scoreOrder(s) > scoreOrder(worst) ? s : worst
  );
}

function downgradeScore(score: Score): Score {
  const order: Score[] = ['full', 'moderate', 'fatigued', 'rest'];
  const idx = order.indexOf(score);
  return idx < order.length - 1 ? order[idx + 1] : 'rest';
}

// Step 1: Sleep quality
function classifySleep(quality: DailyCheckIn['sleep']['quality']): Score {
  switch (quality) {
    case 'Great':
    case 'Good':
      return 'full';
    case 'Fair':
      return 'moderate';
    case 'Low':
      return 'fatigued';
    case 'Poor':
      return 'rest';
  }
}

// Step 2: HRV vs. personal baseline
function classifyHrv(hrv: number | null, baseline: PersonalBaseline): Score | null {
  const baselineValue = baseline.hrv30DayAverage ?? baseline.manualHrv;
  if (hrv === null || baselineValue === null) return null;

  const pct = (baselineValue - hrv) / baselineValue;

  if (pct <= 0) return 'full';
  if (pct <= 0.1) return 'moderate';
  if (pct <= 0.2) return 'fatigued';
  return 'rest';
}

// Step 3: Resting HR vs. personal baseline
function classifyRestingHR(rhr: number | null, baseline: PersonalBaseline): Score | null {
  const baselineValue = baseline.restingHR30DayAverage ?? baseline.manualRestingHR;
  if (rhr === null || baselineValue === null) return null;

  const diff = rhr - baselineValue;

  if (diff <= 0) return 'full';
  if (diff <= 4) return 'moderate';
  return 'fatigued';
}

// Step 4: Subjective feel override
function subjectiveOverride(
  legs: number,
  energy: number
): Score | null {
  if (legs <= 1 && energy <= 1) return 'rest';
  if (legs <= 2 || energy <= 2) return 'fatigued';
  return null;
}

export interface ClassificationDetail {
  classification: RecoveryClassification;
  sleepScore: Score;
  hrvScore: Score | null;
  rhrScore: Score | null;
  subjectiveOverride: Score | null;
  flagInteractions: string[];
  hrvPct: number | null;
  rhrDiff: number | null;
}

export function classifyRecovery(
  checkIn: DailyCheckIn,
  baseline: PersonalBaseline
): ClassificationDetail {
  // Step 1
  const sleepScore = classifySleep(checkIn.sleep.quality);

  // Step 2
  const baselineHrv = baseline.hrv30DayAverage ?? baseline.manualHrv;
  const hrvScore = classifyHrv(checkIn.recovery.hrv, baseline);
  const hrvPct =
    checkIn.recovery.hrv !== null && baselineHrv !== null
      ? Math.round(((baselineHrv - checkIn.recovery.hrv) / baselineHrv) * 100)
      : null;

  // Step 3
  const baselineRhr = baseline.restingHR30DayAverage ?? baseline.manualRestingHR;
  const rhrScore = classifyRestingHR(checkIn.recovery.restingHR, baseline);
  const rhrDiff =
    checkIn.recovery.restingHR !== null && baselineRhr !== null
      ? checkIn.recovery.restingHR - baselineRhr
      : null;

  // Step 4
  const subjectiveScore = subjectiveOverride(
    checkIn.subjectiveFeel.legs,
    checkIn.subjectiveFeel.energy
  );

  // Step 5: Combine — most conservative wins
  const scores: Score[] = [sleepScore];
  if (hrvScore) scores.push(hrvScore);
  if (rhrScore) scores.push(rhrScore);

  let combined = worstScore(scores);

  // Subjective overrides only if worse
  if (subjectiveScore && scoreOrder(subjectiveScore) > scoreOrder(combined)) {
    combined = subjectiveScore;
  }

  // Step 6: Flag interactions
  const flagInteractions: string[] = [];

  if (checkIn.flags.includes('illness')) {
    combined = 'rest';
    flagInteractions.push('Illness flag: forced rest.');
  }

  if (checkIn.flags.includes('altitude') && combined !== 'rest') {
    combined = downgradeScore(combined);
    flagInteractions.push(
      'Altitude flag: HRV discounted, downgraded one level based on sleep and subjective feel.'
    );
  }

  if (checkIn.flags.includes('travel') && combined === 'fatigued') {
    combined = 'rest';
    flagInteractions.push('Travel flag + fatigued: forced rest.');
  }

  return {
    classification: combined,
    sleepScore,
    hrvScore,
    rhrScore,
    subjectiveOverride: subjectiveScore,
    flagInteractions,
    hrvPct,
    rhrDiff,
  };
}

// ── Consecutive Day Logic ──────────────────────────────────────────────────

export interface ConsecutiveRestPrompt {
  show: boolean;
  message: string;
}

export function getConsecutiveRestPrompt(
  checkIns: DailyCheckIn[],
  baseline: PersonalBaseline
): ConsecutiveRestPrompt {
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)); // newest first

  let consecutiveRest = 0;
  for (const checkIn of sorted) {
    const detail = classifyRecovery(checkIn, baseline);
    if (detail.classification === 'rest') {
      consecutiveRest++;
    } else {
      break;
    }
  }

  if (consecutiveRest >= 3) {
    return {
      show: true,
      message:
        'Three or more rest days — if illness or injury is involved, consider seeking guidance before returning to training.',
    };
  }

  if (consecutiveRest === 2) {
    return {
      show: true,
      message:
        "Two consecutive rest days — check in on how you're feeling before resuming training.",
    };
  }

  return { show: false, message: '' };
}

// ── Recovery color helper ──────────────────────────────────────────────────

export function recoveryColor(classification: RecoveryClassification): string {
  switch (classification) {
    case 'full':
      return 'green';
    case 'moderate':
      return 'yellow';
    case 'fatigued':
      return 'orange';
    case 'rest':
      return 'red';
  }
}

export function recoveryLabel(classification: RecoveryClassification): string {
  switch (classification) {
    case 'full':
      return 'Full Recovery';
    case 'moderate':
      return 'Moderate Recovery';
    case 'fatigued':
      return 'Fatigued';
    case 'rest':
      return 'Rest Recommended';
  }
}
