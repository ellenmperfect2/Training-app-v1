'use client';
import { useState, useEffect } from 'react';
import benchmarkLibrary from '@/data/benchmark-library.json';
import assessmentLibrary from '@/data/assessment-library.json';
import {
  getActiveObjectives,
  getBenchmarkCompletionLog,
  upsertBenchmarkCompletion,
  type ActivatedObjective,
  type BenchmarkCompletion,
  type BenchmarkCompletionLog,
} from '@/lib/storage';

// ── Types ────────────────────────────────────────────────────────────────────

interface BenchmarkDef {
  id: string;           // e.g. "aerobic-capacity.loaded-aerobic-test"
  category: string;     // e.g. "Aerobic Capacity"
  name: string;
  description: string;
  passingStandard: string;
  missMeans?: string;
}

interface AssessmentDef {
  id: string;
  name: string;
  mapsToBenchmark: string;
  terrain: string;
  equipment: string;
  workout: string;
  track: string;
  passingStandard: string;
  missMeans: string;
}

// ── Normalise benchmark-library.json into flat BenchmarkDef[] ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBenchmarks(entry: any): BenchmarkDef[] {
  const defs: BenchmarkDef[] = [];

  const ac = entry.aerobicCapacity;
  if (ac?.loadedAerobicTest) {
    const b = ac.loadedAerobicTest;
    defs.push({
      id: 'aerobic-capacity.loaded-aerobic-test',
      category: 'Aerobic Capacity',
      name: 'Loaded Aerobic Test',
      description: b.description ?? '',
      passingStandard: b.passingStandard ?? '',
    });
  }

  const me = entry.muscularEndurance;
  if (me?.loadedCarryTest) {
    const b = me.loadedCarryTest;
    defs.push({
      id: 'muscular-endurance.loaded-carry-test',
      category: 'Muscular Endurance',
      name: 'Loaded Carry Test',
      description: b.description ?? '',
      passingStandard: b.passingStandard ?? '',
      missMeans: b.missMeans,
    });
  }
  if (me?.descentDurabilityTest) {
    const b = me.descentDurabilityTest;
    defs.push({
      id: 'muscular-endurance.descent-durability-test',
      category: 'Muscular Endurance',
      name: 'Descent Durability Test',
      description: b.description ?? '',
      passingStandard: b.passingStandard ?? '',
      missMeans: b.missMeans,
    });
  }
  if (me?.backToBackTest) {
    const b = me.backToBackTest;
    defs.push({
      id: 'muscular-endurance.back-to-back-test',
      category: 'Muscular Endurance',
      name: 'Back-to-Back Test',
      description: `Day 1: ${b.day1Description ?? ''}\n\nDay 2: ${b.day2Description ?? ''}`,
      passingStandard: b.passingStandard ?? '',
    });
  }

  const cf = entry.cumulativeFatigue;
  if (cf?.simulationBlock) {
    const b = cf.simulationBlock;
    defs.push({
      id: 'cumulative-fatigue.simulation-block',
      category: 'Cumulative Fatigue',
      name: '3-Day Simulation Block',
      description: `Day 1: ${b.day1 ?? ''}\n\nDay 2: ${b.day2 ?? ''}\n\nDay 3: ${b.day3 ?? ''}`,
      passingStandard: b.passingStandard ?? '',
    });
  }

  return defs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function groupByCategory(benchmarks: BenchmarkDef[]): Map<string, BenchmarkDef[]> {
  const map = new Map<string, BenchmarkDef[]>();
  for (const b of benchmarks) {
    if (!map.has(b.category)) map.set(b.category, []);
    map.get(b.category)!.push(b);
  }
  return map;
}

// ── Log Result Form ───────────────────────────────────────────────────────────

