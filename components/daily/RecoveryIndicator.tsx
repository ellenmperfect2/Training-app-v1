'use client';
import type { DailyCheckIn, PersonalBaseline } from '@/lib/storage';
import type { ClassificationDetail } from '@/lib/recovery';
import { recoveryColor, recoveryLabel } from '@/lib/recovery';

interface Props {
  detail: ClassificationDetail;
  checkIn: DailyCheckIn;
  baseline: PersonalBaseline;
}

const DOT_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

export default function RecoveryIndicator({ detail, checkIn, baseline }: Props) {
  const color = recoveryColor(detail.classification);
  const label = recoveryLabel(detail.classification);
  const dotClass = DOT_COLORS[color] ?? 'bg-zinc-400';

  const baselineHrv = baseline.hrv30DayAverage ?? baseline.manualHrv;
  const baselineRhr = baseline.restingHR30DayAverage ?? baseline.manualRestingHR;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Recovery</span>
        <span className={`recovery-dot ${dotClass}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {checkIn.recovery.hrv !== null && (
          <div className="text-zinc-400">
            HRV: <span className="text-zinc-200">{checkIn.recovery.hrv}ms</span>
            {baselineHrv && (
              <span className="text-zinc-600 ml-1">
                (baseline {baselineHrv}ms
                {detail.hrvPct !== null && `, ${detail.hrvPct > 0 ? '-' : '+'}${Math.abs(detail.hrvPct)}%`})
              </span>
            )}
          </div>
        )}
        {checkIn.recovery.restingHR !== null && (
          <div className="text-zinc-400">
            RHR: <span className="text-zinc-200">{checkIn.recovery.restingHR}bpm</span>
            {baselineRhr && (
              <span className="text-zinc-600 ml-1">
                {`(baseline ${baselineRhr}bpm${detail.rhrDiff !== null ? `, ${detail.rhrDiff > 0 ? '+' : ''}${detail.rhrDiff}` : ''})`}
              </span>
            )}
          </div>
        )}
        <div className="text-zinc-400">
          Sleep: <span className="text-zinc-200">{checkIn.sleep.quality} · {formatSleepHours(checkIn.sleep.hours)}</span>
        </div>
        <div className="text-zinc-400">
          Legs <span className="text-zinc-200">{checkIn.subjectiveFeel.legs}/5</span>
          <span className="mx-1">·</span>
          Energy <span className="text-zinc-200">{checkIn.subjectiveFeel.energy}/5</span>
        </div>
      </div>

      {detail.flagInteractions.length > 0 && (
        <div className="text-xs text-amber-400 space-y-0.5">
          {detail.flagInteractions.map((msg, i) => <div key={i}>{msg}</div>)}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        → {label} — {getRecoveryActionNote(detail.classification)}
      </div>
    </div>
  );
}

function formatSleepHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getRecoveryActionNote(classification: string): string {
  switch (classification) {
    case 'full': return 'executing plan as prescribed';
    case 'moderate': return 'reducing today\'s intensity slightly';
    case 'fatigued': return 'swapping to active recovery only';
    case 'rest': return 'full rest recommended';
    default: return '';
  }
}
