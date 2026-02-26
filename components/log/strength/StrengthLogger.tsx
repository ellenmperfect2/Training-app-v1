'use client';
import { useState } from 'react';
import {
  appendStrengthSession,
  getProgressionHistory,
  setProgressionHistory,
  type StrengthSession,
} from '@/lib/storage';
import { updateStrengthProgression, getLastStrengthSession } from '@/lib/progression';
import exerciseLibraryData from '@/data/exercise-library.json';

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

interface SetEntry {
  reps: string;
  weight: string;
  unit: 'lbs' | 'kg';
  isAutoPopulated?: boolean;
}
interface ExerciseEntry { exerciseId: string; sets: SetEntry[]; }

function buildSets(
  defSets: number,
  defReps: number,
  lastSets: Array<{ reps: number; weight: number; unit: string }> | null
): SetEntry[] {
  return Array.from({ length: defSets }, (_, i) => {
    const last = lastSets?.[i];
    return {
      reps: last ? String(last.reps) : String(defReps),
      weight: last ? String(last.weight) : '',
      unit: (last?.unit as 'lbs' | 'kg') ?? 'lbs',
      isAutoPopulated: !!last,
    };
  });
}

export default function StrengthLogger() {
  const exercises = exerciseLibraryData.exercises;
  const templates = exerciseLibraryData.workoutTemplates;

  const [date, setDate] = useState(today());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [progressionHistory, setLocalHistory] = useState(() => getProgressionHistory());

  function loadTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const entries: ExerciseEntry[] = tpl.exerciseIds.map((id) => {
      const def = exercises.find((e) => e.id === id);
      const lastSets = getLastStrengthSession(progressionHistory, id);
      return {
        exerciseId: id,
        sets: buildSets(def?.defaults.sets ?? 3, def?.defaults.reps ?? 8, lastSets),
      };
    });
    setExerciseEntries(entries);
    setSelectedTemplate(templateId);
  }

  function addExercise(exerciseId: string) {
    const def = exercises.find((e) => e.id === exerciseId);
    const lastSets = getLastStrengthSession(progressionHistory, exerciseId);
    setExerciseEntries((prev) => [
      ...prev,
      {
        exerciseId,
        sets: buildSets(def?.defaults.sets ?? 3, def?.defaults.reps ?? 8, lastSets),
      },
    ]);
  }

  function removeExercise(idx: number) {
    setExerciseEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setExerciseEntries((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: [...ex.sets, { reps: '', weight: '', unit: 'lbs' }] }
          : ex
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExerciseEntries((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
          : ex
      )
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExerciseEntries((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value, isAutoPopulated: false } : s
              ),
            }
          : ex
      )
    );
  }

  function handleSave() {
    const session: StrengthSession = {
      id: uid(),
      date,
      templateUsed: selectedTemplate || null,
      exercises: exerciseEntries
        .filter((e) => e.sets.some((s) => s.reps && s.weight))
        .map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets
            .filter((s) => s.reps && s.weight)
            .map((s, i) => ({
              setNumber: i + 1,
              reps: parseInt(s.reps) || 0,
              weight: parseFloat(s.weight) || 0,
              unit: s.unit,
            })),
        })),
      notes,
    };

    appendStrengthSession(session);

    const updatedHistory = updateStrengthProgression(progressionHistory, session);
    setProgressionHistory(updatedHistory);
    setLocalHistory(updatedHistory);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setExerciseEntries([]);
    setNotes('');
    setSelectedTemplate('');
  }

  return (
    <div className="space-y-6">
      {/* Date */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Date</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Template picker */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Template</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => loadTemplate(t.id)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                selectedTemplate === t.id
                  ? 'bg-zinc-600 border-zinc-500'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add exercise */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Add exercise</label>
        <select
          onChange={(e) => { if (e.target.value) addExercise(e.target.value); e.target.value = ''; }}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="">Select exercise…</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {/* Exercise list */}
      {exerciseEntries.map((entry, exIdx) => {
        const def = exercises.find((e) => e.id === entry.exerciseId);
        const hasAutoPopulated = entry.sets.some((s) => s.isAutoPopulated);
        return (
          <div key={exIdx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{def?.name ?? entry.exerciseId}</span>
                {hasAutoPopulated && (
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                    last session
                  </span>
                )}
              </div>
              <button onClick={() => removeExercise(exIdx)} className="text-zinc-600 hover:text-zinc-400 text-xs">Remove</button>
            </div>

            <div className="space-y-2">
              {entry.sets.map((set, setIdx) => (
                <div key={setIdx} className="flex items-center gap-2 mt-5">
                  <span className="text-xs text-zinc-600 w-6">{setIdx + 1}</span>
                  <input
                    type="number"
                    value={set.reps}
                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                    placeholder="reps"
                    className={`w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm ${
                      set.isAutoPopulated ? 'text-zinc-400' : ''
                    }`}
                  />
                  <span className="text-zinc-600 text-xs">×</span>
                  <input
                    type="number"
                    value={set.weight}
                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                    placeholder="lbs"
                    className={`w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm ${
                      set.isAutoPopulated ? 'text-zinc-400' : ''
                    }`}
                  />
                  <select
                    value={set.unit}
                    onChange={(e) => updateSet(exIdx, setIdx, 'unit', e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                  <button onClick={() => removeSet(exIdx, setIdx)} className="text-zinc-700 hover:text-zinc-500 text-xs">✕</button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exIdx)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              + Add set
            </button>
          </div>
        );
      })}

      {/* Notes */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={exerciseEntries.length === 0}
        className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium"
      >
        {saved ? 'Saved ✓' : 'Save Session'}
      </button>
    </div>
  );
}
