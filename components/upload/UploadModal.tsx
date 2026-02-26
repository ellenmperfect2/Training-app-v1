'use client';
import { useState, useRef } from 'react';
import { parseCorosCsv, getAnnotationRequirements } from '@/lib/parsers/csv-parser';
import { appendCardioSession, type ParsedCorosSession } from '@/lib/storage';

type ParsedPending = Awaited<ReturnType<typeof parseCorosCsv>> & { success: true };

export default function UploadModal() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ParsedPending | null>(null);
  const [annotation, setAnnotation] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [savedFiles, setSavedFiles] = useState<string[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setSaved(false);

    const file = files[0];
    const text = await file.text();
    const result = parseCorosCsv(file.name, text);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Check if IndoorStrength — suggest native logger
    if (result.corosType === 'IndoorStrength') {
      setError('IndoorStrength detected — use the Strength logger instead for detailed set/rep tracking.');
      return;
    }

    setPending(result);
    // Pre-fill annotation defaults
    const defaults: Record<string, string> = {};
    for (const field of result.annotationFields) {
      defaults[field] = '';
    }
    setAnnotation(defaults);
  }

  function handleSave() {
    if (!pending) return;

    const session: ParsedCorosSession = {
      ...pending.session,
      annotation: {
        packWeight: annotation.packWeight as ParsedCorosSession['annotation']['packWeight'] | undefined,
        terrain: annotation.terrain || undefined,
        inclineUsed: annotation.inclineUsed === 'true' ? true : annotation.inclineUsed === 'false' ? false : undefined,
        perceivedEffort: annotation.perceivedEffort ? parseInt(annotation.perceivedEffort) : undefined,
        notes: annotation.notes || undefined,
      },
    };

    appendCardioSession(session);
    setSavedFiles((prev) => [...prev, pending.session.filename]);
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
        <p className="text-zinc-400 text-sm">Drop a Coros CSV here, or click to select</p>
        <p className="text-zinc-600 text-xs mt-1">Format: [ActivityType][YYYYMMDD][HHMMSS].csv</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Annotation form */}
      {pending && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
          <div>
            <div className="font-medium text-sm">{pending.corosType}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {pending.session.date} · {Math.round(pending.session.durationMinutes)}min
              {pending.session.elevationGainM > 0 && ` · ${Math.round(pending.session.elevationGainM * 3.281)}ft gain`}
              {pending.session.avgHR && ` · avg HR ${pending.session.avgHR}bpm`}
            </div>
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

          {pending.annotationFields.includes('inclineUsed') && (pending.session.elevationGainM ?? 0) > 0 && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Incline used?</label>
              <div className="flex gap-2">
                {['true', 'false'].map((v) => (
                  <button key={v} onClick={() => setAnnotation((a) => ({ ...a, inclineUsed: v }))}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      annotation.inclineUsed === v ? 'bg-zinc-600 border-zinc-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
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

      {saved && savedFiles.length > 0 && (
        <div className="text-sm text-green-400">
          Saved: {savedFiles[savedFiles.length - 1]}
        </div>
      )}
    </div>
  );
}
