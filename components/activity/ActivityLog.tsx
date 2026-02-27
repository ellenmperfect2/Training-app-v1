'use client';
import { useState, useEffect, useRef } from 'react';
import {
  getWorkoutLog,
  setWorkoutLog,
  getProgressionHistory,
  type CardioSession,
  type StrengthSession,
  type ClimbingSession,
  type ConditioningSession,
  type ZoneDistribution,
} from '@/lib/storage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getContributingObjectives } = require('@/lib/objective-matcher');
import exerciseLibraryData from '@/data/exercise-library.json';

// ── Types ──────────────────────────────────────────────────────────────────

type Domain = 'cardio' | 'strength' | 'climbing' | 'conditioning';
type Filter = 'all' | Domain;

type Entry =
  | { type: 'cardio'; session: CardioSession }
  | { type: 'strength'; session: StrengthSession }
  | { type: 'climbing'; session: ClimbingSession }
  | { type: 'conditioning'; session: ConditioningSession };

interface ObjectiveMatch {
  objectiveId: string;
  objectiveName: string;
  domain: 'aerobic' | 'strength' | 'climbing' | 'loaded-carry' | 'conditioning';
  strength: 'primary' | 'contributing';
}

type Intensity = 'easy' | 'moderate' | 'hard' | 'very hard';

const PAGE_SIZE = 30;
const exercises = exerciseLibraryData.exercises;
const templates = (
  exerciseLibraryData as { workoutTemplates?: Array<{ id: string; name: string }> }
).workoutTemplates ?? [];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function camelToWords(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').trim();
}

function getFocus(e: Entry): string {
  if (e.type === 'cardio') {
    const s = e.session;
    const actType = s.activityType ?? '';
    const loaded = s.packWeight && s.packWeight > 0;
    if (loaded && actType.toLowerCase().includes('hike')) return 'Loaded hike';
    return camelToWords(actType) || 'Cardio';
  }
  if (e.type === 'strength') {
    const t = e.session.templateUsed ? templates.find((t) => t.id === e.session.templateUsed) : null;
    return t?.name ?? 'Custom strength';
  }
  if (e.type === 'climbing') {
    const map: Record<string, string> = {
      bouldering: 'Bouldering', 'top-rope': 'Top rope', lead: 'Lead climbing',
      'outdoor-sport': 'Outdoor sport', 'outdoor-trad': 'Outdoor trad',
    };
    return map[e.session.sessionType] ?? e.session.sessionType;
  }
  return 'Conditioning';
}

function effortToIntensity(pe: number): Intensity {
  if (pe <= 2) return 'easy';
  if (pe === 3) return 'moderate';
  if (pe === 4) return 'hard';
  return 'very hard';
}

function getIntensity(e: Entry): Intensity | null {
  if (e.type === 'cardio') {
    const s = e.session;
    if (s.trainingLoad) {
      if (s.trainingLoad.classification === 'low') return 'easy';
      if (s.trainingLoad.classification === 'moderate') return 'moderate';
      if (s.trainingLoad.classification === 'high') return 'hard';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pe = (s as any).perceivedEffort;
    if (pe) return effortToIntensity(pe as number);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pe = (e.session as any).perceivedEffort;
    if (pe) return effortToIntensity(pe as number);
  }
  return null;
}

function intensityClass(i: Intensity): string {
  if (i === 'easy') return 'text-glacier-success';
  if (i === 'moderate') return 'text-glacier-warning';
  return 'text-glacier-danger';
}

function domainLabel(type: Domain): string {
  return { cardio: 'Cardio', strength: 'Strength', climbing: 'Climbing', conditioning: 'Conditioning' }[type];
}

function domainClass(type: Domain): string {
  if (type === 'cardio') return 'text-glacier-zone1';
  if (type === 'strength') return 'text-glacier-success';
  if (type === 'climbing') return 'text-glacier-warning';
  return 'text-glacier-accent';
}

function getMatches(e: Entry): ObjectiveMatch[] {
  try { return (getContributingObjectives(e.session) as ObjectiveMatch[]) ?? []; }
  catch { return []; }
}

// ── Reusable UI pieces ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-glacier-secondary uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-glacier-muted mb-0.5">{children}</div>;
}

