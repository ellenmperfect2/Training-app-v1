'use client';
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
  low: 'bg-zinc-600',
  medium: 'bg-sky-700',
  high: 'bg-amber-600',
};

const MAX_FILL = 6; // raw value that = 100% bar fill

interface Props {
  stimulus: StimulusResult;
}

export default function StimulusDisplay({ stimulus }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
        Weekly Stimulus
      </div>

      <div className="space-y-2">
        {GROUPS.map(({ key, label }) => {
          const raw = stimulus.raw[key];
          const level = stimulus.levels[key];
          const fillPct = Math.min(100, (raw / MAX_FILL) * 100);

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
              <div className="flex-1 stimulus-bar">
                <div
                  className={`stimulus-bar-fill ${LEVEL_COLORS[level]}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <span className={`text-xs w-12 shrink-0 ${level === 'high' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {level}
              </span>
            </div>
          );
        })}
      </div>

      {stimulus.flags.length > 0 && (
        <div className="space-y-1">
          {stimulus.flags.map((flag, i) => (
            <div key={i} className="text-xs text-amber-400">{flag}</div>
          ))}
        </div>
      )}
    </div>
  );
}
