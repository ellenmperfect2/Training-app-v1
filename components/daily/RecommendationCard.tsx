'use client';
import { useState } from 'react';
import type { RecommendationCard as Rec } from '@/lib/recommendation';
import { useTheme } from '@/lib/theme-context';
import { TYPE, GRID } from '@/lib/theme';
import { getTopoForPage } from '@/lib/topo-utils';
import TopoLayer from '@/components/TopoLayer';
import SurveyGrid from '@/components/SurveyGrid';

interface Props {
  recommendation: Rec;
  date: string;
}

// ── Section header style ──────────────────────────────────────────────────────
function SectionHeader({ children, T }: { children: React.ReactNode; T: ReturnType<typeof useTheme>['theme'] }) {
  return (
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
    }}>
      {children}
    </div>
  );
}

// ── Exercise tick mark ────────────────────────────────────────────────────────
function ExerciseTick({ T }: { T: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" style={{ flexShrink: 0, opacity: 0.4 }} aria-hidden="true">
      {/* horizontal bar */}
      <rect x="0" y="2.5" width="8" height="1" fill={T.inkDim} />
      {/* vertical tick */}
      <rect x="7" y="0" width="1" height="5" fill={T.inkDim} />
    </svg>
  );
}

// ── Warning / fatigue flag ────────────────────────────────────────────────────
function FatigueFlag({ message, T }: { message: string; T: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      background: `${T.warn}11`,
      border: `1px solid ${T.warn}33`,
      borderRadius: 3,
      padding: '7px 10px',
    }}>
      <div style={{ width: 3, height: 14, background: T.warn, borderRadius: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: T.warn, fontFamily: TYPE.sans }}>{message}</span>
    </div>
  );
}

export default function RecommendationCard({ recommendation: rec, date }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const { theme: T } = useTheme();
  const topoData = getTopoForPage('dashboard');

  return (
    <div
      className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Topo layer — behind all content */}
      <TopoLayer topoData={topoData} width={600} height={180} fadeDirection="bottom" flip={false} />
      {/* Survey grid — above topo, below content */}
      <SurveyGrid width={600} height={180} opacity={GRID.heroOpacity} />

      {/* Content — above layers */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <SectionHeader T={T}>Today&apos;s Recommendation</SectionHeader>

        <div className="flex items-start justify-between">
          <div>
            {/* Workout title — DM Serif Display */}
            <div style={{ ...TYPE.displayMd, color: T.ink }}>
              {rec.title}
            </div>
          </div>
          <span style={{ fontSize: 9, color: T.inkDim, letterSpacing: '0.08em' }}>{date}</span>
        </div>

        {/* Parameters */}
        {rec.parameters && (
          <div className="text-sm leading-relaxed" style={{ color: T.ink }}>{rec.parameters}</div>
        )}

        {/* Exercises */}
        {rec.exercises.length > 0 && (
          <div className="space-y-1">
            {rec.exercises.map((ex) => (
              <div key={ex.exerciseId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ExerciseTick T={T} />
                  <span style={{ color: T.ink }}>{ex.name}</span>
                </div>
                <span style={{ color: T.inkMid, fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 500 }}>
                  {ex.sets}×{ex.reps}
                  {ex.note && <span style={{ marginLeft: 4, color: T.inkDim, fontSize: 10 }}>({ex.note})</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Modification / proximity flags */}
        <div className="space-y-1">
          {rec.modificationFlag && (
            <FatigueFlag message={rec.modificationFlag} T={T} />
          )}
          {rec.proximityNote && (
            <div style={{ fontSize: 12, color: T.sand }}>{rec.proximityNote}</div>
          )}
        </div>

        {/* Collapsible "Why this?" */}
        <div>
          <button
            onClick={() => setWhyOpen((o) => !o)}
            style={{ fontSize: 12, color: T.inkDim, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >
            Why this? <span>{whyOpen ? '▲' : '▼'}</span>
          </button>

          {whyOpen && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `1px solid ${T.line}` }} className="space-y-1.5 text-xs">
              {rec.whyNote && <div style={{ color: T.inkMid }}>{rec.whyNote}</div>}
              {rec.configInfluenceNote && (
                <div style={{ color: T.inkDim }}>{rec.configInfluenceNote}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
