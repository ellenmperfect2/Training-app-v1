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
      packWeight: annotation.packWeight ? (parseFloat(annotation.packWeight) || undefined) : undefined,
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
        className="border-2 border-dashed border-glacier-edge rounded-lg p-8 text-center cursor-pointer hover:border-glacier-edge-hover transition-colors duration-150"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {parsing ? (
          <p className="text-glacier-secondary text-sm">Parsing FIT file…</p>
        ) : (
          <>
            <p className="text-glacier-secondary text-sm">Drop a .fit file here, or click to select</p>
            <p className="text-glacier-muted text-xs mt-1">Garmin / COROS FIT files only</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".fit" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && (
        <div className="bg-glacier-danger-soft border border-glacier-danger rounded px-4 py-3 text-sm text-glacier-danger">
          {error}
        </div>
      )}

      {noHrNote && (
        <div className="bg-glacier-card border border-glacier-edge rounded px-4 py-2 text-xs text-glacier-secondary">
          {noHrNote}
        </div>
      )}

      {/* Annotation form */}
      {pending && (
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4">
          <div>
            <div className="font-medium text-sm text-glacier-primary">{pending.activityType}</div>
            <div className="text-xs text-glacier-secondary mt-0.5">
              {pending.session.date}
              {pending.session.duration > 0 && ` · ${Math.round(pending.session.duration / 60)}min`}
              {pending.session.elevationGain > 0 && ` · ${Math.round(pending.session.elevationGain)}ft gain`}
              {pending.session.avgHR && ` · avg HR ${pending.session.avgHR}bpm`}
            </div>
            {pending.session.zoneDistribution && (
              <div className="text-xs text-glacier-muted mt-1">
                Z1:{pending.session.zoneDistribution.z1}m · Z2:{pending.session.zoneDistribution.z2}m · Z3:{pending.session.zoneDistribution.z3}m · Z4:{pending.session.zoneDistribution.z4}m · Z5:{pending.session.zoneDistribution.z5}m
              </div>
            )}
          </div>

          {pending.annotationFields.includes('packWeight') && (
            <div>
              <label className="block text-xs text-glacier-secondary mb-2">Pack weight (lbs) — leave blank if none</label>
              <input
                type="number" min={0} placeholder="0"
                value={annotation.packWeight ?? ''}
                onChange={(e) => setAnnotation((a) => ({ ...a, packWeight: e.target.value }))}
                className="w-32 bg-glacier-card-alt border border-glacier-edge rounded px-3 py-1.5 text-sm text-glacier-primary input-glow placeholder:text-glacier-muted"
              />
            </div>
          )}

          {pending.annotationFields.includes('terrain') && (
            <div>
              <label className="block text-xs text-glacier-secondary mb-2">Terrain</label>
              <div className="flex gap-2 flex-wrap">
                {['road', 'trail', 'mountain', 'off-trail', 'snow'].map((t) => (
                  <button key={t} onClick={() => setAnnotation((a) => ({ ...a, terrain: t }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                      annotation.terrain === t
                        ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                        : 'bg-glacier-card border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
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
              <label className="block text-xs text-glacier-secondary mb-2">Were weights used? (e.g. weighted vest, pack)</label>
              <div className="flex gap-2">
                {['true', 'false'].map((v) => (
                  <button key={v} onClick={() => setAnnotation((a) => ({ ...a, weightsUsed: v }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      annotation.weightsUsed === v
                        ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                        : 'bg-glacier-card border-glacier-edge text-glacier-secondary'
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
              <label className="block text-xs text-glacier-secondary mb-2">Perceived effort (1–10)</label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setAnnotation((a) => ({ ...a, perceivedEffort: String(n) }))}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      annotation.perceivedEffort === String(n)
                        ? 'bg-glacier-accent text-glacier-bg'
                        : 'bg-glacier-card border border-glacier-edge text-glacier-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Notes (optional)</label>
            <textarea value={annotation.notes ?? ''} onChange={(e) => setAnnotation((a) => ({ ...a, notes: e.target.value }))}
              rows={2} className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary resize-none input-glow" />
          </div>

          <button onClick={handleSave}
            className="w-full py-2.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity">
            Save to Log
          </button>
        </div>
      )}

      {saved && (
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-glacier-success">Saved: {savedFilename}</div>
            {savedSummary && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  savedSummary.level === 'high'
                    ? 'bg-glacier-warning-soft text-glacier-warning'
                    : savedSummary.level === 'medium'
                    ? 'bg-glacier-accent-soft text-glacier-accent'
                    : 'bg-glacier-card-alt text-glacier-secondary'
                }`}
              >
                {savedSummary.level} load
              </span>
            )}
          </div>

          {savedSummary?.dominantGroup && (
            <div className="text-xs text-glacier-secondary">Dominant: {savedSummary.dominantGroup}</div>
          )}

          {savedSummary && (
            <div>
              <button
                onClick={() => setLoadDetailOpen((o) => !o)}
                className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors flex items-center gap-1"
              >
                What drove this? <span className="text-glacier-muted">{loadDetailOpen ? '▲' : '▼'}</span>
              </button>
              {loadDetailOpen && (
                <div className="mt-2 space-y-1 text-xs text-glacier-secondary border-l border-glacier-edge pl-3">
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
