'use client';
import { useState, useEffect } from 'react';
import { getCheckInLog, setCheckInLog, upsertCheckIn, type DailyCheckIn } from '@/lib/storage';

const SLEEP_QUALITY_OPTIONS = ['Great', 'Good', 'Fair', 'Low', 'Poor'] as const;
const FLAG_OPTIONS = ['stress', 'travel', 'illness', 'altitude'] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function sleepQualityClass(quality: string): string {
  if (quality === 'Great' || quality === 'Good') {
    return 'bg-glacier-success-soft text-glacier-success';
  }
  if (quality === 'Fair') {
    return 'bg-glacier-card border border-glacier-edge text-glacier-secondary';
  }
  return 'bg-glacier-danger-soft text-glacier-danger';
}

// ── List row ──────────────────────────────────────────────────────────────────

function HistoryRow({ entry, onClick }: { entry: DailyCheckIn; onClick: () => void }) {
  const { sleep, recovery, subjectiveFeel, flags } = entry;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-glacier-card border border-glacier-edge rounded-lg px-4 py-3 hover:border-glacier-edge-hover transition-colors space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-glacier-primary">{formatDate(entry.date)}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${sleepQualityClass(sleep.quality)}`}>
            {sleep.quality}
          </span>
          <span className="text-xs text-glacier-muted">{formatHours(sleep.hours)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-glacier-secondary">
          HRV {recovery.hrv != null ? `${recovery.hrv}ms` : '—'}
        </span>
        <span className="text-glacier-secondary">
          RHR {recovery.restingHR != null ? `${recovery.restingHR}bpm` : '—'}
        </span>
        <span className="text-glacier-muted">
          L{subjectiveFeel.legs}·E{subjectiveFeel.energy}·M{subjectiveFeel.motivation}
        </span>
        {flags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {flags.map((f) => (
              <span
                key={f}
                className="px-1.5 py-0.5 rounded bg-glacier-warning-soft text-glacier-primary capitalize"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
  log,
  onSelect,
}: {
  log: DailyCheckIn[];
  onSelect: (entry: DailyCheckIn) => void;
}) {
  const [showCount, setShowCount] = useState(30);
  const sorted = [...log].sort((a, b) => b.date.localeCompare(a.date));
  const visible = sorted.slice(0, showCount);
  const hasMore = sorted.length > showCount;

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-glacier-secondary">No check-in entries yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((entry) => (
        <HistoryRow key={entry.date} entry={entry} onClick={() => onSelect(entry)} />
      ))}
      {hasMore && (
        <button
          onClick={() => setShowCount((c) => c + 30)}
          className="w-full py-2 text-xs text-glacier-secondary hover:text-glacier-primary border border-glacier-edge rounded-lg transition-colors"
        >
          Load more ({sorted.length - showCount} older entries)
        </button>
      )}
    </div>
  );
}

// ── Score input (1–5 slider) ──────────────────────────────────────────────────

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm capitalize w-20 text-glacier-primary">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              n <= value
                ? 'bg-glacier-accent text-glacier-bg'
                : 'bg-glacier-card border border-glacier-edge text-glacier-secondary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="text-xs text-glacier-muted">{value}/5</span>
    </div>
  );
}

// ── Edit view ─────────────────────────────────────────────────────────────────

