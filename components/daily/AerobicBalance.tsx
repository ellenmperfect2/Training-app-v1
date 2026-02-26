'use client';
import { useState, useEffect } from 'react';
import { getWorkoutLog } from '@/lib/storage';
import { computeZoneTotals, aerobicBalanceLabel } from '@/lib/zones';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AerobicBalance() {
  const [loaded, setLoaded] = useState(false);
  const [z12Hours, setZ12Hours] = useState(0);
  const [z45Hours, setZ45Hours] = useState(0);
  const [aerobicPct, setAerobicPct] = useState(0);
  const [todayElev, setTodayElev] = useState(0);
  const [weekElev, setWeekElev] = useState(0);
  const [elevSparkline, setElevSparkline] = useState<number[]>([]);
  const [hasCardio, setHasCardio] = useState(false);

  useEffect(() => {
    const log = getWorkoutLog();
    const t = today();
    const weekStart = getWeekStart();

    const weekSessions = log.cardio.filter((s) => s.date >= weekStart && s.date <= t);
    const todaySessions = log.cardio.filter((s) => s.date === t);

    const totals = computeZoneTotals(weekSessions);
    setZ12Hours(Math.round((totals.z1Hours + totals.z2Hours) * 10) / 10);
    setZ45Hours(Math.round((totals.z4Hours + totals.z5Hours) * 10) / 10);
    setAerobicPct(totals.aerobicPct);
    setTodayElev(Math.round(todaySessions.reduce((s, c) => s + c.elevationGain, 0)));
    setWeekElev(Math.round(weekSessions.reduce((s, c) => s + c.elevationGain, 0)));
    setHasCardio(weekSessions.length > 0);

    // 4-week elevation sparkline
    const sparkline: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const end = daysAgo(w * 7);
      const start = daysAgo(w * 7 + 6);
      const wSessions = log.cardio.filter((s) => s.date >= start && s.date <= end);
      sparkline.push(Math.round(wSessions.reduce((s, c) => s + c.elevationGain, 0)));
    }
    setElevSparkline(sparkline);

    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (!hasCardio) return null;

  const maxElev = Math.max(...elevSparkline, 1);
  const balanceLabel = aerobicBalanceLabel(aerobicPct);
  const balanceColor =
    aerobicPct >= 75 ? 'text-glacier-success' :
    aerobicPct >= 50 ? 'text-glacier-warning' :
    'text-glacier-fatigued';

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-glacier-primary">Cardio This Week</h2>
        {z12Hours + z45Hours > 0 && (
          <span className={`text-xs ${balanceColor}`}>{balanceLabel}</span>
        )}
      </div>

      {z12Hours + z45Hours > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-glacier-card-alt border border-glacier-edge rounded" style={{ padding: '12px 14px' }}>
            <div className="text-[22px] font-bold text-glacier-primary leading-tight">{z12Hours}h</div>
            <div className="text-[11px] text-glacier-muted mt-0.5">Aerobic (Z1–Z2)</div>
            <div className="text-[10px] text-glacier-muted">{aerobicPct}% of cardio</div>
          </div>
          <div className="bg-glacier-card-alt border border-glacier-edge rounded" style={{ padding: '12px 14px' }}>
            <div className="text-[22px] font-bold text-glacier-primary leading-tight">{z45Hours}h</div>
            <div className="text-[11px] text-glacier-muted mt-0.5">Anaerobic (Z4–Z5)</div>
            <div className="text-[10px] text-glacier-muted">{100 - aerobicPct}% of cardio</div>
          </div>
        </div>
      )}

      {(weekElev > 0 || todayElev > 0) && (
        <div>
          <div className="text-xs text-glacier-secondary mb-1.5">Elevation gain — cardio only</div>
          <div className="grid grid-cols-2 gap-3 mb-1.5">
            <div className="bg-glacier-card-alt border border-glacier-edge rounded" style={{ padding: '12px 14px' }}>
              <div className="text-[22px] font-bold text-glacier-primary leading-tight">{todayElev.toLocaleString()}ft</div>
              <div className="text-[11px] text-glacier-muted mt-0.5">Today</div>
            </div>
            <div className="bg-glacier-card-alt border border-glacier-edge rounded" style={{ padding: '12px 14px' }}>
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-bold text-glacier-primary leading-tight">{weekElev.toLocaleString()}ft</span>
                {elevSparkline.some((v) => v > 0) && (
                  <div className="flex items-end gap-0.5 h-5">
                    {elevSparkline.map((v, i) => (
                      <div
                        key={i}
                        className={`w-4 rounded-sm ${i === 3 ? 'bg-glacier-secondary' : 'bg-glacier-muted'}`}
                        style={{ height: `${Math.max(2, Math.round((v / maxElev) * 20))}px` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-glacier-muted mt-0.5">This week</div>
            </div>
          </div>
          {elevSparkline.some((v) => v > 0) && (
            <div className="text-xs text-glacier-muted">4-week sparkline (oldest → this week)</div>
          )}
        </div>
      )}

      <p className="text-xs text-glacier-muted">Cardio only — see weekly analysis for full training load picture.</p>
    </div>
  );
}