function ZoneBar({ zones }: { zones: ZoneDistribution }) {
  const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
  if (total === 0) return null;
  const zoneData = [
    { key: 'z1', label: 'Z1', mins: zones.z1, color: 'var(--zone1)' },
    { key: 'z2', label: 'Z2', mins: zones.z2, color: 'var(--zone2)' },
    { key: 'z3', label: 'Z3', mins: zones.z3, color: 'var(--zone3)' },
    { key: 'z4', label: 'Z4', mins: zones.z4, color: 'var(--zone4)' },
    { key: 'z5', label: 'Z5', mins: zones.z5, color: 'var(--zone5)' },
  ].filter((z) => z.mins > 0);
  const pct = (v: number) => `${((v / total) * 100).toFixed(0)}%`;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded overflow-hidden gap-px">
        {zoneData.map((z) => <div key={z.key} style={{ width: pct(z.mins), backgroundColor: z.color }} />)}
      </div>
      <div className="flex flex-wrap gap-3">
        {zoneData.map((z) => (
          <span key={z.key} className="text-xs" style={{ color: z.color }}>
            {z.label} {Math.round(z.mins)}m ({pct(z.mins)})
          </span>
        ))}
      </div>
    </div>
  );
}

function ObjectiveBadges({ matches, compact }: { matches: ObjectiveMatch[]; compact: boolean }) {
  if (matches.length === 0) return null;
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-1.5">
        {matches.map((m) => (
          <span key={`${m.objectiveId}-${m.domain}`}
            className={`text-xs px-1.5 py-0.5 rounded border ${m.strength === 'primary'
              ? 'bg-glacier-accent-soft text-glacier-accent border-glacier-accent/30'
              : 'bg-glacier-card-alt text-glacier-secondary border-glacier-edge'}`}>
            {m.objectiveName}
          </span>
        ))}
      </div>
    );
  }
  const grouped = new Map<string, { name: string; domains: string[]; isPrimary: boolean }>();
  for (const m of matches) {
    if (!grouped.has(m.objectiveId)) grouped.set(m.objectiveId, { name: m.objectiveName, domains: [], isPrimary: false });
    const g = grouped.get(m.objectiveId)!;
    g.domains.push(m.domain);
    if (m.strength === 'primary') g.isPrimary = true;
  }
  return (
    <div className="space-y-2">
      {Array.from(grouped.values()).map((g) => (
        <div key={g.name} className="flex items-start gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${g.isPrimary
            ? 'bg-glacier-accent-soft text-glacier-accent border-glacier-accent/30'
            : 'bg-glacier-card-alt text-glacier-secondary border-glacier-edge'}`}>
            {g.isPrimary ? 'primary' : 'contributing'}
          </span>
          <span className="text-sm text-glacier-primary">
            {g.name}<span className="text-glacier-muted"> — {g.domains.join(', ')}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Detail sections ────────────────────────────────────────────────────────

type UpdateFn = (updates: Record<string, unknown>) => void;

function NotesField({ notes, onUpdate }: { notes: string; onUpdate: UpdateFn }) {
  return (
    <Section title="Notes">
      <textarea
        key={notes}
        defaultValue={notes}
        onBlur={(e) => { if (e.target.value !== notes) onUpdate({ notes: e.target.value }); }}
        rows={3}
        placeholder="Add notes..."
        className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow resize-none placeholder:text-glacier-muted"
      />
    </Section>
  );
}

function CardioDetail({ session, onUpdate }: { session: CardioSession; onUpdate: UpdateFn }) {
  const matches = getMatches({ type: 'cardio', session });
  return (
    <div className="space-y-5">
      <Section title="Stats">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <FieldLabel>Elevation gain (ft)</FieldLabel>
            <input key={session.elevationGain} type="number" defaultValue={Math.round(session.elevationGain)}
              onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onUpdate({ elevationGain: v }); }}
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-sm text-glacier-primary input-glow" />
          </div>
          <div>
            <FieldLabel>Pack weight (lbs)</FieldLabel>
            <input key={session.packWeight} type="number" min={0}
              defaultValue={session.packWeight ?? ''}
              onBlur={(e) => { const v = parseFloat(e.target.value); onUpdate({ packWeight: !isNaN(v) && v > 0 ? v : undefined }); }}
              placeholder="0"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-sm text-glacier-primary input-glow placeholder:text-glacier-muted" />
          </div>
          <div>
            <FieldLabel>Terrain</FieldLabel>
            <input key={session.terrain} type="text" defaultValue={session.terrain ?? ''}
              onBlur={(e) => onUpdate({ terrain: e.target.value || undefined })}
              placeholder="e.g. trail, scramble"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-sm text-glacier-primary input-glow placeholder:text-glacier-muted" />
          </div>
          <div>
            <FieldLabel>Effort (1–5)</FieldLabel>
            <input key={session.perceivedEffort} type="number" min={1} max={5}
              defaultValue={session.perceivedEffort ?? ''}
              onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 5) onUpdate({ perceivedEffort: v }); else if (!e.target.value) onUpdate({ perceivedEffort: undefined }); }}
              placeholder="—"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-sm text-glacier-primary input-glow placeholder:text-glacier-muted" />
          </div>
          {session.distance > 0 && (
            <div>
              <FieldLabel>Distance</FieldLabel>
              <div className="text-sm text-glacier-primary py-1">{(session.distance / 1609.34).toFixed(2)} mi</div>
            </div>
          )}
          {session.avgHR && (
            <div>
              <FieldLabel>Avg HR</FieldLabel>
              <div className="text-sm text-glacier-primary py-1">{session.avgHR} bpm</div>
            </div>
          )}
          {session.maxHR && (
            <div>
              <FieldLabel>Max HR</FieldLabel>
              <div className="text-sm text-glacier-primary py-1">{session.maxHR} bpm</div>
            </div>
          )}
        </div>
      </Section>

      {session.zoneDistribution && (
        <Section title="HR Zones"><ZoneBar zones={session.zoneDistribution} /></Section>
      )}

      {session.trainingLoad && (
        <Section title="Training Load">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-glacier-primary">{session.trainingLoad.score}</span>
            <span className="text-xs text-glacier-secondary capitalize">{session.trainingLoad.classification}</span>
          </div>
        </Section>
      )}

      {matches.length > 0 && (
        <Section title="Objective Contributions">
          <ObjectiveBadges matches={matches} compact={false} />
        </Section>
      )}

      <NotesField notes={session.notes ?? ''} onUpdate={onUpdate} />
    </div>
  );
}

function StrengthDetail({
  session, onUpdate, onSetChange,
}: {
  session: StrengthSession;
  onUpdate: UpdateFn;
  onSetChange: (exIdx: number, setIdx: number, field: 'reps' | 'weight', raw: string) => void;
}) {
  const progression = getProgressionHistory();
  const matches = getMatches({ type: 'strength', session });

  const muscleGroups = new Set<string>();
  for (const ex of session.exercises) {
    const def = exercises.find((e) => e.id === ex.exerciseId);
    if (def) {
      muscleGroups.add(def.primaryMuscleGroup);
      (def.secondaryMuscleGroups ?? []).forEach((g) => muscleGroups.add(g));
    }
  }

  let hasImprovement = false;
  for (const ex of session.exercises) {
    const history = progression.byExercise[ex.exerciseId];
    if (!history || history.length === 0) continue;
    const prior = history.filter((h) => h.date < session.date);
    if (prior.length === 0) continue;
    const priorMax = Math.max(...prior.flatMap((h) => h.sets.map((s) => s.weight)));
    const currentMax = Math.max(...ex.sets.map((s) => s.weight));
    if (currentMax > priorMax) { hasImprovement = true; break; }
  }

  return (
    <div className="space-y-5">
      {muscleGroups.size > 0 && (
        <Section title="Muscle Groups">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(muscleGroups).map((mg) => (
              <span key={mg} className="text-xs px-2 py-0.5 rounded bg-glacier-card-alt text-glacier-secondary border border-glacier-edge capitalize">
                {mg.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Exercises">
        {hasImprovement && (
          <p className="text-xs text-glacier-success font-medium mb-2">↑ Progressive overload on at least one lift</p>
        )}
        <div className="space-y-4">
          {session.exercises.map((ex, exIdx) => {
            const def = exercises.find((e) => e.id === ex.exerciseId);
            return (
              <div key={exIdx} className="space-y-1.5">
                <div className="text-sm font-medium text-glacier-primary">{def?.name ?? ex.exerciseId}</div>
                <div className="space-y-1.5">
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2">
                      <span className="text-xs text-glacier-muted w-5">#{set.setNumber}</span>
                      <input type="number" defaultValue={set.reps}
                        onBlur={(e) => onSetChange(exIdx, setIdx, 'reps', e.target.value)}
                        className="w-14 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow" />
                      <span className="text-glacier-muted text-xs">reps ×</span>
                      <input type="number" defaultValue={set.weight}
                        onBlur={(e) => onSetChange(exIdx, setIdx, 'weight', e.target.value)}
                        className="w-16 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1 text-xs text-glacier-primary input-glow" />
                      <span className="text-xs text-glacier-secondary">{set.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {matches.length > 0 && (
        <Section title="Objective Contributions">
          <ObjectiveBadges matches={matches} compact={false} />
        </Section>
      )}

      <NotesField notes={session.notes} onUpdate={onUpdate} />
    </div>
  );
}

function ClimbingDetail({ session, onUpdate }: { session: ClimbingSession; onUpdate: UpdateFn }) {
  const matches = getMatches({ type: 'climbing', session });
  const sends = session.climbs.filter((c) => c.result === 'send');
  const attempts = session.climbs.filter((c) => c.result === 'attempt');
  return (
    <div className="space-y-5">
      {session.climbs.length > 0 && (
        <Section title={`Climbs (${session.climbs.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {sends.map((c, i) => (
              <span key={`s${i}`} className="text-xs px-2 py-0.5 rounded bg-glacier-success-soft text-glacier-success border border-glacier-success/20">{c.grade} ✓</span>
            ))}
            {attempts.map((c, i) => (
              <span key={`a${i}`} className="text-xs px-2 py-0.5 rounded bg-glacier-card-alt text-glacier-secondary border border-glacier-edge">{c.grade} ○</span>
            ))}
          </div>
        </Section>
      )}
      {matches.length > 0 && (
        <Section title="Objective Contributions">
          <ObjectiveBadges matches={matches} compact={false} />
        </Section>
      )}
      <NotesField notes={session.notes} onUpdate={onUpdate} />
    </div>
  );
}

function ConditioningDetail({ session, onUpdate }: { session: ConditioningSession; onUpdate: UpdateFn }) {
  const matches = getMatches({ type: 'conditioning', session });
  return (
    <div className="space-y-5">
      {session.pullupSets.length > 0 && (
        <Section title="Pullups">
          <div className="space-y-1">
            {session.pullupSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">
                {set.reps} reps{set.weightAdded > 0 && ` +${set.weightAdded} lb`}{set.assist !== 'none' && ` (${set.assist} assist)`}
              </div>
            ))}
          </div>
        </Section>
      )}
      {session.deadhangSets.length > 0 && (
        <Section title="Deadhangs">
          <div className="space-y-1">
            {session.deadhangSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">{set.hangSeconds}s hang / {set.restSeconds}s rest</div>
            ))}
          </div>
        </Section>
      )}
      {session.hangboardSets.length > 0 && (
        <Section title="Hangboard">
          <div className="space-y-1">
            {session.hangboardSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">
                {set.edgeSizeMm}mm · {set.hangDurationSeconds}s × {set.rounds} rounds{set.weight > 0 && ` +${set.weight} lb`}
              </div>
            ))}
          </div>
        </Section>
      )}
      {matches.length > 0 && (
        <Section title="Objective Contributions">
          <ObjectiveBadges matches={matches} compact={false} />
        </Section>
      )}
      <NotesField notes={session.notes} onUpdate={onUpdate} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ActivityLog() {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const savedScroll = useRef(0);

  useEffect(() => {
    const log = getWorkoutLog();
    const merged: Entry[] = [
      ...log.cardio.map((s) => ({ type: 'cardio' as const, session: s })),
      ...log.strength.map((s) => ({ type: 'strength' as const, session: s })),
      ...log.climbing.map((s) => ({ type: 'climbing' as const, session: s })),
      ...log.conditioning.map((s) => ({ type: 'conditioning' as const, session: s })),
    ];
    merged.sort((a, b) => b.session.date.localeCompare(a.session.date));
    setAllEntries(merged);
  }, []);

  function openDetail(e: Entry) {
    savedScroll.current = window.scrollY;
    setSelected(e);
    setDeleteConfirm(false);
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    setSelected(null);
    setDeleteConfirm(false);
    requestAnimationFrame(() => window.scrollTo(0, savedScroll.current));
  }

  // Update fields on the selected session and persist to localStorage
  function updateSelected(updates: Record<string, unknown>) {
    if (!selected) return;
    const updatedSession = { ...selected.session, ...updates };
    const updatedEntry = { ...selected, session: updatedSession } as Entry;
    setSelected(updatedEntry);
    setAllEntries((prev) => prev.map((e) => e.session.id === selected.session.id ? updatedEntry : e));

    const log = getWorkoutLog();
    const id = selected.session.id;
    if (selected.type === 'cardio') {
      const idx = log.cardio.findIndex((s) => s.id === id);
      if (idx >= 0) Object.assign(log.cardio[idx], updates);
    } else if (selected.type === 'strength') {
      const idx = log.strength.findIndex((s) => s.id === id);
      if (idx >= 0) Object.assign(log.strength[idx], updates);
    } else if (selected.type === 'climbing') {
      const idx = log.climbing.findIndex((s) => s.id === id);
      if (idx >= 0) Object.assign(log.climbing[idx], updates);
    } else if (selected.type === 'conditioning') {
      const idx = log.conditioning.findIndex((s) => s.id === id);
      if (idx >= 0) Object.assign(log.conditioning[idx], updates);
    }
    setWorkoutLog(log);
  }

  // Update a single strength set and persist
  function updateStrengthSet(exIdx: number, setIdx: number, field: 'reps' | 'weight', raw: string) {
    if (!selected || selected.type !== 'strength') return;
    const session = selected.session as StrengthSession;
    const value = field === 'reps' ? (parseInt(raw) || 0) : (parseFloat(raw) || 0);
    const updatedExercises = session.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((set, si) => si === setIdx ? { ...set, [field]: value } : set) };
    });
    updateSelected({ exercises: updatedExercises });
  }

  // Delete the selected session from workoutLog
  function deleteSelected() {
    if (!selected) return;
    const log = getWorkoutLog();
    const id = selected.session.id;
    if (selected.type === 'cardio') log.cardio = log.cardio.filter((s) => s.id !== id);
    else if (selected.type === 'strength') log.strength = log.strength.filter((s) => s.id !== id);
    else if (selected.type === 'climbing') log.climbing = log.climbing.filter((s) => s.id !== id);
    else if (selected.type === 'conditioning') log.conditioning = log.conditioning.filter((s) => s.id !== id);
    setWorkoutLog(log);
    setAllEntries((prev) => prev.filter((e) => e.session.id !== id));
    closeDetail();
  }

  const filtered = filter === 'all' ? allEntries : allEntries.filter((e) => e.type === filter);
  const visible = filtered.slice(0, visibleCount);

  // ── Detail view ─────────────────────────────────────────────────────────

  if (selected) {
    const focus = getFocus(selected);
    const intensity = getIntensity(selected);
    const duration = selected.type === 'cardio' ? formatDuration(selected.session.duration) : null;

    return (
      <div className="space-y-5">
        <button onClick={closeDetail} className="text-sm text-glacier-secondary hover:text-glacier-primary transition-colors">
          ← Activity log
        </button>

        {/* Header */}
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-glacier-secondary">{formatDate(selected.session.date)}</div>
              <div className={`text-sm font-semibold mt-0.5 ${domainClass(selected.type)}`}>{domainLabel(selected.type)}</div>
            </div>
            {intensity && <span className={`text-xs font-medium capitalize ${intensityClass(intensity)}`}>{intensity}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-glacier-primary">{focus}</span>
            {duration && <span className="text-xs text-glacier-muted">{duration}</span>}
          </div>
        </div>

        {/* Domain detail + editable fields */}
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4">
          {selected.type === 'cardio' && (
            <CardioDetail session={selected.session} onUpdate={updateSelected} />
          )}
          {selected.type === 'strength' && (
            <StrengthDetail session={selected.session} onUpdate={updateSelected} onSetChange={updateStrengthSet} />
          )}
          {selected.type === 'climbing' && (
            <ClimbingDetail session={selected.session} onUpdate={updateSelected} />
          )}
          {selected.type === 'conditioning' && (
            <ConditioningDetail session={selected.session} onUpdate={updateSelected} />
          )}
        </div>

        {/* Delete */}
        <div className="flex items-center gap-3">
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="text-xs text-glacier-danger hover:underline transition-colors">
              Delete session
            </button>
          ) : (
            <>
              <span className="text-xs text-glacier-secondary">Delete this session permanently?</span>
              <button onClick={deleteSelected}
                className="text-xs px-2.5 py-1 rounded bg-glacier-danger-soft text-glacier-danger border border-glacier-danger/30 hover:bg-glacier-danger hover:text-white transition-colors">
                Yes, delete
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────

  const filterOptions: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'strength', label: 'Strength' },
    { value: 'climbing', label: 'Climbing' },
    { value: 'conditioning', label: 'Conditioning' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {filterOptions.map((f) => (
          <button key={f.value}
            onClick={() => { setFilter(f.value); setVisibleCount(PAGE_SIZE); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-glacier-accent text-glacier-bg'
                : 'bg-glacier-card border border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover hover:text-glacier-primary'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-glacier-secondary py-4">No sessions logged yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((entry) => {
              const focus = getFocus(entry);
              const intensity = getIntensity(entry);
              const duration = entry.type === 'cardio' ? formatDuration(entry.session.duration) : null;
              const matches = getMatches(entry);
              return (
                <button key={entry.session.id} onClick={() => openDetail(entry)}
                  className="w-full text-left bg-glacier-card border border-glacier-edge rounded-lg px-4 py-3 card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-glacier-secondary">{formatDate(entry.session.date)}</span>
                        <span className={`text-xs font-medium ${domainClass(entry.type)}`}>{domainLabel(entry.type)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-glacier-primary truncate">{focus}</span>
                        {duration && <span className="text-xs text-glacier-muted shrink-0">{duration}</span>}
                      </div>
                      <ObjectiveBadges matches={matches} compact={true} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {intensity && <span className={`text-xs capitalize ${intensityClass(intensity)}`}>{intensity}</span>}
                      <span className="text-glacier-muted text-sm">›</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <button onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="w-full py-2 text-xs text-glacier-secondary border border-glacier-edge rounded-lg hover:border-glacier-edge-hover hover:text-glacier-primary transition-colors">
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
