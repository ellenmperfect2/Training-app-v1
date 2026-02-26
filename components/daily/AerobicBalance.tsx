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
  const [weekElev, setWeekElev] = useState(0);
  const [elevSparkline, setElevSparkline] = useState<number[]>([]);

  useEffect(() => {
    const log = getWorkoutLog();
    const t = today();
    const weekStart = getWeekStart();

    const weekSessions = log.cardio.filter((s) => s.date >= weekStart && s.date <= t);
    const totals = computeZoneTotals(weekSessions);
    setZ12Hours(Math.round((totals.z1Hours + totals.z2Hours) * 10) / 10);
    setZ45Hours(Math.round((totals.z4Hours + totals.z5Hours) * 10) / 10);
    setAerobicPct(totals.aerobicPct);
    setWeekElev(Math.round(weekSessions.reduce((s, c) => s + c.elevationGain, 0)));

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
  if (z12Hours === 0 && z45Hours === 0) return null;

  const maxElev = Math.max(...elevSparkline, 1);
  const balanceLabel = aerobicBalanceLabel(aerobicPct);
  const balanceColor = aerobicPct >= 75 ? 'text-green-400' : aerobicPct >= 50 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Cardio This Week</h2>
        <span className={`text-xs ${balanceColor}`}>{balanceLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">Aerobic (Z1–Z2)</div>
          <div className="text-base font-semibold text-green-400">{z12Hours}h</div>
          {z12Hours + z45Hours > 0 && (
            <div className="text-xs text-zinc-600">{aerobicPct}% of cardio</div>
          )}
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">Anaerobic (Z4–Z5)</div>
          <div className="text-base font-semibold text-orange-400">{z45Hours}h</div>
          {z12Hours + z45Hours > 0 && (
            <div className="text-xs text-zinc-600">{100 - aerobicPct}% of cardio</div>
          )}
        </div>
      </div>

      {weekElev > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-1.5">Elevation gain this week</div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-zinc-300">{weekElev.toLocaleString()}ft</span>
            {/* Sparkline */}
            {elevSparkline.some((v) => v > 0) && (
              <div className="flex items-end gap-0.5 h-5">
                {elevSparkline.map((v, i) => (
                  <div
                    key={i}
                    className={`w-4 rounded-sm ${i === 3 ? 'bg-zinc-400' : 'bg-zinc-700'}`}
                    style={{ height: `${Math.max(2, Math.round((v / maxElev) * 20))}px` }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">4-week sparkline (oldest → this week)</div>
        </div>
      )}

      <p className="text-xs text-zinc-700">Cardio only — see weekly analysis for full training load picture.</p>
    </div>
  );
}
