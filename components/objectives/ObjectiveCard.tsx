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
  'on-track': 'text-glacier-success',
  'behind':   'text-glacier-warning',
  'ahead':    'text-glacier-accent',
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
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-glacier-primary">{objective.name}</div>
          <div className="text-xs text-glacier-secondary mt-0.5">{objective.type} · {weeksOut} weeks out</div>
        </div>
        <span className={`text-xs font-medium ${TIMELINE_COLORS[timeline] ?? 'text-glacier-secondary'}`}>
          {timeline}
        </span>
      </div>

      {/* Priority weight */}
      <div>
        <label className="block text-xs text-glacier-secondary mb-1">Priority weight: {weight}</label>
        <input
          type="range"
          min={1}
          max={10}
          value={weight}
          onChange={(e) => handleWeightChange(parseInt(e.target.value))}
          className="w-full accent-[#39c5cf]"
        />
      </div>

      {/* Phase */}
      <div className="text-xs text-glacier-secondary">Phase: {objective.currentPhase}</div>

      {/* Assessments */}
      {objective.assessmentResults.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-glacier-muted">Assessments</div>
          {objective.assessmentResults.map((r) => (
            <div key={r.assessmentId} className="flex items-center justify-between text-xs">
              <span className="text-glacier-secondary">{r.assessmentId}</span>
              <span className={
                r.result === 'pass'       ? 'text-glacier-success' :
                r.result === 'miss'       ? 'text-glacier-danger' :
                r.result === 'borderline' ? 'text-glacier-warning' : 'text-glacier-muted'
              }>
                {r.result ?? 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Complete */}
      <div className="pt-1 border-t border-glacier-edge">
        {!confirmComplete ? (
          <button onClick={() => setConfirmComplete(true)}
            className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors">
            Mark complete
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-glacier-secondary">Archive this objective?</span>
            <button onClick={onComplete} className="text-xs text-glacier-success hover:opacity-80 transition-opacity">Yes, archive</button>
            <button onClick={() => setConfirmComplete(false)} className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
