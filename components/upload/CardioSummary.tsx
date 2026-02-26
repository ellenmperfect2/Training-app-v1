'use client';
import { useState, useEffect } from 'react';
import { getWorkoutLog } from '@/lib/storage';
import type { CardioSession } from '@/lib/storage';
import { computeZoneTotals, aerobicBalanceLabel } from '@/lib/zones';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ZoneBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 rounded flex-1 bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function buildZonePcts(sessions: CardioSession[]) {
  const totals = computeZoneTotals(sessions);
  const total = totals.z1Hours + totals.z2Hours + totals.z3Hours + totals.z4Hours + totals.z5Hours;
  if (total === 0) return null;
  return {
    z1: Math.round((totals.z1Hours / total) * 100),
    z2: Math.round((totals.z2Hours / total) * 100),
    z3: Math.round((totals.z3Hours / total) * 100),
    z4: Math.round((totals.z4Hours / total) * 100),
    z5: Math.round((totals.z5Hours / total) * 100),
    aerobicPct: totals.aerobicPct,
    totalHours: totals.totalHours,
  };
}

function get4WeekTrendLabel(weeks: CardioSession[][]): string {
  // weeks[0] = most recent, weeks[1-3] = prior 3
  const getZ2Hours = (w: CardioSession[]) => computeZoneTotals(w).z2Hours;
  const recent = getZ2Hours(weeks[0]);
  const priorAvg = (getZ2Hours(weeks[1]) + getZ2Hours(weeks[2]) + getZ2Hours(weeks[3])) / 3;
  if (priorAvg === 0) return recent > 0 ? 'Z2 volume increasing ↑' : 'Z2 volume stable →';
  const pct = ((recent - priorAvg) / priorAvg) * 100;
  if (pct > 10) return 'Z2 volume increasing ↑';
  if (pct < -10) return 'Z2 volume declining ↓';
  return 'Z2 volume stable →';
}

export default function CardioSummary() {
  const [loaded, setLoaded] = useState(false);
  const [todaySessions, setTodaySessions] = useState<CardioSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<CardioSession[]>([]);
  const [weeklyData, setWeeklyData] = useState<CardioSession[][]>([[], [], [], []]);

  useEffect(() => {
    const log = getWorkoutLog();
    const t = today();
    const weekStart = getWeekStart();

    setTodaySessions(log.cardio.filter((s) => s.date === t));
    setWeekSessions(log.cardio.filter((s) => s.date >= weekStart && s.date <= t));

    // Build 4 weekly buckets (week 0 = current, weeks 1-3 = prior)
    const weeks: CardioSession[][] = [[], [], [], []];
    for (let w = 0; w < 4; w++) {
      const end = daysAgo(w * 7);
      const start = daysAgo(w * 7 + 6);
      weeks[w] = log.cardio.filter((s) => s.date >= start && s.date <= end);
    }
    setWeeklyData(weeks);
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const todayDuration = todaySessions.reduce((s, c) => s + c.duration, 0);
  const todayElev = todaySessions.reduce((s, c) => s + c.elevationGain, 0);
  const todayPcts = buildZonePcts(todaySessions);

  const weekDuration = weekSessions.reduce((s, c) => s + c.duration, 0);
  const weekElev = weekSessions.reduce((s, c) => s + c.elevationGain, 0);
  const weekPcts = buildZonePcts(weekSessions);

  const trendLabel = get4WeekTrendLabel(weeklyData);

  const ZONE_COLORS = ['bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-orange-500', 'bg-red-600'];

  return (
    <div className="space-y-4">
      {/* Today */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">Today</h2>
        {todaySessions.length === 0 ? (
          <p className="text-xs text-zinc-600">No sessions logged today.</p>
        ) : (
          <>
            <div className="text-xs text-zinc-400 space-y-0.5">
              <div>{todaySessions.length} session{todaySessions.length > 1 ? 's' : ''} · {formatDuration(todayDuration)} · {Math.round(todayElev)}ft gain</div>
            </div>
            {todayPcts ? (
              <div className="space-y-1">
                <div className="text-xs text-zinc-600 mb-1">Zone distribution</div>
                {(['z1','z2','z3','z4','z5'] as const).map((z, i) => (
                  <div key={z} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 w-4">{z.toUpperCase()}</span>
                    <ZoneBar pct={todayPcts[z]} color={ZONE_COLORS[i]} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">No HR data — zone distribution unavailable.</p>
            )}
          </>
        )}
      </section>

      {/* This week */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">This Week</h2>
        {weekSessions.length === 0 ? (
          <p className="text-xs text-zinc-600">No sessions this week.</p>
        ) : (
          <>
            <div className="text-xs text-zinc-400">
              {weekSessions.length} session{weekSessions.length > 1 ? 's' : ''} · {formatDuration(weekDuration)} · {Math.round(weekElev)}ft gain
            </div>
            {weekPcts ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-600 mb-1">Zone distribution</div>
                  {(['z1','z2','z3','z4','z5'] as const).map((z, i) => (
                    <div key={z} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-4">{z.toUpperCase()}</span>
                      <ZoneBar pct={weekPcts[z]} color={ZONE_COLORS[i]} />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-400">
                  Balance:{' '}
                  <span className={
                    weekPcts.aerobicPct >= 75 ? 'text-green-400' :
                    weekPcts.aerobicPct >= 50 ? 'text-yellow-400' : 'text-orange-400'
                  }>
                    {aerobicBalanceLabel(weekPcts.aerobicPct)}
                  </span>
                  <span className="text-zinc-600 ml-1">({weekPcts.aerobicPct}% Z1–Z2)</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-600">No HR data — zone distribution unavailable.</p>
            )}
          </>
        )}
      </section>

      {/* 4-week trend */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">4-Week Trend</h2>
        <div className="space-y-1.5">
          {weeklyData.map((w, i) => {
            const totals = computeZoneTotals(w);
            const label = i === 0 ? 'This week' : `${i}w ago`;
            return (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-600 w-14">{label}</span>
                <div className="flex gap-3 text-zinc-400">
                  <span>Z1-2: <span className="text-green-400">{(totals.z1Hours + totals.z2Hours).toFixed(1)}h</span></span>
                  <span>Z4-5: <span className="text-orange-400">{(totals.z4Hours + totals.z5Hours).toFixed(1)}h</span></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-zinc-400">{trendLabel}</div>
        <p className="text-xs text-zinc-600">Cardio only — see weekly analysis for full training load picture.</p>
      </section>
    </div>
  );
}
