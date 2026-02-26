'use client';
import type { DailyCheckIn, PersonalBaseline } from '@/lib/storage';
import type { ClassificationDetail } from '@/lib/recovery';
import { recoveryColor, recoveryLabel } from '@/lib/recovery';

interface Props {
  detail: ClassificationDetail;
  checkIn: DailyCheckIn;
  baseline: PersonalBaseline;
}

const BAND_COLORS: Record<string, string> = {
  green:  'bg-glacier-success',
  yellow: 'bg-glacier-warning',
  orange: 'bg-glacier-fatigued',
  red:    'bg-glacier-danger',
};

export default function RecoveryIndicator({ detail, checkIn, baseline }: Props) {
  const color = recoveryColor(detail.classification);
  const label = recoveryLabel(detail.classification);
  const bandClass = BAND_COLORS[color] ?? 'bg-glacier-edge';

  const baselineHrv = baseline.hrv30DayAverage ?? baseline.manualHrv;
  const baselineRhr = baseline.restingHR30DayAverage ?? baseline.manualRestingHR;

  return (
    <div className="relative overflow-hidden bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className={`absolute top-0 left-0 right-0 h-1 ${bandClass}`} />

      <div className="flex items-center gap-2">
        <span className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Recovery</span>
        <span className="text-sm font-medium text-glacier-primary">{label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {checkIn.recovery.hrv !== null && (
          <div className="text-glacier-secondary">
            HRV: <span className="text-glacier-primary">{checkIn.recovery.hrv}ms</span>
            {baselineHrv && (
              <span className="text-glacier-muted ml-1">
                (baseline {baselineHrv}ms
                {detail.hrvPct !== null && `, ${detail.hrvPct > 0 ? '-' : '+'}${Math.abs(detail.hrvPct)}%`})
              </span>
            )}
          </div>
        )}
        {checkIn.recovery.restingHR !== null && (
          <div className="text-glacier-secondary">
            RHR: <span className="text-glacier-primary">{checkIn.recovery.restingHR}bpm</span>
            {baselineRhr && (
              <span className="text-glacier-muted ml-1">
                {`(baseline ${baselineRhr}bpm${detail.rhrDiff !== null ? `, ${detail.rhrDiff > 0 ? '+' : ''}${detail.rhrDiff}` : ''})`}
              </span>
            )}
          </div>
        )}
        <div className="text-glacier-secondary">
          Sleep: <span className="text-glacier-primary">{checkIn.sleep.quality} · {formatSleepHours(checkIn.sleep.hours)}</span>
        </div>
        <div className="text-glacier-secondary">
          Legs <span className="text-glacier-primary">{checkIn.subjectiveFeel.legs}/5</span>
          <span className="mx-1">·</span>
          Energy <span className="text-glacier-primary">{checkIn.subjectiveFeel.energy}/5</span>
        </div>
      </div>

      {detail.flagInteractions.length > 0 && (
        <div className="text-xs text-glacier-warning space-y-0.5">
          {detail.flagInteractions.map((msg, i) => <div key={i}>{msg}</div>)}
        </div>
      )}

      <div className="text-xs text-glacier-secondary">
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
