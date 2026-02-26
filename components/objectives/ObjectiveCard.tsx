'use client';
import { useState } from 'react';
import type { ActivatedObjective } from '@/lib/storage';
import { getObjectiveTimelineStatus } from '@/lib/status';

interface Props {
  objective: ActivatedObjective;
  onComplete: () => void;
  onUpdateWeight: (weight: number) => void;
}

const TIMELINE_COLORS: Record<string, string> = {
  'on-track': 'text-green-400',
  'behind': 'text-yellow-400',
  'ahead': 'text-sky-400',
};

export default function ObjectiveCard({ objective, onComplete, onUpdateWeight }: Props) {
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [weight, setWeight] = useState(objective.priorityWeight);

  const timeline = getObjectiveTimelineStatus(objective);
  const today = new Date().toISOString().slice(0, 10);
  const weeksOut = Math.round(
    (new Date(objective.targetDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  function handleWeightChange(newWeight: number) {
    setWeight(newWeight);
    onUpdateWeight(newWeight);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{objective.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{objective.type} · {weeksOut} weeks out</div>
        </div>
        <span className={`text-xs font-medium ${TIMELINE_COLORS[timeline] ?? 'text-zinc-400'}`}>
          {timeline}
        </span>
      </div>

      {/* Priority weight */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Priority weight: {weight}</label>
        <input
          type="range"
          min={1}
          max={10}
          value={weight}
          onChange={(e) => handleWeightChange(parseInt(e.target.value))}
          className="w-full accent-zinc-400"
        />
      </div>

      {/* Phase */}
      <div className="text-xs text-zinc-500">Phase: {objective.currentPhase}</div>

      {/* Assessments */}
      {objective.assessmentResults.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600">Assessments</div>
          {objective.assessmentResults.map((r) => (
            <div key={r.assessmentId} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{r.assessmentId}</span>
              <span className={
                r.result === 'pass' ? 'text-green-400' :
                r.result === 'miss' ? 'text-red-400' :
                r.result === 'borderline' ? 'text-yellow-400' : 'text-zinc-600'
              }>
                {r.result ?? 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Complete */}
      <div className="pt-1 border-t border-zinc-800">
        {!confirmComplete ? (
          <button onClick={() => setConfirmComplete(true)}
            className="text-xs text-zinc-600 hover:text-zinc-400">
            Mark complete
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">Archive this objective?</span>
            <button onClick={onComplete} className="text-xs text-green-400 hover:text-green-300">Yes, archive</button>
            <button onClick={() => setConfirmComplete(false)} className="text-xs text-zinc-600 hover:text-zinc-400">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
