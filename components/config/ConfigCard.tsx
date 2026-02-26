'use client';
import { useState } from 'react';
import type { TrainingConfig } from '@/lib/storage';
import { parseTrainingConfigXml, isConfigExpired } from '@/lib/parsers/config-parser';
import { setActiveTrainingConfig } from '@/lib/storage';

interface Props {
  config: TrainingConfig;
}

export default function ConfigCard({ config }: Props) {
  const [showPaste, setShowPaste] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const expired = isConfigExpired(config);
  const isDefault = config['generated-date'] === 'default';

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
