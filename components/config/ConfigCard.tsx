'use client';
import { useState } from 'react';
import type { TrainingConfig, CardioWeeklyTarget, StrengthWeeklyTarget, ClimbingWeeklyTarget } from '@/lib/storage';
import { parseTrainingConfigXml, isConfigExpired } from '@/lib/parsers/config-parser';
import { setActiveTrainingConfig } from '@/lib/storage';

interface Props {
  config: TrainingConfig;
}

// ── Direction badge ────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'increase' | 'decrease' | 'hold' }) {
  if (direction === 'increase') {
    return <span className="text-glacier-success font-semibold">↑</span>;
  }
  if (direction === 'decrease') {
    return <span className="text-glacier-danger font-semibold">↓</span>;
  }
  return <span className="text-glacier-muted">→</span>;
}

// ── Weekly target blocks ───────────────────────────────────────────────────

function CardioTargetBlock({ target, anaerobicFlag }: {
  target: CardioWeeklyTarget;
  anaerobicFlag?: string;
}) {
  const zoneLabel = target['primary-zone'] === 'z1-2' ? 'Z1–2 aerobic'
    : target['primary-zone'] === 'z3' ? 'Z3 tempo'
    : 'Z4–5 threshold';
  const durStr = target['session-duration-hours'] > 0
    ? `${target['session-duration-hours']}h/session`
    : null;
  const showFlag = anaerobicFlag && anaerobicFlag !== 'none';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-glacier-secondary font-medium">Cardio</span>
        <DirectionBadge direction={target.direction} />
        <span className="text-xs text-glacier-primary">{target.sessions}x/wk</span>
        <span className="text-xs text-glacier-muted">·</span>
        <span className="text-xs text-glacier-primary">{zoneLabel}</span>
        {durStr && <>
          <span className="text-xs text-glacier-muted">·</span>
          <span className="text-xs text-glacier-primary">{durStr}</span>
        </>}
        {showFlag && (
          <span className={`text-xs px-1.5 py-0.5 rounded border ${
            anaerobicFlag === 'develop'
              ? 'border-glacier-accent text-glacier-accent'
              : anaerobicFlag === 'reduce'
              ? 'border-glacier-danger text-glacier-danger'
              : 'border-glacier-secondary text-glacier-secondary'
          }`}>
            {anaerobicFlag}
          </span>
        )}
      </div>
      {target.note && !target.note.includes('defaults active') && (
        <p className="text-xs text-glacier-muted italic">{target.note}</p>
      )}
    </div>
  );
}

function StrengthTargetBlock({ target }: { target: StrengthWeeklyTarget }) {
  const schemeLabel = target['rep-scheme'] === 'strength' ? 'strength (1–5)'
    : target['rep-scheme'] === 'endurance' ? 'endurance (12+)'
    : 'hypertrophy (6–12)';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-glacier-secondary font-medium">Strength</span>
        <DirectionBadge direction={target.direction} />
        <span className="text-xs text-glacier-primary">{target.sessions}x/wk</span>
        <span className="text-xs text-glacier-muted">·</span>
        <span className="text-xs text-glacier-primary">{target['primary-focus']}</span>
        <span className="text-xs text-glacier-muted">·</span>
        <span className="text-xs text-glacier-primary">{schemeLabel}</span>
      </div>
      {target.note && !target.note.includes('defaults active') && (
        <p className="text-xs text-glacier-muted italic">{target.note}</p>
      )}
    </div>
  );
}