function EditView({
  entry,
  onSave,
  onCancel,
  onDelete,
}: {
  entry: DailyCheckIn;
  onSave: (updated: DailyCheckIn) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const hoursInt = Math.floor(entry.sleep.hours);
  const minutesInt = Math.round((entry.sleep.hours - hoursInt) * 60);

  const [sleepQuality, setSleepQuality] = useState(entry.sleep.quality);
  const [sleepHoursInt, setSleepHoursInt] = useState(hoursInt > 0 ? String(hoursInt) : '');
  const [sleepMinutes, setSleepMinutes] = useState(minutesInt > 0 ? String(minutesInt) : '');
  const [bedtime, setBedtime] = useState(entry.sleep.bedtime ?? '');
  const [wakeTime, setWakeTime] = useState(entry.sleep.wakeTime ?? '');
  const [hrv, setHrv] = useState(entry.recovery.hrv != null ? String(entry.recovery.hrv) : '');
  const [restingHR, setRestingHR] = useState(
    entry.recovery.restingHR != null ? String(entry.recovery.restingHR) : ''
  );
  const [hrLow, setHrLow] = useState(
    entry.recovery.hrRangeLow != null ? String(entry.recovery.hrRangeLow) : ''
  );
  const [hrHigh, setHrHigh] = useState(
    entry.recovery.hrRangeHigh != null ? String(entry.recovery.hrRangeHigh) : ''
  );
  const [legs, setLegs] = useState(entry.subjectiveFeel.legs);
  const [energy, setEnergy] = useState(entry.subjectiveFeel.energy);
  const [motivation, setMotivation] = useState(entry.subjectiveFeel.motivation);
  const [flags, setFlags] = useState<DailyCheckIn['flags']>(entry.flags);
  const [notes, setNotes] = useState(entry.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleFlag(flag: DailyCheckIn['flags'][number]) {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  function handleSave() {
    const updated: DailyCheckIn = {
      date: entry.date,
      sleep: {
        quality: sleepQuality,
        hours: (parseInt(sleepHoursInt) || 0) + (parseInt(sleepMinutes) || 0) / 60,
        bedtime: bedtime || undefined,
        wakeTime: wakeTime || undefined,
      },
      recovery: {
        hrv: hrv ? parseFloat(hrv) : null,
        restingHR: restingHR ? parseFloat(restingHR) : null,
        hrRangeLow: hrLow ? parseFloat(hrLow) : null,
        hrRangeHigh: hrHigh ? parseFloat(hrHigh) : null,
      },
      subjectiveFeel: { legs, energy, motivation },
      flags,
      notes,
      // Preserve existing classification — no re-classification on edit
      recoveryClassification: entry.recoveryClassification,
    };
    onSave(updated);
  }

  return (
    <div className="space-y-6">

      {/* Date — display only */}
      <div>
        <span className="text-xs text-glacier-secondary uppercase tracking-wider">Date</span>
        <p className="text-sm font-medium text-glacier-primary mt-0.5">{formatDate(entry.date)}</p>
      </div>

      {/* Sleep */}
      <section className="space-y-3">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Sleep</h2>
        <div>
          <label className="block text-xs text-glacier-secondary mb-2">Quality</label>
          <div className="flex gap-2 flex-wrap">
            {SLEEP_QUALITY_OPTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setSleepQuality(q)}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                  sleepQuality === q
                    ? 'bg-glacier-accent border-glacier-accent text-glacier-bg'
                    : 'bg-glacier-card border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Hours</label>
            <input
              type="number" min="0" max="24"
              value={sleepHoursInt}
              onChange={(e) => setSleepHoursInt(e.target.value)}
              placeholder="7"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Minutes</label>
            <input
              type="number" min="0" max="59"
              value={sleepMinutes}
              onChange={(e) => setSleepMinutes(e.target.value)}
              placeholder="30"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Bedtime (optional)</label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Wake time (optional)</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
        </div>
      </section>

      {/* Recovery */}
      <section className="space-y-3">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Recovery</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">HRV (ms)</label>
            <input
              type="number" value={hrv} onChange={(e) => setHrv(e.target.value)}
              placeholder="65"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
          <div>
            <label className="block text-xs text-glacier-secondary mb-1">Resting HR (bpm)</label>
            <input
              type="number" value={restingHR} onChange={(e) => setRestingHR(e.target.value)}
              placeholder="52"
              className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-glacier-secondary mb-1">Morning HR range (bpm)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" value={hrLow} onChange={(e) => setHrLow(e.target.value)}
              placeholder="low"
              className="w-24 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
            <span className="text-glacier-muted">—</span>
            <input
              type="number" value={hrHigh} onChange={(e) => setHrHigh(e.target.value)}
              placeholder="high"
              className="w-24 bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
            />
          </div>
        </div>
      </section>

      {/* Subjective feel */}
      <section className="space-y-3">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">
          How do you feel this morning?
        </h2>
        <ScoreInput label="legs" value={legs} onChange={setLegs} />
        <ScoreInput label="energy" value={energy} onChange={setEnergy} />
        <ScoreInput label="motivation" value={motivation} onChange={setMotivation} />
      </section>

      {/* Flags */}
      <section className="space-y-2">
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">Flags</h2>
        <div className="flex gap-2 flex-wrap">
          {FLAG_OPTIONS.map((flag) => (
            <button
              key={flag}
              onClick={() => toggleFlag(flag)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors capitalize ${
                flags.includes(flag)
                  ? 'bg-glacier-warning-soft border-glacier-warning text-glacier-primary'
                  : 'bg-glacier-card border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <div>
        <label className="block text-xs text-glacier-secondary mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary resize-none input-glow"
          placeholder="Any context for today..."
        />
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-glacier-card border border-glacier-edge hover:border-glacier-edge-hover text-glacier-secondary rounded text-sm transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Delete */}
      <div className="border-t border-glacier-edge pt-4">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-glacier-danger hover:opacity-80 transition-opacity"
          >
            Delete this entry
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-glacier-primary">Delete this check-in entry?</p>
            <div className="flex gap-3">
              <button
                onClick={onDelete}
                className="px-3 py-1.5 bg-glacier-danger-soft border border-glacier-danger text-glacier-danger rounded text-xs font-medium hover:opacity-80 transition-opacity"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-glacier-secondary hover:text-glacier-primary text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CheckInHistory() {
  const [log, setLog] = useState<DailyCheckIn[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DailyCheckIn | null>(null);

  useEffect(() => {
    setLog(getCheckInLog());
  }, []);

  function handleSave(updated: DailyCheckIn) {
    upsertCheckIn(updated);
    setLog(getCheckInLog());
    setSelectedEntry(null);
  }

  function handleDelete() {
    if (!selectedEntry) return;
    const current = getCheckInLog();
    setCheckInLog(current.filter((e) => e.date !== selectedEntry.date));
    setLog(getCheckInLog());
    setSelectedEntry(null);
  }

  if (selectedEntry) {
    return (
      <EditView
        entry={selectedEntry}
        onSave={handleSave}
        onCancel={() => setSelectedEntry(null)}
        onDelete={handleDelete}
      />
    );
  }

  return <ListView log={log} onSelect={setSelectedEntry} />;
}
