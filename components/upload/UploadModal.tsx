'use client';
import { useState, useRef } from 'react';
import { parseFitFile, type FitParseResult } from '@/lib/fit-parser';
import { appendCardioSession, type CardioSession } from '@/lib/storage';
import { getCardioSessionStimulusSummary, type CardioSessionSummary } from '@/lib/stimulus-engine';

export default function UploadModal() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FitParseResult | null>(null);
  const [annotation, setAnnotation] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [savedFilename, setSavedFilename] = useState('');
  const [savedSummary, setSavedSummary] = useState<CardioSessionSummary | null>(null);
  const [noHrNote, setNoHrNote] = useState('');
  const [loadDetailOpen, setLoadDetailOpen] = useState(false);

  async function handleFile(file: File) {
    setError('');
    setSaved(false);
    setNoHrNote('');
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseFitFile(buffer);

      if (!result.success) {
        setError(result.error);
        setParsing(false);
        return;
      }

      setPending(result);
      const defaults: Record<string, string> = {};
      for (const f of result.annotationFields) defaults[f] = '';
      setAnnotation(defaults);

      if (result.noHrData) {
        setNoHrNote('No HR data in this file — zone distribution and training load not available.');
      }
      if (result.derivedElevation) {
        setNoHrNote((prev) => [prev, 'Elevation derived from GPS track (session value was 0).'].filter(Boolean).join(' '));
      }
    } catch {
      setError('Failed to read file.');
    }

    setParsing(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.fit')) {
      setError('Please upload a .fit file.');
      return;
    }
    handleFile(file);
  }

  function handleSave() {
    if (!pending) return;

    const session: CardioSession = {
      ...pending.session,
      weightsUsed: annotation.weightsUsed === 'true' ? true : annotation.weightsUsed === 'false' ? false : undefined,
      packWeight: annotation.packWeight || undefined,
      terrain: annotation.terrain || undefined,
      perceivedEffort: annotation.perceivedEffort ? parseInt(annotation.perceivedEffort) : undefined,
      notes: annotation.notes || undefined,
    };

    appendCardioSession(session);
    const summary = getCardioSessionStimulusSummary(session);
    setSavedSummary(summary);
    setSavedFilename(pending.activityType);
    setLoadDetailOpen(false);
    setPending(null);
    setAnnotation({});
    setSaved(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {parsing ? (
          <p className="text-zinc-400 text-sm">Parsing FIT file…</p>
        ) : (
          <>
            <p className="text-zinc-400 text-sm">Drop a .fit file here, or click to select</p>
            <p className="text-zinc-600 text-xs mt-1">Garmin / COROS FIT files only</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".fit" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {noHrNote && (
        <div className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-xs text-zinc-400">
          {noHrNote}
        </div>
      )}

      {/* Annotation form */}
      {pending && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
          <div>
            <div className="font-medium text-sm">{pending.activityType}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {pending.session.date}
              {pending.session.duration > 0 && ` · ${Math.round(pending.session.duration / 60)}min`}
              {pending.session.elevationGain > 0 && ` · ${Math.round(pending.session.elevationGain)}ft gain`}
              {pending.session.avgHR && ` · avg HR ${pending.session.avgHR}bpm`}
            </div>
            {pending.session.zoneDistribution && (
              <div className="text-xs text-zinc-600 mt-1">
                Z1:{pending.session.zoneDistribution.z1}m · Z2:{pending.session.zoneDistribution.z2}m · Z3:{pending.session.zoneDistribution.z3}m · Z4:{pending.session.zoneDistribution.z4}m · Z5:{pending.session.zoneDistribution.z5}m
              </div>
            )}
          </div>

          {pending.annotationFields.includes('packWeight') && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Pack weight <span className="text-red-400">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'light', label: 'Light (15–25 lbs)' },
                  { value: 'moderate', label: 'Moderate (25–40 lbs)' },
                  { value: 'heavy', label: 'Heavy (40+ lbs)' },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => setAnnotation((a) => ({ ...a, packWeight: opt.value }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      annotation.packWeight === opt.value
                        ? 'bg-zinc-600 border-zinc-500'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.annotationFields.includes('terrain') && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Terrain</label>
              <div className="flex gap-2 flex-wrap">
                {['road', 'trail', 'mountain', 'off-trail', 'snow'].map((t) => (
                  <button key={t} onClick={() => setAnnotation((a) => ({ ...a, terrain: t }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                      annotation.terrain === t
                        ? 'bg-zinc-600 border-zinc-500'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.annotationFields.includes('weightsUsed') && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Were weights used? (e.g. weighted vest, pack)</label>
              <div className="flex gap-2">
                {['true', 'false'].map((v) => (
                  <button key={v} onClick={() => setAnnotation((a) => ({ ...a, weightsUsed: v }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      annotation.weightsUsed === v ? 'bg-zinc-600 border-zinc-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {v === 'true' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.annotationFields.includes('perceivedEffort') && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Perceived effort (1–10)</label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setAnnotation((a) => ({ ...a, perceivedEffort: String(n) }))}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      annotation.perceivedEffort === String(n)
                        ? 'bg-zinc-600 text-zinc-100'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
            <textarea value={annotation.notes ?? ''} onChange={(e) => setAnnotation((a) => ({ ...a, notes: e.target.value }))}
              rows={2} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm resize-none" />
          </div>

          <button onClick={handleSave}
            className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium">
            Save to Log
          </button>
        </div>
      )}

      {saved && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-400">Saved: {savedFilename}</div>
            {savedSummary && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  savedSummary.level === 'high'
                    ? 'bg-amber-900/40 text-amber-400'
                    : savedSummary.level === 'medium'
                    ? 'bg-sky-900/40 text-sky-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {savedSummary.level} load
              </span>
            )}
          </div>

          {savedSummary?.dominantGroup && (
            <div className="text-xs text-zinc-500">Dominant: {savedSummary.dominantGroup}</div>
          )}

          {savedSummary && (
            <div>
              <button
                onClick={() => setLoadDetailOpen((o) => !o)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
              >
                What drove this? <span className="text-zinc-700">{loadDetailOpen ? '▲' : '▼'}</span>
              </button>
              {loadDetailOpen && (
                <div className="mt-2 space-y-1 text-xs text-zinc-500 border-l border-zinc-800 pl-3">
                  {savedSummary.factors.map((f, i) => <div key={i}>{f}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
