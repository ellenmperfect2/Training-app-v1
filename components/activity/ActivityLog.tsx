'use client';
import { useState, useEffect, useRef } from 'react';
import {
  getWorkoutLog,
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

// ── Format helpers ─────────────────────────────────────────────────────────

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

// ── Entry helpers ──────────────────────────────────────────────────────────

function entryDate(e: Entry): string {
  return e.session.date;
}

function getFocus(e: Entry): string {
  if (e.type === 'cardio') {
    const s = e.session;
    const loaded = s.packWeight && s.packWeight !== 'none';
    const isHike = s.activityType.toLowerCase().includes('hike');
    if (loaded && isHike) return 'Loaded hike';
    return camelToWords(s.activityType);
  }
  if (e.type === 'strength') {
    const t = e.session.templateUsed
      ? templates.find((t) => t.id === e.session.templateUsed)
      : null;
    return t?.name ?? 'Custom strength';
  }
  if (e.type === 'climbing') {
    const map: Record<string, string> = {
      bouldering: 'Bouldering',
      'top-rope': 'Top rope',
      lead: 'Lead climbing',
      'outdoor-sport': 'Outdoor sport',
      'outdoor-trad': 'Outdoor trad',
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
  try {
    return (getContributingObjectives(e.session) as ObjectiveMatch[]) ?? [];
  } catch {
    return [];
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

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
        {zoneData.map((z) => (
          <div key={z.key} style={{ width: pct(z.mins), backgroundColor: z.color }} />
        ))}
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
          <span
            key={`${m.objectiveId}-${m.domain}`}
            className={`text-xs px-1.5 py-0.5 rounded border ${
              m.strength === 'primary'
                ? 'bg-glacier-accent-soft text-glacier-accent border-glacier-accent/30'
                : 'bg-glacier-card-alt text-glacier-secondary border-glacier-edge'
            }`}
          >
            {m.objectiveName}
          </span>
        ))}
      </div>
    );
  }

  // Group by objective, aggregate domains
  const grouped = new Map<string, { name: string; domains: string[]; isPrimary: boolean }>();
  for (const m of matches) {
    if (!grouped.has(m.objectiveId)) {
      grouped.set(m.objectiveId, { name: m.objectiveName, domains: [], isPrimary: false });
    }
    const g = grouped.get(m.objectiveId)!;
    g.domains.push(m.domain);
    if (m.strength === 'primary') g.isPrimary = true;
  }

  return (
    <div className="space-y-2">
      {Array.from(grouped.values()).map((g) => (
        <div key={g.name} className="flex items-start gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
              g.isPrimary
                ? 'bg-glacier-accent-soft text-glacier-accent border-glacier-accent/30'
                : 'bg-glacier-card-alt text-glacier-secondary border-glacier-edge'
            }`}
          >
            {g.isPrimary ? 'primary' : 'contributing'}
          </span>
          <span className="text-sm text-glacier-primary">
            {g.name}
            <span className="text-glacier-muted"> — {g.domains.join(', ')}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Detail sections ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-glacier-secondary uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function CardioDetail({ session }: { session: CardioSession }) {
  const matches = getMatches({ type: 'cardio', session });
  return (
    <div className="space-y-5">
      <Section title="Stats">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {session.elevationGain > 0 && (
            <div>
              <div className="text-xs text-glacier-muted">Elevation gain</div>
              <div className="text-sm text-glacier-primary">{Math.round(session.elevationGain).toLocaleString()} ft</div>
            </div>
          )}
          {session.distance > 0 && (
            <div>
              <div className="text-xs text-glacier-muted">Distance</div>
              <div className="text-sm text-glacier-primary">{(session.distance / 1000).toFixed(1)} km</div>
            </div>
          )}
          {session.packWeight && session.packWeight !== 'none' && (
            <div>
              <div className="text-xs text-glacier-muted">Pack weight</div>
              <div className="text-sm text-glacier-primary capitalize">{session.packWeight}</div>
            </div>
          )}
          {session.terrain && (
            <div>
              <div className="text-xs text-glacier-muted">Terrain</div>
              <div className="text-sm text-glacier-primary capitalize">{session.terrain}</div>
            </div>
          )}
          {session.avgHR && (
            <div>
              <div className="text-xs text-glacier-muted">Avg HR</div>
              <div className="text-sm text-glacier-primary">{session.avgHR} bpm</div>
            </div>
          )}
          {session.maxHR && (
            <div>
              <div className="text-xs text-glacier-muted">Max HR</div>
              <div className="text-sm text-glacier-primary">{session.maxHR} bpm</div>
            </div>
          )}
        </div>
      </Section>

      {session.zoneDistribution && (
        <Section title="HR Zones">
          <ZoneBar zones={session.zoneDistribution} />
        </Section>
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

      {session.notes && (
        <Section title="Notes">
          <p className="text-sm text-glacier-secondary">{session.notes}</p>
        </Section>
      )}
    </div>
  );
}

function StrengthDetail({ session }: { session: StrengthSession }) {
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
        <div className="space-y-3">
          {hasImprovement && (
            <span className="text-xs text-glacier-success font-medium">↑ Progressive overload on at least one lift</span>
          )}
          {session.exercises.map((ex, idx) => {
            const def = exercises.find((e) => e.id === ex.exerciseId);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="text-sm font-medium text-glacier-primary">{def?.name ?? ex.exerciseId}</div>
                <div className="space-y-1">
                  {ex.sets.map((set, si) => (
                    <div key={si} className="text-xs text-glacier-secondary flex gap-2">
                      <span className="text-glacier-muted w-4">#{set.setNumber}</span>
                      <span>{set.reps} reps × {set.weight} {set.unit}</span>
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

      {session.notes && (
        <Section title="Notes">
          <p className="text-sm text-glacier-secondary">{session.notes}</p>
        </Section>
      )}
    </div>
  );
}

function ClimbingDetail({ session }: { session: ClimbingSession }) {
  const matches = getMatches({ type: 'climbing', session });
  const sends = session.climbs.filter((c) => c.result === 'send');
  const attempts = session.climbs.filter((c) => c.result === 'attempt');

  return (
    <div className="space-y-5">
      {session.climbs.length > 0 && (
        <Section title={`Climbs (${session.climbs.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {sends.map((c, i) => (
              <span key={`s${i}`} className="text-xs px-2 py-0.5 rounded bg-glacier-success-soft text-glacier-success border border-glacier-success/20">
                {c.grade} ✓
              </span>
            ))}
            {attempts.map((c, i) => (
              <span key={`a${i}`} className="text-xs px-2 py-0.5 rounded bg-glacier-card-alt text-glacier-secondary border border-glacier-edge">
                {c.grade} ○
              </span>
            ))}
          </div>
        </Section>
      )}

      {matches.length > 0 && (
        <Section title="Objective Contributions">
          <ObjectiveBadges matches={matches} compact={false} />
        </Section>
      )}

      {session.notes && (
        <Section title="Notes">
          <p className="text-sm text-glacier-secondary">{session.notes}</p>
        </Section>
      )}
    </div>
  );
}

function ConditioningDetail({ session }: { session: ConditioningSession }) {
  const matches = getMatches({ type: 'conditioning', session });

  return (
    <div className="space-y-5">
      {session.pullupSets.length > 0 && (
        <Section title="Pullups">
          <div className="space-y-1">
            {session.pullupSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">
                {set.reps} reps
                {set.weightAdded > 0 && ` +${set.weightAdded} lb`}
                {set.assist !== 'none' && ` (${set.assist} assist)`}
              </div>
            ))}
          </div>
        </Section>
      )}

      {session.deadhangSets.length > 0 && (
        <Section title="Deadhangs">
          <div className="space-y-1">
            {session.deadhangSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">
                {set.hangSeconds}s hang / {set.restSeconds}s rest
              </div>
            ))}
          </div>
        </Section>
      )}

      {session.hangboardSets.length > 0 && (
        <Section title="Hangboard">
          <div className="space-y-1">
            {session.hangboardSets.map((set, i) => (
              <div key={i} className="text-sm text-glacier-secondary">
                {set.edgeSizeMm}mm · {set.hangDurationSeconds}s × {set.rounds} rounds
                {set.weight > 0 && ` +${set.weight} lb`}
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

      {session.notes && (
        <Section title="Notes">
          <p className="text-sm text-glacier-secondary">{session.notes}</p>
        </Section>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ActivityLog() {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Entry | null>(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    const log = getWorkoutLog();
    const merged: Entry[] = [
      ...log.cardio.map((s) => ({ type: 'cardio' as const, session: s })),
      ...log.strength.map((s) => ({ type: 'strength' as const, session: s })),
      ...log.climbing.map((s) => ({ type: 'climbing' as const, session: s })),
      ...log.conditioning.map((s) => ({ type: 'conditioning' as const, session: s })),
    ];
    merged.sort((a, b) => entryDate(b).localeCompare(entryDate(a)));
    setAllEntries(merged);
  }, []);

  function openDetail(e: Entry) {
    savedScroll.current = window.scrollY;
    setSelected(e);
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    setSelected(null);
    requestAnimationFrame(() => window.scrollTo(0, savedScroll.current));
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
        <button
          onClick={closeDetail}
          className="text-sm text-glacier-secondary hover:text-glacier-primary transition-colors"
        >
          ← Activity log
        </button>

        {/* Header */}
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-glacier-secondary">{formatDate(selected.session.date)}</div>
              <div className={`text-sm font-semibold mt-0.5 ${domainClass(selected.type)}`}>
                {domainLabel(selected.type)}
              </div>
            </div>
            {intensity && (
              <span className={`text-xs font-medium capitalize ${intensityClass(intensity)}`}>
                {intensity}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-glacier-primary">{focus}</span>
            {duration && <span className="text-xs text-glacier-muted">{duration}</span>}
          </div>
        </div>

        {/* Domain detail */}
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4">
          {selected.type === 'cardio' && <CardioDetail session={selected.session} />}
          {selected.type === 'strength' && <StrengthDetail session={selected.session} />}
          {selected.type === 'climbing' && <ClimbingDetail session={selected.session} />}
          {selected.type === 'conditioning' && <ConditioningDetail session={selected.session} />}
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
      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setVisibleCount(PAGE_SIZE); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-glacier-accent text-glacier-bg'
                : 'bg-glacier-card border border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover hover:text-glacier-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
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
                <button
                  key={entry.session.id}
                  onClick={() => openDetail(entry)}
                  className="w-full text-left bg-glacier-card border border-glacier-edge rounded-lg px-4 py-3 card-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-glacier-secondary">{formatDate(entry.session.date)}</span>
                        <span className={`text-xs font-medium ${domainClass(entry.type)}`}>
                          {domainLabel(entry.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-glacier-primary truncate">{focus}</span>
                        {duration && (
                          <span className="text-xs text-glacier-muted shrink-0">{duration}</span>
                        )}
                      </div>
                      <ObjectiveBadges matches={matches} compact={true} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {intensity && (
                        <span className={`text-xs capitalize ${intensityClass(intensity)}`}>{intensity}</span>
                      )}
                      <span className="text-glacier-muted text-sm">›</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="w-full py-2 text-xs text-glacier-secondary border border-glacier-edge rounded-lg hover:border-glacier-edge-hover hover:text-glacier-primary transition-colors"
            >
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
