'use client';
import { useState } from 'react';
import {
  getCheckInLog,
  getWorkoutLog,
  getActiveObjectives,
  getPersonalBaseline,
  getActiveTrainingConfig,
} from '@/lib/storage';
import {
  generateWeeklyAnalysisPrompt,
  generateObjectiveSpecPrompt,
} from '@/lib/prompt-templates';
import { parseObjectiveSpecXml } from '@/lib/parsers/spec-validator';
import objectiveLibrary from '@/data/objective-library.json';
import benchmarkLibrary from '@/data/benchmark-library.json';
import assessmentLibrary from '@/data/assessment-library.json';

export default function PasteWorkflowButtons() {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<'none' | 'analysis-prompt' | 'objective-prompt' | 'objective-paste'>('none');
  const [generated, setGenerated] = useState('');
  const [objectiveDescription, setObjectiveDescription] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function generateAnalysisPrompt() {
    const prompt = generateWeeklyAnalysisPrompt({
      checkIns: getCheckInLog(),
      workoutLog: getWorkoutLog(),
      activeObjectives: getActiveObjectives(),
      activeConfig: getActiveTrainingConfig(),
      baseline: getPersonalBaseline(),
      today,
    });
    setGenerated(prompt);
    setMode('analysis-prompt');
  }

  function generateObjPrompt() {
    if (!objectiveDescription.trim()) return;
    const prompt = generateObjectiveSpecPrompt({ objectiveDescription, today });
    setGenerated(prompt);
    setMode('objective-prompt');
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleObjectivePaste() {
    const parsed = parseObjectiveSpecXml(pasteInput);
    if (!parsed.valid) {
      setResult({ success: false, message: `Validation errors:\n${parsed.errors.join('\n')}` });
      return;
    }
    const { spec } = parsed;

    const existing = objectiveLibrary as Array<{ id: string }>;
    if (existing.some((e) => e.id === spec.meta.id)) {
      setResult({ success: false, message: `ID collision: "${spec.meta.id}" already exists in the objective library. This is a Claude Code operation — paste the spec into your terminal session.` });
      return;
    }

    setResult({
      success: false,
      message: `Objective spec validated successfully.\n\nTo add "${spec.meta.name}" to the library:\n1. Copy the <objective-spec> block\n2. Paste it into your Claude Code terminal session\n3. Claude Code will run ADD OBJECTIVE FROM SPEC`,
    });
  }

  function close() {
    setMode('none');
    setGenerated('');
    setPasteInput('');
    setResult(null);
    setObjectiveDescription('');
  }

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Claude.ai Workflows</div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={generateAnalysisPrompt}
          className="px-3 py-1.5 bg-glacier-card-alt hover:bg-glacier-card border border-glacier-edge rounded text-sm text-glacier-secondary hover:text-glacier-primary transition-colors"
        >
          Generate Weekly Analysis Prompt
        </button>
        <button
          onClick={() => setMode('objective-prompt')}
          className="px-3 py-1.5 bg-glacier-card-alt hover:bg-glacier-card border border-glacier-edge rounded text-sm text-glacier-secondary hover:text-glacier-primary transition-colors"
        >
          Generate Objective Spec Prompt
        </button>
        <button
          onClick={() => setMode('objective-paste')}
          className="px-3 py-1.5 bg-glacier-card-alt hover:bg-glacier-card border border-glacier-edge rounded text-sm text-glacier-secondary hover:text-glacier-primary transition-colors"
        >
          Paste Objective Spec
        </button>
      </div>

      {/* Analysis prompt output */}
      {mode === 'analysis-prompt' && generated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-glacier-secondary">Copy and paste into Summit Coach:</span>
            <button onClick={copyToClipboard} className="text-xs text-glacier-accent hover:opacity-80 transition-opacity">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            value={generated}
            rows={10}
            className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-xs font-mono resize-none text-glacier-primary input-glow"
          />
          <button onClick={close} className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors">Close</button>
        </div>
      )}

      {/* Objective spec prompt */}
      {mode === 'objective-prompt' && !generated && (
        <div className="space-y-2">
          <label className="block text-xs text-glacier-secondary">Describe your objective:</label>
          <textarea
            value={objectiveDescription}
            onChange={(e) => setObjectiveDescription(e.target.value)}
            rows={4}
            placeholder="e.g. 5-day alpine traverse, ~3000ft/day gain, 40lb pack, max altitude 11000ft..."
            className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary resize-none input-glow"
          />
          <div className="flex gap-2">
            <button
              onClick={generateObjPrompt}
              className="px-3 py-1.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
            >
              Generate Prompt
            </button>
            <button onClick={close} className="text-xs text-glacier-muted hover:text-glacier-secondary px-2 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {mode === 'objective-prompt' && generated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-glacier-secondary">Copy and paste into Summit Coach:</span>
            <button onClick={copyToClipboard} className="text-xs text-glacier-accent hover:opacity-80 transition-opacity">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            value={generated}
            rows={10}
            className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-xs font-mono resize-none text-glacier-primary input-glow"
          />
          <button onClick={close} className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors">Close</button>
        </div>
      )}

      {/* Objective spec paste */}
      {mode === 'objective-paste' && (
        <div className="space-y-2">
          <label className="block text-xs text-glacier-secondary">Paste the objective spec response from Summit Coach:</label>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            rows={8}
            className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-xs font-mono resize-none text-glacier-primary input-glow"
          />
          <div className="flex gap-2">
            <button
              onClick={handleObjectivePaste}
              className="px-3 py-1.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
            >
              Validate &amp; Preview
            </button>
            <button onClick={close} className="text-xs text-glacier-muted hover:text-glacier-secondary px-2 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`text-xs rounded px-3 py-2 whitespace-pre-wrap ${result.success ? 'bg-glacier-success-soft text-glacier-success' : 'bg-glacier-card-alt text-glacier-primary'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
