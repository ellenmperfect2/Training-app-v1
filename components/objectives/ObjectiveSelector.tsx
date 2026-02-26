'use client';
import { useState } from 'react';
import objectiveLibrary from '@/data/objective-library.json';
import benchmarkLibrary from '@/data/benchmark-library.json';
import assessmentLibrary from '@/data/assessment-library.json';
import type { ActivatedObjective } from '@/lib/storage';

interface LibraryEntry {
  id: string;
  name: string;
  type: string;
  profile: {
    durationDays: number;
    packWeight: string;
    activityType: string;
  };
}

interface Props {
  onActivate: (objective: ActivatedObjective) => void;
  onClose: () => void;
  existingObjectiveIds: string[];
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function ObjectiveSelector({ onActivate, onClose, existingObjectiveIds }: Props) {
  const library = objectiveLibrary as LibraryEntry[];
  const available = library.filter((o) => !existingObjectiveIds.includes(o.id));

  const [selected, setSelected] = useState<LibraryEntry | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [priorityWeight, setPriorityWeight] = useState(5);

  function handleActivate() {
    if (!selected || !targetDate) return;

    const assessmentDefs = (assessmentLibrary as Array<{ objectiveId: string; assessments: Array<{ id: string }> }>)
      .find((a) => a.objectiveId === selected.id);

    const objective: ActivatedObjective = {
      id: uid(),
      libraryId: selected.id,
      name: selected.name,
      type: selected.type,
      targetDate,
      activatedDate: new Date().toISOString().slice(0, 10),
      priorityWeight,
      currentPhase: 'Base',
      weeksRemaining: Math.round(
        (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
      ),
      assessmentResults: (assessmentDefs?.assessments ?? []).map((a) => ({
        assessmentId: a.id,
        completedDate: null,
        result: null,
        notes: '',
      })),
      trainingPlan: [],
    };

    onActivate(objective);
  }

  if (available.length === 0) {
    return (
      <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 text-center space-y-2">
        <div className="text-glacier-secondary text-sm">No objectives available to add</div>
        <div className="text-glacier-muted text-xs">Use the Objective Builder workflow to create objectives.</div>
        <button onClick={onClose} className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors">Close</button>
      </div>
    );
  }

  return (
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4 card-hover">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-glacier-primary">Select objective</div>
        <button onClick={onClose} className="text-glacier-muted hover:text-glacier-secondary text-xs transition-colors">Cancel</button>
      </div>

      <div className="space-y-2">
        {available.map((obj) => (
          <button key={obj.id} onClick={() => setSelected(obj)}
            className={`w-full text-left px-3 py-2 rounded border transition-colors ${
              selected?.id === obj.id
                ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
            }`}
          >
            <div className="text-sm">{obj.name}</div>
            <div className={`text-xs mt-0.5 ${selected?.id === obj.id ? 'text-glacier-bg opacity-80' : 'text-glacier-muted'}`}>
              {obj.type} · {obj.profile?.durationDays} days · pack: {obj.profile?.packWeight}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 border-t border-glacier-edge pt-3">
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Target date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow" />
          </div>
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Priority weight: {priorityWeight}</label>
            <input type="range" min={1} max={10} value={priorityWeight}
              onChange={(e) => setPriorityWeight(parseInt(e.target.value))}
              className="w-full accent-[#39c5cf]" />
          </div>
          <button onClick={handleActivate} disabled={!targetDate}
            className="w-full py-2 bg-glacier-accent hover:opacity-90 disabled:opacity-40 text-glacier-bg rounded text-sm font-medium transition-opacity">
            Activate
          </button>
        </div>
      )}
    </div>
  );
}
