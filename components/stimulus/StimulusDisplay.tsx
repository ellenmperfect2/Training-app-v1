'use client';
import { useState } from 'react';
import type { StimulusResult } from '@/lib/stimulus-engine';
import type { StimulusMap } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';
import { TYPE } from '@/lib/theme';

const GROUPS: { key: keyof StimulusMap; label: string }[] = [
  { key: 'posteriorChain', label: 'Posterior chain' },
  { key: 'quadDominant', label: 'Quad dominant' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'core', label: 'Core' },
  { key: 'loadedCarry', label: 'Loaded carry' },
  { key: 'forearmsGrip', label: 'Forearm / grip' },
];

const MAX_FILL = 6;

interface Props {
  stimulus: StimulusResult;
}

// ── T-tick row marker ─────────────────────────────────────────────────────────
function TTick({ color }: { color: string }) {
  return (
    <svg width="6" height="8" viewBox="0 0 6 8" style={{ flexShrink: 0, opacity: 0.35 }} aria-hidden="true">
      {/* top horizontal */}
      <rect x="0" y="0" width="6" height="1" fill={color} />
      {/* vertical stem */}
      <rect x="2.5" y="0" width="1" height="8" fill={color} />
    </svg>
  );
}

export default function StimulusDisplay({ stimulus }: Props) {
  const [expandedKey, setExpandedKey] = useState<keyof StimulusMap | null>(null);
  const { theme: T } = useTheme();

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
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
        Weekly Stimulus
      </div>

      <div className="space-y-1">
        {GROUPS.map(({ key, label }) => {
          const raw = stimulus.raw[key];
          const level = stimulus.levels[key];
          const fillPct = Math.min(100, (raw / MAX_FILL) * 100);
          const isExpanded = expandedKey === key;
          const context = stimulus.contexts?.[key];

          const fillColor =
            level === 'high' ? T.mossHi :
            level === 'medium' ? T.moss :
            T.inkDim;

          return (
            <div key={key}>
              <div
                className="flex items-center gap-2 cursor-pointer py-1 hover:opacity-80 transition-opacity"
                onClick={() => setExpandedKey(isExpanded ? null : key)}
                title="Click for details"
              >
                {/* T-tick row marker */}
                <TTick color={T.inkDim} />

                <span style={{ fontSize: 9, color: T.inkMid, width: 120, flexShrink: 0 }}>{label}</span>

                {/* Stimulus bar */}
                <div className="flex-1 stimulus-bar">
                  <div
                    className="stimulus-bar-fill"
                    style={{ width: `${fillPct}%`, background: fillColor }}
                  />
                </div>

                <span style={{ fontSize: 9, color: fillColor, width: 28, flexShrink: 0, textAlign: 'right' }}>
                  {level}
                </span>
                <span style={{ color: T.inkDim, fontSize: 9, width: 12, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && context && (
                <div style={{ marginLeft: 126, paddingLeft: 12, paddingBottom: 8, borderLeft: `1px solid ${T.line}` }} className="text-xs space-y-1.5">
                  <div style={{ color: T.inkDim }}>{context.baseline}</div>
                  {context.contributors.map((c, i) => (
                    <div key={i} style={{ color: T.inkMid }}>{c}</div>
                  ))}
                  <div style={{ color: T.ink, marginTop: 4 }}>{context.implication}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stimulus.flags.length > 0 && (
        <div className="space-y-1">
          {stimulus.flags.map((flag, i) => (
            <div
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: `${T.warn}11`,
                border: `1px solid ${T.warn}33`,
                borderRadius: 3,
                padding: '7px 10px',
                fontSize: 10,
                color: T.warn,
              }}
            >
              <div style={{ width: 3, height: 14, background: T.warn, borderRadius: 1, flexShrink: 0 }} />
              {flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
