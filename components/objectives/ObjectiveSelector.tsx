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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center space-y-2">
        <div className="text-zinc-400 text-sm">No objectives available to add</div>
        <div className="text-zinc-600 text-xs">Use the Objective Builder workflow to create objectives.</div>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">Close</button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Select objective</div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs">Cancel</button>
      </div>

      <div className="space-y-2">
        {available.map((obj) => (
          <button key={obj.id} onClick={() => setSelected(obj)}
            className={`w-full text-left px-3 py-2 rounded border transition-colors ${
              selected?.id === obj.id
                ? 'bg-zinc-700 border-zinc-600'
                : 'bg-zinc-950 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="text-sm">{obj.name}</div>
            <div className="text-xs text-zinc-500">{obj.type} · {obj.profile?.durationDays} days · pack: {obj.profile?.packWeight}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Target date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Priority weight: {priorityWeight}</label>
            <input type="range" min={1} max={10} value={priorityWeight}
              onChange={(e) => setPriorityWeight(parseInt(e.target.value))}
              className="w-full accent-zinc-400" />
          </div>
          <button onClick={handleActivate} disabled={!targetDate}
            className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded text-sm font-medium">
            Activate
          </button>
        </div>
      )}
    </div>
  );
}
