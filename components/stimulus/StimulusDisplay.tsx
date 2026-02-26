'use client';
import { useState } from 'react';
import type { StimulusResult } from '@/lib/stimulus-engine';
import type { StimulusMap } from '@/lib/storage';

const GROUPS: { key: keyof StimulusMap; label: string }[] = [
  { key: 'posteriorChain', label: 'Posterior chain' },
  { key: 'quadDominant', label: 'Quad dominant' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'core', label: 'Core' },
  { key: 'loadedCarry', label: 'Loaded carry' },
  { key: 'forearmsGrip', label: 'Forearm / grip' },
];

const LEVEL_COLORS: Record<string, string> = {
  low:    'bg-glacier-secondary',
  medium: 'bg-glacier-accent',
  high:   'bg-glacier-warning',
};

const MAX_FILL = 6;

interface Props {
  stimulus: StimulusResult;
}

export default function StimulusDisplay({ stimulus }: Props) {
  const [expandedKey, setExpandedKey] = useState<keyof StimulusMap | null>(null);

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">
        Weekly Stimulus
      </div>

      <div className="space-y-1">
        {GROUPS.map(({ key, label }) => {
          const raw = stimulus.raw[key];
          const level = stimulus.levels[key];
          const fillPct = Math.min(100, (raw / MAX_FILL) * 100);
          const isExpanded = expandedKey === key;
          const context = stimulus.contexts?.[key];

          return (
            <div key={key}>
              <div
                className="flex items-center gap-3 cursor-pointer py-1 hover:opacity-80 transition-opacity"
                onClick={() => setExpandedKey(isExpanded ? null : key)}
                title="Click for details"
              >
                <span className="text-xs text-glacier-secondary w-32 shrink-0">{label}</span>
                <div className="flex-1 stimulus-bar">
                  <div
                    className={`stimulus-bar-fill ${LEVEL_COLORS[level]}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span
                  className={`text-xs w-12 shrink-0 ${
                    level === 'high' ? 'text-glacier-warning' : 'text-glacier-secondary'
                  }`}
                >
                  {level}
                </span>
                <span className="text-glacier-muted text-xs w-3 shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && context && (
                <div className="ml-32 pl-3 pb-2 text-xs space-y-1.5 border-l border-glacier-edge">
                  <div className="text-glacier-muted">{context.baseline}</div>
                  {context.contributors.map((c, i) => (
                    <div key={i} className="text-glacier-secondary">{c}</div>
                  ))}
                  <div className="text-glacier-primary mt-1">{context.implication}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stimulus.flags.length > 0 && (
        <div className="space-y-1">
          {stimulus.flags.map((flag, i) => (
            <div key={i} className="text-xs text-glacier-warning">{flag}</div>
          ))}
        </div>
      )}
    </div>
  );
}