function LogResultForm({
  benchmarkName,
  existing,
  onSave,
  onCancel,
}: {
  benchmarkName: string;
  existing: BenchmarkCompletion | undefined;
  onSave: (completion: BenchmarkCompletion) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(existing?.completedDate ?? today());
  const [passed, setPassed] = useState<boolean>(existing?.passed ?? true);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  function handleSave() {
    onSave({ completedDate: date, passed, notes: notes.trim() || undefined });
  }

  return (
    <div className="mt-3 p-4 bg-glacier-card-alt border border-glacier-edge rounded-lg space-y-4">
      <p className="text-xs font-medium text-glacier-primary">{existing ? 'Update result' : 'Log result'}: {benchmarkName}</p>

      <div>
        <label className="block text-xs text-glacier-secondary mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-glacier-card border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
        />
      </div>

      <div>
        <label className="block text-xs text-glacier-secondary mb-2">Result</label>
        <div className="flex gap-2">
          <button
            onClick={() => setPassed(true)}
            className={`px-4 py-1.5 rounded text-sm border font-medium transition-colors ${
              passed
                ? 'bg-glacier-success-soft border-glacier-success text-glacier-success'
                : 'bg-glacier-card border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
            }`}
          >
            Passed
          </button>
          <button
            onClick={() => setPassed(false)}
            className={`px-4 py-1.5 rounded text-sm border font-medium transition-colors ${
              !passed
                ? 'bg-glacier-danger-soft border-glacier-danger text-glacier-danger'
                : 'bg-glacier-card border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
            }`}
          >
            Did not pass
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-glacier-secondary mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Time, pace, how it felt..."
          className="w-full bg-glacier-card border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary resize-none input-glow"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-glacier-card border border-glacier-edge hover:border-glacier-edge-hover text-glacier-secondary rounded text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Assessment detail (collapsible "How to test this") ───────────────────────

function AssessmentDetail({ assessment }: { assessment: AssessmentDef }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-glacier-secondary hover:text-glacier-primary transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        How to test this: {assessment.name}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-glacier-card-alt border border-glacier-edge rounded text-xs space-y-2">
          <div>
            <span className="text-glacier-secondary uppercase tracking-wider text-[10px]">Terrain</span>
            <p className="text-glacier-primary mt-0.5">{assessment.terrain}</p>
          </div>
          <div>
            <span className="text-glacier-secondary uppercase tracking-wider text-[10px]">Equipment</span>
            <p className="text-glacier-primary mt-0.5">{assessment.equipment}</p>
          </div>
          <div>
            <span className="text-glacier-secondary uppercase tracking-wider text-[10px]">Workout</span>
            <p className="text-glacier-primary mt-0.5 whitespace-pre-line">{assessment.workout}</p>
          </div>
          <div>
            <span className="text-glacier-secondary uppercase tracking-wider text-[10px]">What to track</span>
            <p className="text-glacier-primary mt-0.5">{assessment.track}</p>
          </div>
          <div>
            <span className="text-glacier-secondary uppercase tracking-wider text-[10px]">Passing standard</span>
            <p className="text-glacier-primary mt-0.5">{assessment.passingStandard}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Benchmark Row ────────────────────────────────────────────────────────────

function BenchmarkRow({
  objectiveId,
  benchmark,
  completion,
  assessments,
  onSaved,
}: {
  objectiveId: string;
  benchmark: BenchmarkDef;
  completion: BenchmarkCompletion | undefined;
  assessments: AssessmentDef[];
  onSaved: () => void;
}) {
  const [logging, setLogging] = useState(false);

  function handleSave(c: BenchmarkCompletion) {
    upsertBenchmarkCompletion(objectiveId, benchmark.id, c);
    setLogging(false);
    onSaved();
  }

  const statusBadge = () => {
    if (!completion) {
      return (
        <span className="text-xs px-2 py-0.5 rounded bg-glacier-card border border-glacier-edge text-glacier-secondary font-medium">
          Not attempted
        </span>
      );
    }
    if (completion.passed) {
      return (
        <span className="text-xs px-2 py-0.5 rounded bg-glacier-success-soft text-glacier-success font-medium">
          Passed
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-glacier-danger-soft text-glacier-danger font-medium">
        Did not pass
      </span>
    );
  };

  return (
    <div className="border border-glacier-edge rounded-lg p-4 space-y-2 bg-glacier-card">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <span className="text-sm font-medium text-glacier-primary">{benchmark.name}</span>
        {statusBadge()}
      </div>

      {/* Passing standard */}
      <p className="text-xs text-glacier-secondary leading-relaxed">{benchmark.passingStandard}</p>

      {/* Completion record */}
      {completion && (
        <div className="text-xs text-glacier-muted space-y-0.5">
          <p>{formatDate(completion.completedDate)}</p>
          {completion.notes && <p className="text-glacier-secondary">{completion.notes}</p>}
        </div>
      )}

      {/* Log / update button */}
      {!logging && (
        <button
          onClick={() => setLogging(true)}
          className="text-xs text-glacier-accent hover:opacity-80 transition-opacity font-medium"
        >
          {completion ? 'Update result' : 'Log result'}
        </button>
      )}

      {/* Inline log form */}
      {logging && (
        <LogResultForm
          benchmarkName={benchmark.name}
          existing={completion}
          onSave={handleSave}
          onCancel={() => setLogging(false)}
        />
      )}

      {/* Assessment "How to test this" sections */}
      {assessments.map((a) => (
        <AssessmentDetail key={a.id} assessment={a} />
      ))}
    </div>
  );
}

// ── Objective Section ────────────────────────────────────────────────────────

function ObjectiveSection({
  objective,
  benchmarks,
  completionLog,
  assessmentMap,
  onSaved,
  defaultOpen,
}: {
  objective: ActivatedObjective;
  benchmarks: BenchmarkDef[];
  completionLog: BenchmarkCompletionLog;
  assessmentMap: Map<string, AssessmentDef[]>;
  onSaved: () => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const totalCount = benchmarks.length;
  const passedCount = benchmarks.filter(
    (b) => completionLog[`${objective.libraryId}.${b.id}`]?.passed === true
  ).length;

  const categoryGroups = groupByCategory(benchmarks);

  return (
    <div className="border border-glacier-edge rounded-xl overflow-hidden">
      {/* Objective header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 py-4 bg-glacier-card flex items-center justify-between gap-3 hover:bg-glacier-card-alt transition-colors"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-glacier-primary">{objective.name}</p>
          <p className="text-xs text-glacier-secondary">{passedCount} of {totalCount} benchmarks passed</p>
        </div>
        <span className={`text-glacier-muted transition-transform text-sm ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-6 bg-glacier-bg">
          {Array.from(categoryGroups.entries()).map(([category, categoryBenchmarks]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryBenchmarks.map((b) => (
                  <BenchmarkRow
                    key={b.id}
                    objectiveId={objective.libraryId}
                    benchmark={b}
                    completion={completionLog[`${objective.libraryId}.${b.id}`]}
                    assessments={assessmentMap.get(b.id) ?? []}
                    onSaved={onSaved}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BenchmarkChecklist() {
  const [objectives, setObjectives] = useState<ActivatedObjective[]>([]);
  const [completionLog, setCompletionLog] = useState<BenchmarkCompletionLog>({});

  useEffect(() => {
    setObjectives(getActiveObjectives());
    setCompletionLog(getBenchmarkCompletionLog());
  }, []);

  function refresh() {
    setCompletionLog(getBenchmarkCompletionLog());
  }

  if (objectives.length === 0) {
    return (
      <p className="text-sm text-glacier-secondary">
        No active objectives. Activate an objective to see its benchmarks.
      </p>
    );
  }

  // Build a map from objectiveId → BenchmarkDef[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const benchmarkLibraryMap = new Map<string, BenchmarkDef[]>(
    (benchmarkLibrary as any[]).map((entry: any) => [
      entry.objectiveId as string,
      normalizeBenchmarks(entry),
    ])
  );

  // Build a map from benchmarkId → AssessmentDef[] (assessments that map to it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessmentsByBenchmark = new Map<string, AssessmentDef[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const group of assessmentLibrary as any[]) {
    for (const assessment of group.assessments ?? []) {
      const bid: string = assessment.mapsToBenchmark;
      if (!assessmentsByBenchmark.has(bid)) assessmentsByBenchmark.set(bid, []);
      assessmentsByBenchmark.get(bid)!.push(assessment as AssessmentDef);
    }
  }

  return (
    <div className="space-y-4">
      {objectives.map((obj, i) => {
        const benchmarks = benchmarkLibraryMap.get(obj.libraryId) ?? [];
        if (benchmarks.length === 0) return null;
        return (
          <ObjectiveSection
            key={obj.id}
            objective={obj}
            benchmarks={benchmarks}
            completionLog={completionLog}
            assessmentMap={assessmentsByBenchmark}
            onSaved={refresh}
            defaultOpen={i === 0}
          />
        );
      })}
    </div>
  );
}
