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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Training Config</div>
        {!isDefault && (
          <span className={`text-xs ${expired ? 'text-red-400' : 'text-zinc-500'}`}>
            {expired ? 'Expired' : `Expires ${config['expires-date']}`}
          </span>
        )}
      </div>

      {isDefault ? (
        <div className="text-xs text-zinc-500">Using default config. Run weekly analysis to get personalized recommendations.</div>
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
        <div className="text-xs text-zinc-600 italic border-t border-zinc-800 pt-2">
          {config['override-reason']}
        </div>
      )}

      <button
        onClick={() => setShowPaste((v) => !v)}
        className="text-xs text-zinc-400 hover:text-zinc-200 underline"
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
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs font-mono resize-none"
          />
          <button
            onClick={handleApplyConfig}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium"
          >
            Apply Config
          </button>
        </div>
      )}

      {result && (
        <div className={`text-xs rounded px-3 py-2 whitespace-pre-wrap ${result.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  );
}
