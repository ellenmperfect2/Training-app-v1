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
import { useTheme } from '@/lib/theme-context';
import { TYPE } from '@/lib/theme';

const LIGHT_COLORS: Record<string, string> = {
  green:  'text-glacier-success',
  yellow: 'text-glacier-warning',
  red:    'text-glacier-danger',
};

export default function StatusLayer() {
  const { theme: T } = useTheme();
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
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4 card-hover">
      <div style={{
        fontFamily: TYPE.sans,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: T.moss,
        borderBottom: `1px solid ${T.moss}33`,
        paddingBottom: 5,
        marginBottom: 12,
      }}>This Week</div>

      {/* Volume stat tiles — Part F */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cardio', light: volumeStatus.cardio, value: `${Math.round(volumeStatus.cardioMinutesThisWeek / 60 * 10) / 10}hr` },
          { label: 'Strength', light: volumeStatus.strength, value: `${volumeStatus.strengthSessionsThisWeek} sessions` },
          { label: 'Climbing', light: volumeStatus.climbing, value: `${volumeStatus.climbingSessionsThisWeek} sessions` },
        ].map(({ label, light, value }) => (
          <div key={label} className="bg-glacier-card-alt border border-glacier-edge rounded-lg text-center" style={{ padding: '12px 14px' }}>
            <div className={`text-xs mb-1 ${LIGHT_COLORS[light]}`}>●</div>
            <div className="text-[22px] font-bold text-glacier-primary leading-tight">{value}</div>
            <div className="text-[11px] text-glacier-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Conditioning */}
      <div className="text-xs text-glacier-secondary">
        Conditioning: {conditioningStatus.sessionsThisWeek}/{conditioningStatus.targetSessions} sessions
        {conditioningStatus.onTrack
          ? <span className="text-glacier-success ml-1">✓</span>
          : <span className="text-glacier-warning ml-1">·</span>
        }
      </div>

      {/* Objective timelines */}
      {objectiveStatuses.map((os) => (
        <div key={os.objectiveId} className="text-xs">
          <span className="text-glacier-secondary">{os.objectiveName}: </span>
          <span className={
            os.timelineStatus === 'on-track' ? 'text-glacier-success' : 'text-glacier-warning'
          }>
            {os.timelineStatus}
          </span>
        </div>
      ))}

      {/* Progression flags */}
      {progressionFlags.map((flag) => (
        <div key={flag.exerciseId} className="text-xs text-glacier-accent">
          {flag.message}
        </div>
      ))}

      {/* Climbing plateau flags */}
      {climbingFlags.map((flag) => (
        <div key={flag.discipline} className="text-xs text-glacier-warning">
          {flag.message}
        </div>
      ))}
    </div>
  );
}
