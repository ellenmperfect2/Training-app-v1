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

const ZONE_STYLES = [
  { bg: 'var(--zone1)', label: 'Z1' },
  { bg: 'var(--zone2)', label: 'Z2' },
  { bg: 'var(--zone3)', label: 'Z3' },
  { bg: 'var(--zone4)', label: 'Z4' },
  { bg: 'var(--zone5)', label: 'Z5' },
];

function ZoneBarStrip({ pcts }: { pcts: { z1: number; z2: number; z3: number; z4: number; z5: number } | null }) {
  if (!pcts) {
    return (
      <div className="space-y-1.5">
        <div style={{ height: '10px', borderRadius: '5px', background: 'var(--border)', width: '100%' }} />
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>No cardio data this period</div>
      </div>
    );
  }

  const values = [pcts.z1, pcts.z2, pcts.z3, pcts.z4, pcts.z5];
  const nonZero = values.map((v, i) => ({ v, i })).filter(({ v }) => v > 0);
  const total = nonZero.length;

  return (
    <div className="space-y-1.5">
      <div style={{ display: 'flex', height: '10px', gap: '2px', width: '100%' }}>
        {nonZero.map(({ v, i }, idx) => (
          <div
            key={i}
            style={{
              background: ZONE_STYLES[i].bg,
              flex: v,
              borderRadius:
                total === 1 ? '5px' :
                idx === 0 ? '5px 0 0 5px' :
                idx === total - 1 ? '0 5px 5px 0' : '0',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {values.map((v, i) =>
          v > 0 ? (
            <span key={i} style={{ fontSize: '10px', color: ZONE_STYLES[i].bg }}>
              {ZONE_STYLES[i].label} {v}%
            </span>
          ) : null
        )}
      </div>
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

  return (
    <div className="space-y-4">
      {/* Today */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
        <h2 className="text-sm font-semibold text-glacier-primary">Today</h2>
        {todaySessions.length === 0 ? (
          <p className="text-xs text-glacier-muted">No sessions logged today.</p>
        ) : (
          <>
            <div className="text-xs text-glacier-secondary space-y-0.5">
              <div>{todaySessions.length} session{todaySessions.length > 1 ? 's' : ''} · {formatDuration(todayDuration)} · {Math.round(todayElev)}ft gain</div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-glacier-muted mb-1">Zone distribution</div>
              <ZoneBarStrip pcts={todayPcts} />
            </div>
          </>
        )}
      </section>

      {/* This week */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
        <h2 className="text-sm font-semibold text-glacier-primary">This Week</h2>
        {weekSessions.length === 0 ? (
          <p className="text-xs text-glacier-muted">No sessions this week.</p>
        ) : (
          <>
            <div className="text-xs text-glacier-secondary">
              {weekSessions.length} session{weekSessions.length > 1 ? 's' : ''} · {formatDuration(weekDuration)} · {Math.round(weekElev)}ft gain
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-glacier-muted mb-1">Zone distribution</div>
              <ZoneBarStrip pcts={weekPcts} />
            </div>
            {weekPcts && (
              <div className="text-xs text-glacier-secondary">
                Balance:{' '}
                <span className={
                  weekPcts.aerobicPct >= 75 ? 'text-glacier-success' :
                  weekPcts.aerobicPct >= 50 ? 'text-glacier-warning' : 'text-glacier-fatigued'
                }>
                  {aerobicBalanceLabel(weekPcts.aerobicPct)}
                </span>
                <span className="text-glacier-muted ml-1">({weekPcts.aerobicPct}% Z1–Z2)</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* 4-week trend */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
        <h2 className="text-sm font-semibold text-glacier-primary">4-Week Trend</h2>
        <div className="space-y-1.5">
          {weeklyData.map((w, i) => {
            const totals = computeZoneTotals(w);
            const label = i === 0 ? 'This week' : `${i}w ago`;
            return (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-glacier-muted w-14">{label}</span>
                <div className="flex gap-3 text-glacier-secondary">
                  <span>Z1-2: <span className="text-glacier-success">{(totals.z1Hours + totals.z2Hours).toFixed(1)}h</span></span>
                  <span>Z4-5: <span className="text-glacier-warning">{(totals.z4Hours + totals.z5Hours).toFixed(1)}h</span></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-glacier-secondary">{trendLabel}</div>
        <p className="text-xs text-glacier-muted">Cardio only — see weekly analysis for full training load picture.</p>
      </section>
    </div>
  );
}
