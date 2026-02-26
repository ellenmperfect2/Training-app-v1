'use client';
import { useEffect, useState } from 'react';
import {
  getWorkoutLog,
  getActiveObjectives,
  getProgressionHistory,
} from '@/lib/storage';
import { computeStatusLayer } from '@/lib/status';
import { getCurrentWeekDates } from '@/lib/stimulus-engine';
import type { StatusLayer as StatusLayerType } from '@/lib/status';

const LIGHT_COLORS: Record<string, string> = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

export default function StatusLayer() {
  const [status, setStatus] = useState<StatusLayerType | null>(null);

  useEffect(() => {
    const log = getWorkoutLog();
    const progressionHistory = getProgressionHistory();
    const activeObjectives = getActiveObjectives();
    const { startDate, endDate } = getCurrentWeekDates();

    const result = computeStatusLayer(
      log,
      progressionHistory,
      activeObjectives,
      startDate,
      endDate,
      2, // conditioning target
      { cardioMinutesTarget: 240, strengthSessionsTarget: 2, climbingSessionsTarget: 2 }
    );
    setStatus(result);
  }, []);

  if (!status) return null;

  const { volumeStatus, progressionFlags, climbingFlags, conditioningStatus, objectiveStatuses } = status;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">This Week</div>

      {/* Volume */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: 'Cardio', light: volumeStatus.cardio, value: `${Math.round(volumeStatus.cardioMinutesThisWeek / 60 * 10) / 10}hr` },
          { label: 'Strength', light: volumeStatus.strength, value: `${volumeStatus.strengthSessionsThisWeek} sessions` },
          { label: 'Climbing', light: volumeStatus.climbing, value: `${volumeStatus.climbingSessionsThisWeek} sessions` },
        ].map(({ label, light, value }) => (
          <div key={label} className="text-center">
            <div className={`text-lg font-semibold ${LIGHT_COLORS[light]}`}>●</div>
            <div className="text-zinc-300 text-xs">{value}</div>
            <div className="text-zinc-600 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Conditioning */}
      <div className="text-xs text-zinc-500">
        Conditioning: {conditioningStatus.sessionsThisWeek}/{conditioningStatus.targetSessions} sessions
        {conditioningStatus.onTrack
          ? <span className="text-green-500 ml-1">✓</span>
          : <span className="text-yellow-500 ml-1">·</span>
        }
      </div>

      {/* Objective timelines */}
      {objectiveStatuses.map((os) => (
        <div key={os.objectiveId} className="text-xs">
          <span className="text-zinc-400">{os.objectiveName}: </span>
          <span className={
            os.timelineStatus === 'on-track' ? 'text-green-400' : 'text-yellow-400'
          }>
            {os.timelineStatus}
          </span>
        </div>
      ))}

      {/* Progression flags */}
      {progressionFlags.map((flag) => (
        <div key={flag.exerciseId} className="text-xs text-sky-400">
          {flag.message}
        </div>
      ))}

      {/* Climbing plateau flags */}
      {climbingFlags.map((flag) => (
        <div key={flag.discipline} className="text-xs text-amber-400">
          {flag.message}
        </div>
      ))}
    </div>
  );
}