function ClimbingTargetBlock({ target }: { target: ClimbingWeeklyTarget }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-glacier-secondary font-medium">Climbing</span>
        <DirectionBadge direction={target.direction} />
        <span className="text-xs text-glacier-primary">{target.sessions}x/wk</span>
        <span className="text-xs text-glacier-muted">·</span>
        <span className="text-xs text-glacier-primary">{target['primary-focus']}</span>
      </div>
      {target.note && !target.note.includes('defaults active') && (
        <p className="text-xs text-glacier-muted italic">{target.note}</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ConfigCard({ config }: Props) {
  const [showPaste, setShowPaste] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const expired = isConfigExpired(config);
  const isDefault = config['generated-date'] === 'default';

  const cardioTarget = config['cardio-weekly-target'];
  const strengthTarget = config['strength-weekly-target'];
  const climbingTarget = config['climbing-weekly-target'];
  const anaerobicFlag = config['cardio-anaerobic-flag'];
  const loadedCarryDir = config['loaded-carry-direction'];

  function handleApplyConfig() {
    const parsed = parseTrainingConfigXml(pasteInput);
    if (!parsed.valid) {
      setResult({ success: false, message: `Validation errors:\n${parsed.errors.join('\n')}` });
      return;
    }
    setActiveTrainingConfig(parsed.config);
    setResult({ success: true, message: 'Config applied. Reload the page to see updated recommendations.' });
    setPasteInput('');
    setShowPaste(false);
  }

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="flex items-center justify-between">
        <div className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Training Config</div>
        {!isDefault && (
          <span className={`text-xs ${expired ? 'text-glacier-danger' : 'text-glacier-muted'}`}>
            {expired ? 'Expired' : `Expires ${config['expires-date']}`}
          </span>
        )}
      </div>

      {isDefault ? (
        <div className="text-xs text-glacier-secondary">Using default config. Run weekly analysis to get personalized recommendations.</div>
      ) : (
        <div className="space-y-3">
          {/* Existing priority/emphasis grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <ConfigRow label="Fatigue" value={config['fatigue-state']} />
            <ConfigRow label="Cardio" value={config['cardio-priority']} />
            <ConfigRow label="Strength" value={config['strength-priority']} />
            <ConfigRow label="Climbing" value={config['climbing-priority']} />
            <ConfigRow label="Posterior chain" value={config['posterior-chain-emphasis']} />
            <ConfigRow label="Single leg" value={config['single-leg-emphasis']} />
            <ConfigRow label="Push" value={config['push-emphasis']} />
            <ConfigRow label="Pull" value={config['pull-emphasis']} />
            <ConfigRow label="Zone 2 min" value={`${config['cardio-zone2-minimum-hours']}hr`} />
            <ConfigRow label="Climb max" value={`${config['climbing-frequency-max']}x/wk`} />
          </div>

          {/* Weekly target blocks */}
          {(cardioTarget || strengthTarget || climbingTarget) && (
            <div className="border-t border-glacier-edge pt-3 space-y-2.5">
              {cardioTarget && (
                <CardioTargetBlock target={cardioTarget} anaerobicFlag={anaerobicFlag} />
              )}
              {strengthTarget && <StrengthTargetBlock target={strengthTarget} />}
              {climbingTarget && <ClimbingTargetBlock target={climbingTarget} />}

              {/* Loaded carry */}
              {config['loaded-carry-sessions'] > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-glacier-secondary font-medium">Loaded carry</span>
                  {loadedCarryDir && <DirectionBadge direction={loadedCarryDir} />}
                  <span className="text-xs text-glacier-primary">
                    {config['loaded-carry-sessions']}x/wk
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {config['override-reason'] && !isDefault && (
        <div className="text-xs text-glacier-muted italic border-t border-glacier-edge pt-2">
          {config['override-reason']}
        </div>
      )}

      <button
        onClick={() => setShowPaste((v) => !v)}
        className="text-xs text-glacier-secondary hover:text-glacier-primary underline transition-colors"
      >
        {showPaste ? 'Cancel' : 'Paste analysis response'}
      </button>

      {showPaste && (
        <div className="space-y-2">
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            rows={6}
            placeholder="Paste the full response from Summit Coach here..."
            className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-xs font-mono resize-none text-glacier-primary input-glow"
          />
          <button
            onClick={handleApplyConfig}
            className="px-4 py-2 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
          >
            Apply Config
          </button>
        </div>
      )}

      {result && (
        <div className={`text-xs rounded px-3 py-2 whitespace-pre-wrap ${result.success ? 'bg-glacier-success-soft text-glacier-success' : 'bg-glacier-danger-soft text-glacier-danger'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-glacier-secondary">{label}</span>
      <span className="text-glacier-primary">{value}</span>
    </div>
  );
}
