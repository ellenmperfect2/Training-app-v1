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
          <button onClick={onClose} className="text-glacier-secondary hover:text-glacier-primary text-sm transition-colors">← Back</button>
          <span className="text-sm font-medium text-glacier-primary">Workout History</span>
        </div>
        <div className="text-glacier-secondary text-sm">No strength sessions logged yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onClose} className="text-glacier-secondary hover:text-glacier-primary text-sm transition-colors">← Back</button>
        <span className="text-sm font-medium text-glacier-primary">Workout History</span>
        <span className="text-xs text-glacier-muted">({sessions.length} sessions)</span>
      </div>

      {sessions.map((session) => {
        const isExpanded = expanded.has(session.id);
        const template = templates.find((t) => t.id === session.templateUsed);
        const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const summary = `${session.exercises.length} exercise${session.exercises.length !== 1 ? 's' : ''} · ${totalSets} sets`;

        return (
          <div key={session.id} className="bg-glacier-card border border-glacier-edge rounded-lg overflow-hidden card-hover">
            <button
              onClick={() => toggleExpand(session.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-glacier-card-alt transition-colors duration-150"
            >
              <div>
                <div className="text-sm font-medium text-glacier-primary">{session.date}</div>
                <div className="text-xs text-glacier-secondary mt-0.5">
                  {template?.name ?? 'Custom'} · {summary}
                </div>
              </div>
              <span className="text-glacier-muted text-xs ml-4">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-glacier-edge px-4 py-3 space-y-4">
                {session.exercises.map((ex, exIdx) => {
                  const def = exercises.find((e) => e.id === ex.exerciseId);
                  return (
                    <div key={exIdx} className="space-y-2">
                      <div className="text-xs font-medium text-glacier-secondary uppercase tracking-wide">
                        {def?.name ?? ex.exerciseId}
                      </div>
                      <div className="space-y-1.5">
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className="flex items-center gap-2">
                            <span className="text-xs text-glacier-muted w-5">{set.setNumber}</span>
                            <input
                              type="number"
                              defaultValue={set.reps}
                              onBlur={(e) => updateSetValue(session.id, exIdx, setIdx, 'reps', e.target.value)}
                              className="w-14 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow"
                            />
                            <span className="text-glacier-muted text-xs">reps ×</span>
                            <input
                              type="number"
                              defaultValue={set.weight}
                              onBlur={(e) => updateSetValue(session.id, exIdx, setIdx, 'weight', e.target.value)}
                              className="w-16 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow"
                            />
                            <span className="text-xs text-glacier-secondary">{set.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {session.notes && (
                  <div className="text-xs text-glacier-secondary border-t border-glacier-edge pt-2 mt-2">
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
