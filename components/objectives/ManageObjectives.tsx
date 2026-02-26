'use client';
import { useState, useEffect } from 'react';
import {
  getActiveObjectives,
  setActiveObjectives,
  getArchivedObjectives,
  setArchivedObjectives,
  type ActivatedObjective,
  type ArchivedObjective,
} from '@/lib/storage';
import objectiveLibraryData from '@/data/objective-library.json';
import assessmentLibraryData from '@/data/assessment-library.json';
import { useTheme } from '@/lib/theme-context';

const PACK_WEIGHTS = ['none', 'light', 'moderate', 'heavy'] as const;
const LIMITATIONS = ['knee', 'shoulder', 'ankle', 'back', 'forearm', 'other'] as const;

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function today() { return new Date().toISOString().slice(0, 10); }

function calcWeeksRemaining(targetDate: string): number {
  return Math.round((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
}

function calcPhase(weeks: number): string {
  if (weeks >= 12) return 'Base';
  if (weeks >= 8) return 'Build';
  if (weeks >= 4) return 'Peak';
  if (weeks >= 1) return 'Taper';
  return 'Race Week';
}

function formatStimulus(s: string): string {
  return s.replace(/-and-/g, ' & ').replace(/-/g, ' ');
}

type LibraryEntry = typeof objectiveLibraryData[0];
type AssessmentLibEntry = { objectiveId: string; assessments: Array<{ id: string }> };

export default function ManageObjectives() {
  const { theme: T } = useTheme();
  const [active, setLocalActive] = useState<ActivatedObjective[]>([]);
  const [archived, setLocalArchived] = useState<ArchivedObjective[]>([]);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPackWeight, setNewPackWeight] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newLimitations, setNewLimitations] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState(3);
  const [reactivateId, setReactivateId] = useState<string | null>(null);
  const [reactivateDate, setReactivateDate] = useState('');

  useEffect(() => {
    setLocalActive(getActiveObjectives());
    setLocalArchived(getArchivedObjectives());
  }, []);

  const library = objectiveLibraryData as LibraryEntry[];
  const assessmentLib = assessmentLibraryData as AssessmentLibEntry[];
  const activeLibraryIds = active.map((o) => o.libraryId);
  const availableLibrary = library.filter((e) => !activeLibraryIds.includes(e.id));

  function updateTargetDate(id: string, newDate: string) {
    const weeks = calcWeeksRemaining(newDate);
    const updated = active.map((o) =>
      o.id === id ? { ...o, targetDate: newDate, weeksRemaining: weeks, currentPhase: calcPhase(weeks) } : o
    );
    setLocalActive(updated);
    setActiveObjectives(updated);
  }

  function updatePriority(id: string, weight: number) {
    const updated = active.map((o) =>
      o.id === id ? { ...o, priorityWeight: weight } : o
    );
    setLocalActive(updated);
    setActiveObjectives(updated);
  }

  function deactivate(id: string) {
    const obj = active.find((o) => o.id === id);
    if (!obj) return;
    const entry: ArchivedObjective = {
      id: obj.id,
      libraryId: obj.libraryId,
      name: obj.name,
      type: obj.type,
      targetDate: obj.targetDate,
      activatedDate: obj.activatedDate,
      completedDate: today(),
      finalReadinessTier: 'not-ready',
      assessmentResults: obj.assessmentResults,
      trainingSummary: {
        totalWeeks: obj.trainingPlan.filter((w) => w.completed).length,
        cardioHours: 0,
        strengthSessions: 0,
        climbingSessions: 0,
        benchmarksAchieved: [],
      },
    };
    const updatedActive = active.filter((o) => o.id !== id);
    const updatedArchived = [...archived, entry];
    setLocalActive(updatedActive);
    setLocalArchived(updatedArchived);
    setActiveObjectives(updatedActive);
    setArchivedObjectives(updatedArchived);
    setDeactivateId(null);
  }

  function handleActivate() {
    if (!selectedLibraryId || !newTargetDate) return;
    const libEntry = library.find((e) => e.id === selectedLibraryId);
    if (!libEntry) return;
    const assessmentDefs = assessmentLib.find((a) => a.objectiveId === selectedLibraryId);
    const weeks = calcWeeksRemaining(newTargetDate);
    const newObj: ActivatedObjective = {
      id: uid(),
      libraryId: selectedLibraryId,
      name: libEntry.name,
      type: libEntry.type,
      targetDate: newTargetDate,
      activatedDate: today(),
      priorityWeight: newPriority,
      currentPhase: calcPhase(weeks),
      weeksRemaining: weeks,
      assessmentResults: (assessmentDefs?.assessments ?? []).map((a) => ({
        assessmentId: a.id,
        completedDate: null,
        result: null,
        notes: '',
      })),
      trainingPlan: [],
      packWeight: newPackWeight || libEntry.profile.packWeight,
      region: newRegion || undefined,
      limitations: newLimitations.length > 0 ? newLimitations : undefined,
    };
    const updatedActive = [...active, newObj];
    setLocalActive(updatedActive);
    setActiveObjectives(updatedActive);
    setSelectedLibraryId('');
    setNewTargetDate('');
    setNewPackWeight('');
    setNewRegion('');
    setNewLimitations([]);
    setNewPriority(3);
    setShowAddForm(false);
  }

  function handleReactivate(archivedObjId: string) {
    if (!reactivateDate) return;
    const archivedObj = archived.find((o) => o.id === archivedObjId);
    if (!archivedObj) return;
    const assessmentDefs = assessmentLib.find((a) => a.objectiveId === archivedObj.libraryId);
    const weeks = calcWeeksRemaining(reactivateDate);
    const newObj: ActivatedObjective = {
      id: uid(),
      libraryId: archivedObj.libraryId,
      name: archivedObj.name,
      type: archivedObj.type,
      targetDate: reactivateDate,
      activatedDate: today(),
      priorityWeight: 3,
      currentPhase: calcPhase(weeks),
      weeksRemaining: weeks,
      assessmentResults: (assessmentDefs?.assessments ?? []).map((a) => ({
        assessmentId: a.id,
        completedDate: null,
        result: null,
        notes: '',
      })),
      trainingPlan: [],
    };
    const updatedActive = [...active, newObj];
    const updatedArchived = archived.filter((o) => o.id !== archivedObjId);
    setLocalActive(updatedActive);
    setLocalArchived(updatedArchived);
    setActiveObjectives(updatedActive);
    setArchivedObjectives(updatedArchived);
    setReactivateId(null);
    setReactivateDate('');
  }

  function toggleLimitation(lim: string) {
    setNewLimitations((prev) =>
      prev.includes(lim) ? prev.filter((l) => l !== lim) : [...prev, lim]
    );
  }

  return (
    <div className="space-y-10">

      {/* Active Objectives */}
      <section className="space-y-4">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">
          Active ({active.length})
        </h2>

        {active.length === 0 && (
          <div className="bg-glacier-card border border-glacier-edge rounded-lg p-6 text-center text-glacier-secondary text-sm">
            No active objectives — add one below.
          </div>
        )}

        {active.map((obj) => {
          const libEntry = library.find((e) => e.id === obj.libraryId);
          const primary = libEntry?.trainingPlanLogic?.primaryStimulus;
          const secondary = libEntry?.trainingPlanLogic?.secondaryStimulus;
          const weeks = calcWeeksRemaining(obj.targetDate);
          const isConfirming = deactivateId === obj.id;

          return (
            <div key={obj.id} className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4 card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-glacier-primary">{obj.name}</div>
                  <div className="text-xs text-glacier-secondary mt-0.5">{obj.type}</div>
                </div>
                <div className="text-xs text-glacier-secondary text-right">
                  <div>{weeks} wks out</div>
                  <div className="text-glacier-muted mt-0.5">{obj.currentPhase}</div>
                </div>
              </div>

              {primary && (
                <div className="text-xs text-glacier-secondary">
                  Optimizes for{' '}
                  <span className="text-glacier-primary">{formatStimulus(primary)}</span>
                  {secondary && (
                    <span> · secondary <span className="text-glacier-secondary">{formatStimulus(secondary)}</span></span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="text-xs text-glacier-secondary w-20 shrink-0">Target date</label>
                <input
                  type="date"
                  value={obj.targetDate}
                  min={today()}
                  onChange={(e) => updateTargetDate(obj.id, e.target.value)}
                  className="bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow"
                />
              </div>

              <div>
                <label className="block text-xs text-glacier-secondary mb-1">
                  Priority: {obj.priorityWeight} / 5
                </label>
                <input
                  type="range"
                  min={1} max={5}
                  value={Math.min(obj.priorityWeight, 5)}
                  onChange={(e) => updatePriority(obj.id, parseInt(e.target.value))}
                  style={{ accentColor: T.moss }}
                  className="w-full max-w-xs"
                />
              </div>

              {(obj.packWeight || obj.region || (obj.limitations && obj.limitations.length > 0)) && (
                <div className="text-xs text-glacier-muted flex gap-4 flex-wrap">
                  {obj.packWeight && <span>Pack: {obj.packWeight}</span>}
                  {obj.region && <span>Region: {obj.region}</span>}
                  {obj.limitations && obj.limitations.length > 0 && (
                    <span>Limitations: {obj.limitations.join(', ')}</span>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-glacier-edge">
                {!isConfirming ? (
                  <button
                    onClick={() => setDeactivateId(obj.id)}
                    className="text-xs text-glacier-muted hover:text-glacier-danger transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-glacier-secondary">Remove this objective?</span>
                    <button
                      onClick={() => deactivate(obj.id)}
                      className="text-xs text-glacier-danger hover:opacity-80 transition-opacity"
                    >
                      Yes, deactivate
                    </button>
                    <button
                      onClick={() => setDeactivateId(null)}
                      className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Add Objective */}
      <section>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={availableLibrary.length === 0}
            className="w-full py-2.5 border border-dashed border-glacier-edge rounded text-sm text-glacier-secondary hover:text-glacier-primary hover:border-glacier-edge-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {availableLibrary.length === 0 ? 'All library objectives are active' : '+ Add objective'}
          </button>
        ) : (
          <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-glacier-primary">Add objective</span>
              <button
                onClick={() => { setShowAddForm(false); setSelectedLibraryId(''); }}
                className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-2">
              {availableLibrary.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setSelectedLibraryId(entry.id);
                    setNewPackWeight(entry.profile.packWeight);
                  }}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    selectedLibraryId === entry.id
                      ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                      : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                  }`}
                >
                  <div className="text-sm">{entry.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedLibraryId === entry.id ? 'opacity-80' : 'text-glacier-muted'}`}>
                    {entry.type} · {entry.profile.durationDays} days · {entry.profile.packWeight} pack
                  </div>
                </button>
              ))}
            </div>

            {selectedLibraryId && (
              <div className="space-y-4 border-t border-glacier-edge pt-4">
                <div>
                  <label className="block text-xs text-glacier-secondary mb-1">Target date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    min={today()}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
                  />
                </div>

                <div>
                  <label className="block text-xs text-glacier-secondary mb-2">Pack weight</label>
                  <div className="flex gap-2 flex-wrap">
                    {PACK_WEIGHTS.map((pw) => (
                      <button
                        key={pw}
                        onClick={() => setNewPackWeight(pw)}
                        className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                          newPackWeight === pw
                            ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                            : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                        }`}
                      >
                        {pw}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-glacier-secondary mb-1">Region (optional)</label>
                  <input
                    type="text"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="e.g. Colorado Rockies, Alps"
                    className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
                  />
                </div>

                <div>
                  <label className="block text-xs text-glacier-secondary mb-2">Limitations (optional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {LIMITATIONS.map((lim) => (
                      <button
                        key={lim}
                        onClick={() => toggleLimitation(lim)}
                        className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                          newLimitations.includes(lim)
                            ? 'bg-glacier-warning-soft border-glacier-warning text-glacier-primary'
                            : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                        }`}
                      >
                        {lim}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-glacier-secondary mb-1">Priority: {newPriority} / 5</label>
                  <input
                    type="range"
                    min={1} max={5}
                    value={newPriority}
                    onChange={(e) => setNewPriority(parseInt(e.target.value))}
                    style={{ accentColor: T.moss }}
                  className="w-full max-w-xs"
                  />
                </div>

                <button
                  onClick={handleActivate}
                  disabled={!newTargetDate}
                  className="w-full py-2.5 bg-glacier-accent hover:opacity-90 disabled:opacity-40 text-glacier-bg rounded text-sm font-medium transition-opacity"
                >
                  Activate
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Objective History */}
      <section className="space-y-3">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">
          History ({archived.length})
        </h2>

        {archived.length === 0 && (
          <div className="bg-glacier-card border border-glacier-edge rounded-lg p-6 text-center text-glacier-secondary text-sm">
            No completed objectives yet.
          </div>
        )}

        {archived.map((obj) => {
          const isReactivating = reactivateId === obj.id;
          const tierColor =
            obj.finalReadinessTier === 'ready'      ? 'text-glacier-success' :
            obj.finalReadinessTier === 'borderline' ? 'text-glacier-warning' :
            'text-glacier-secondary';

          return (
            <div key={obj.id} className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-2 card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-glacier-primary">{obj.name}</div>
                  <div className="text-xs text-glacier-secondary">{obj.type}</div>
                </div>
                <span className={`text-xs font-medium ${tierColor}`}>
                  {obj.finalReadinessTier}
                </span>
              </div>

              <div className="text-xs text-glacier-muted">
                Completed {obj.completedDate}
              </div>

              {!isReactivating ? (
                <button
                  onClick={() => setReactivateId(obj.id)}
                  className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors"
                >
                  Reactivate →
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-glacier-secondary">New target date:</span>
                  <input
                    type="date"
                    value={reactivateDate}
                    min={today()}
                    onChange={(e) => setReactivateDate(e.target.value)}
                    className="bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow"
                  />
                  <button
                    onClick={() => handleReactivate(obj.id)}
                    disabled={!reactivateDate}
                    className="text-xs bg-glacier-accent hover:opacity-90 disabled:opacity-40 text-glacier-bg px-3 py-1.5 rounded font-medium transition-opacity"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setReactivateId(null); setReactivateDate(''); }}
                    className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
