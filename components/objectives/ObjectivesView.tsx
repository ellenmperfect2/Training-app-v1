'use client';
import { useState, useEffect } from 'react';
import {
  getActiveObjectives,
  getArchivedObjectives,
  setActiveObjectives,
  setArchivedObjectives,
  type ActivatedObjective,
  type ArchivedObjective,
} from '@/lib/storage';
import objectiveLibrary from '@/data/objective-library.json';
import { getObjectiveTimelineStatus } from '@/lib/status';
import ObjectiveSelector from './ObjectiveSelector';
import ObjectiveCard from './ObjectiveCard';
import ObjectiveHistory from './ObjectiveHistory';

export default function ObjectivesView() {
  const [activeObjectives, setLocalActive] = useState<ActivatedObjective[]>([]);
  const [archivedObjectives, setLocalArchived] = useState<ArchivedObjective[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    setLocalActive(getActiveObjectives());
    setLocalArchived(getArchivedObjectives());
  }, []);

  function handleActivate(objective: ActivatedObjective) {
    const updated = [...activeObjectives, objective];
    setLocalActive(updated);
    setActiveObjectives(updated);
    setShowSelector(false);
  }

  function handleComplete(objectiveId: string) {
    const obj = activeObjectives.find((o) => o.id === objectiveId);
    if (!obj) return;

    const archived: ArchivedObjective = {
      id: obj.id,
      libraryId: obj.libraryId,
      name: obj.name,
      type: obj.type,
      targetDate: obj.targetDate,
      activatedDate: obj.activatedDate,
      completedDate: new Date().toISOString().slice(0, 10),
      finalReadinessTier: 'ready',
      assessmentResults: obj.assessmentResults,
      trainingSummary: {
        totalWeeks: obj.trainingPlan.filter((w) => w.completed).length,
        cardioHours: 0,
        strengthSessions: 0,
        climbingSessions: 0,
        benchmarksAchieved: [],
      },
    };

    const updatedActive = activeObjectives.filter((o) => o.id !== objectiveId);
    const updatedArchived = [...archivedObjectives, archived];
    setLocalActive(updatedActive);
    setLocalArchived(updatedArchived);
    setActiveObjectives(updatedActive);
    setArchivedObjectives(updatedArchived);
  }

  function handleUpdateWeight(objectiveId: string, weight: number) {
    const updated = activeObjectives.map((o) =>
      o.id === objectiveId ? { ...o, priorityWeight: weight } : o
    );
    setLocalActive(updated);
    setActiveObjectives(updated);
  }

  const libraryEmpty = (objectiveLibrary as unknown[]).length === 0;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-glacier-edge pb-2">
        {(['active', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-[20px] transition-colors capitalize ${
              tab === t
                ? 'bg-glacier-accent text-glacier-bg font-semibold'
                : 'text-glacier-secondary hover:text-glacier-primary'
            }`}
          >
            {t === 'active' ? `Active (${activeObjectives.length})` : `History (${archivedObjectives.length})`}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="space-y-4">
          {activeObjectives.length === 0 ? (
            <div className="bg-glacier-card border border-glacier-edge rounded-lg p-6 text-center space-y-2">
              <div className="text-glacier-secondary text-sm">No active objectives</div>
              <div className="text-glacier-muted text-xs">
                {libraryEmpty
                  ? 'No objectives yet — use the Objective Builder to add your first'
                  : 'Select an objective from the library to begin training for it'}
              </div>
            </div>
          ) : (
            activeObjectives.map((obj) => (
              <ObjectiveCard
                key={obj.id}
                objective={obj}
                onComplete={() => handleComplete(obj.id)}
                onUpdateWeight={(w) => handleUpdateWeight(obj.id, w)}
              />
            ))
          )}

          {!libraryEmpty && (
            <button
              onClick={() => setShowSelector(true)}
              className="w-full py-2.5 border border-dashed border-glacier-edge rounded text-sm text-glacier-secondary hover:text-glacier-primary hover:border-glacier-edge-hover transition-colors"
            >
              + Add objective
            </button>
          )}

          {showSelector && (
            <ObjectiveSelector
              onActivate={handleActivate}
              onClose={() => setShowSelector(false)}
              existingObjectiveIds={activeObjectives.map((o) => o.libraryId)}
            />
          )}
        </div>
      )}

      {tab === 'history' && (
        <ObjectiveHistory archived={archivedObjectives} />
      )}
    </div>
  );
}
