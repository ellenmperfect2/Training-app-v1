'use client';
import { useState, useEffect } from 'react';
import RecoveryIndicator from './RecoveryIndicator';
import RecommendationCard from './RecommendationCard';
import StatusLayer from './StatusLayer';
import StimulusDisplay from '@/components/stimulus/StimulusDisplay';
import ConfigCard from '@/components/config/ConfigCard';
import PasteWorkflowButtons from './PasteWorkflowButtons';
import {
  getCheckInLog,
  getWorkoutLog,
  getActiveObjectives,
  getPersonalBaseline,
  getActiveTrainingConfig,
  getArchivedObjectives,
} from '@/lib/storage';
import { classifyRecovery } from '@/lib/recovery';
import { buildRecommendation } from '@/lib/recommendation';
import { computeWeeklyStimulus, getCurrentWeekDates } from '@/lib/stimulus-engine';
import { isConfigExpired } from '@/lib/parsers/config-parser';
import defaultConfigData from '@/data/training-config.json';
import type { TrainingConfig } from '@/lib/storage';

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const [recoveryDetail, setRecoveryDetail] = useState<ReturnType<typeof classifyRecovery> | null>(null);
  const [recommendation, setRecommendation] = useState<ReturnType<typeof buildRecommendation> | null>(null);
  const [stimulusResult, setStimulusResult] = useState<ReturnType<typeof computeWeeklyStimulus> | null>(null);
  const [configExpired, setConfigExpired] = useState(false);
  const [configExpiringSoon, setConfigExpiringSoon] = useState(false);
  const [config, setConfig] = useState<TrainingConfig | null>(null);
  const [noCheckIn, setNoCheckIn] = useState(false);

  useEffect(() => {
    const checkIns = getCheckInLog();
    const log = getWorkoutLog();
    const baseline = getPersonalBaseline();
    const activeObjectives = getActiveObjectives();
    const storedConfig = getActiveTrainingConfig();

    // Resolve config
    const resolvedConfig: TrainingConfig = storedConfig ?? (defaultConfigData as TrainingConfig);
    setConfig(resolvedConfig);

    if (storedConfig) {
      const expired = isConfigExpired(storedConfig);
      setConfigExpired(expired);
      const twoDays = new Date();
      twoDays.setDate(twoDays.getDate() + 2);
      const twoDayStr = twoDays.toISOString().slice(0, 10);
      setConfigExpiringSoon(!expired && storedConfig['expires-date'] <= twoDayStr);
    }

    // Resolve today's check-in (or yesterday's)
    const todayCheckIn = checkIns.find((c) => c.date === today);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const recentCheckIn = todayCheckIn ?? checkIns.find((c) => c.date === yesterdayStr);

    let detail: ReturnType<typeof classifyRecovery> | null = null;
    if (recentCheckIn) {
      detail = classifyRecovery(recentCheckIn, baseline);
      setRecoveryDetail(detail);
    } else {
      setNoCheckIn(true);
    }

    // Build recommendation
    const rec = buildRecommendation({
      config: resolvedConfig,
      recovery: detail?.classification ?? null,
      log,
      activeObjectives,
      today,
      planWeek: null,
    });
    setRecommendation(rec);

    // Compute weekly stimulus
    const { startDate, endDate } = getCurrentWeekDates();
    const stimulus = computeWeeklyStimulus(log, startDate, endDate);
    setStimulusResult(stimulus);

    setLoaded(true);
  }, [today]);

  if (!loaded) {
    return <div className="text-zinc-600 text-sm py-8 text-center">Loading...</div>;
  }

  const todayCheckIn = getCheckInLog().find((c) => c.date === today);

  return (
    <div className="space-y-6">
      {/* Config expiry banners */}
      {configExpired && (
        <div className="bg-amber-900/40 border border-amber-700 rounded px-4 py-2 text-sm text-amber-200">
          Training config expired — run weekly analysis to get updated recommendations.
        </div>
      )}
      {configExpiringSoon && !configExpired && (
        <div className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-sm text-zinc-400">
          Training config expires in 2 days — consider running weekly analysis.
        </div>
      )}
      {noCheckIn && (
        <div className="bg-zinc-800 border border-zinc-600 rounded px-4 py-2 text-sm text-zinc-400">
          No check-in today — <a href="/checkin" className="text-zinc-200 underline">log your morning data</a> for a personalized recommendation.
        </div>
      )}

      {/* Recovery indicator */}
      {recoveryDetail && todayCheckIn && (
        <RecoveryIndicator
          detail={recoveryDetail}
          checkIn={todayCheckIn}
          baseline={getPersonalBaseline()}
        />
      )}

      {/* Recommendation card */}
      {recommendation && (
        <RecommendationCard recommendation={recommendation} date={today} />
      )}

      {/* Status layer */}
      <StatusLayer />

      {/* Weekly stimulus */}
      {stimulusResult && (
        <StimulusDisplay stimulus={stimulusResult} />
      )}

      {/* Paste workflow buttons */}
      <PasteWorkflowButtons />

      {/* Config card */}
      {config && <ConfigCard config={config} />}
    </div>
  );
}
