'use client';
import { useState, useEffect } from 'react';
import { getWorkoutLog, setWorkoutLog, type StrengthSession } from '@/lib/storage';
import exerciseLibraryData from '@/data/exercise-library.json';

interface Props {
  onClose: () => void;
}

export default function StrengthHistory({ onClose }: Props) {
  const exercises = exerciseLibraryData.exercises;
  const templates = (exerciseLibraryData as { workoutTemplates: Array<{ id: string; name: string }> }).workoutTemplates;

  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const log = getWorkoutLog();
    setSessions([...log.strength].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateSetValue(
    sessionId: string,
    exIdx: number,
    setIdx: number,
    field: 'reps' | 'weight',
    rawValue: string
  ) {
    // Update local state immediately
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedExercises = s.exercises.map((ex, ei) => {
          if (ei !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((set, si) => {
              if (si !== setIdx) return set;
              return {
                ...set,
                [field]: field === 'reps'
                  ? (parseInt(rawValue) || 0)
                  : (parseFloat(rawValue) || 0),
              };
            }),
          };
        });
        return { ...s, exercises: updatedExercises };
      })
    );

    // Write to localStorage immediately
    const log = getWorkoutLog();
    const logSession = log.strength.find((s) => s.id === sessionId);
    if (!logSession) return;
    const ex = logSession.exercises[exIdx];
    if (!ex || !ex.sets[setIdx]) return;
    if (field === 'reps') ex.sets[setIdx].reps = parseInt(rawValue) || 0;
    if (field === 'weight') ex.sets[setIdx].weight = parseFloat(rawValue) || 0;
    setWorkoutLog(log);
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-sm">← Back</button>
          <span className="text-sm font-medium text-zinc-300">Workout History</span>
        </div>
        <div className="text-zinc-500 text-sm">No strength sessions logged yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-sm">← Back</button>
        <span className="text-sm font-medium text-zinc-300">Workout History</span>
        <span className="text-xs text-zinc-600">({sessions.length} sessions)</span>
      </div>

      {sessions.map((session) => {
        const isExpanded = expanded.has(session.id);
        const template = templates.find((t) => t.id === session.templateUsed);
        const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const summary = `${session.exercises.length} exercise${session.exercises.length !== 1 ? 's' : ''} · ${totalSets} sets`;

        return (
          <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Session header — click to expand */}
            <button
              onClick={() => toggleExpand(session.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium">{session.date}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {template?.name ?? 'Custom'} · {summary}
                </div>
              </div>
              <span className="text-zinc-600 text-xs ml-4">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-zinc-800 px-4 py-3 space-y-4">
                {session.exercises.map((ex, exIdx) => {
                  const def = exercises.find((e) => e.id === ex.exerciseId);
                  return (
                    <div key={exIdx} className="space-y-2">
                      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                        {def?.name ?? ex.exerciseId}
                      </div>
                      <div className="space-y-1.5">
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600 w-5">{set.setNumber}</span>
                            <input
                              type="number"
                              defaultValue={set.reps}
                              onBlur={(e) => updateSetValue(session.id, exIdx, setIdx, 'reps', e.target.value)}
                              className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
                            />
                            <span className="text-zinc-600 text-xs">reps ×</span>
                            <input
                              type="number"
                              defaultValue={set.weight}
                              onBlur={(e) => updateSetValue(session.id, exIdx, setIdx, 'weight', e.target.value)}
                              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
                            />
                            <span className="text-xs text-zinc-500">{set.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {session.notes && (
                  <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-2 mt-2">
                    {session.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
