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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function ManageObjectives() {
  const [active, setLocalActive] = useState<ActivatedObjective[]>([]);
  const [archived, setLocalArchived] = useState<ArchivedObjective[]>([]);

  // Deactivate confirm state
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // Add objective form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPackWeight, setNewPackWeight] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newLimitations, setNewLimitations] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState(3);

  // Reactivate state
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

  // ── Mutations ──────────────────────────────────────────────────────────────

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
    // Reset form
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">

      {/* ── Active Objectives ── */}
      <section className="space-y-4">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          Active ({active.length})
        </h2>

        {active.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-sm">
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
            <div key={obj.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{obj.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{obj.type}</div>
                </div>
                <div className="text-xs text-zinc-500 text-right">
                  <div>{weeks} wks out</div>
                  <div className="text-zinc-600 mt-0.5">{obj.currentPhase}</div>
                </div>
              </div>

              {/* Description */}
              {primary && (
                <div className="text-xs text-zinc-500">
                  Optimizes for{' '}
                  <span className="text-zinc-300">{formatStimulus(primary)}</span>
                  {secondary && (
                    <span> · secondary <span className="text-zinc-400">{formatStimulus(secondary)}</span></span>
                  )}
                </div>
              )}

              {/* Target date — editable */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-400 w-20 shrink-0">Target date</label>
                <input
                  type="date"
                  value={obj.targetDate}
                  min={today()}
                  onChange={(e) => updateTargetDate(obj.id, e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
                />
              </div>

              {/* Priority weight — editable 1–5 */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Priority: {obj.priorityWeight} / 5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={Math.min(obj.priorityWeight, 5)}
                  onChange={(e) => updatePriority(obj.id, parseInt(e.target.value))}
                  className="w-full max-w-xs accent-zinc-400"
                />
              </div>

              {/* Activation details if present */}
              {(obj.packWeight || obj.region || (obj.limitations && obj.limitations.length > 0)) && (
                <div className="text-xs text-zinc-600 flex gap-4 flex-wrap">
                  {obj.packWeight && <span>Pack: {obj.packWeight}</span>}
                  {obj.region && <span>Region: {obj.region}</span>}
                  {obj.limitations && obj.limitations.length > 0 && (
                    <span>Limitations: {obj.limitations.join(', ')}</span>
                  )}
                </div>
              )}

              {/* Deactivate */}
              <div className="pt-1 border-t border-zinc-800">
                {!isConfirming ? (
                  <button
                    onClick={() => setDeactivateId(obj.id)}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Remove this objective?</span>
                    <button
                      onClick={() => deactivate(obj.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Yes, deactivate
                    </button>
                    <button
                      onClick={() => setDeactivateId(null)}
                      className="text-xs text-zinc-600 hover:text-zinc-400"
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

      {/* ── Add Objective ── */}
      <section>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={availableLibrary.length === 0}
            className="w-full py-2.5 border border-dashed border-zinc-700 rounded text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {availableLibrary.length === 0 ? 'All library objectives are active' : '+ Add objective'}
          </button>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add objective</span>
              <button
                onClick={() => { setShowAddForm(false); setSelectedLibraryId(''); }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>

            {/* Library picker */}
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
                      ? 'bg-zinc-700 border-zinc-600'
                      : 'bg-zinc-950 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-sm">{entry.name}</div>
                  <div className="text-xs text-zinc-500">
                    {entry.type} · {entry.profile.durationDays} days · {entry.profile.packWeight} pack
                  </div>
                </button>
              ))}
            </div>

            {selectedLibraryId && (
              <div className="space-y-4 border-t border-zinc-800 pt-4">
                {/* Target date */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Target date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    min={today()}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                </div>

                {/* Pack weight */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Pack weight</label>
                  <div className="flex gap-2 flex-wrap">
                    {PACK_WEIGHTS.map((pw) => (
                      <button
                        key={pw}
                        onClick={() => setNewPackWeight(pw)}
                        className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                          newPackWeight === pw
                            ? 'bg-zinc-600 border-zinc-500'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {pw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Region (optional)</label>
                  <input
                    type="text"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="e.g. Colorado Rockies, Alps"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                </div>

                {/* Limitations */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Limitations (optional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {LIMITATIONS.map((lim) => (
                      <button
                        key={lim}
                        onClick={() => toggleLimitation(lim)}
                        className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                          newLimitations.includes(lim)
                            ? 'bg-amber-900/60 border-amber-700 text-amber-200'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {lim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Priority: {newPriority} / 5</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={newPriority}
                    onChange={(e) => setNewPriority(parseInt(e.target.value))}
                    className="w-full max-w-xs accent-zinc-400"
                  />
                </div>

                <button
                  onClick={handleActivate}
                  disabled={!newTargetDate}
                  className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded text-sm font-medium"
                >
                  Activate
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Objective History ── */}
      <section className="space-y-3">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          History ({archived.length})
        </h2>

        {archived.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-sm">
            No completed objectives yet.
          </div>
        )}

        {archived.map((obj) => {
          const isReactivating = reactivateId === obj.id;
          const tierColor =
            obj.finalReadinessTier === 'ready' ? 'text-green-400' :
            obj.finalReadinessTier === 'borderline' ? 'text-yellow-400' :
            'text-zinc-500';

          return (
            <div key={obj.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{obj.name}</div>
                  <div className="text-xs text-zinc-500">{obj.type}</div>
                </div>
                <span className={`text-xs font-medium ${tierColor}`}>
                  {obj.finalReadinessTier}
                </span>
              </div>

              <div className="text-xs text-zinc-600">
                Completed {obj.completedDate}
              </div>

              {!isReactivating ? (
                <button
                  onClick={() => setReactivateId(obj.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Reactivate →
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-zinc-400">New target date:</span>
                  <input
                    type="date"
                    value={reactivateDate}
                    min={today()}
                    onChange={(e) => setReactivateDate(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => handleReactivate(obj.id)}
                    disabled={!reactivateDate}
                    className="text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 px-3 py-1.5 rounded"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setReactivateId(null); setReactivateDate(''); }}
                    className="text-xs text-zinc-600 hover:text-zinc-400"
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
