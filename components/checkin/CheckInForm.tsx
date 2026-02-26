'use client';
import { useState, useEffect } from 'react';
import {
  upsertCheckIn,
  getPersonalBaseline,
  setPersonalBaseline,
  getCheckInLog,
  type DailyCheckIn,
  type PersonalBaseline,
} from '@/lib/storage';
import { classifyRecovery, calculateBaseline } from '@/lib/recovery';

const SLEEP_QUALITY_OPTIONS = ['Great', 'Good', 'Fair', 'Low', 'Poor'] as const;
const FLAG_OPTIONS = ['stress', 'travel', 'illness', 'altitude'] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInForm() {
  const [date, setDate] = useState(today());
  const [sleepQuality, setSleepQuality] = useState<DailyCheckIn['sleep']['quality']>('Good');
  const [sleepHoursInt, setSleepHoursInt] = useState('');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [hrv, setHrv] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [hrLow, setHrLow] = useState('');
  const [hrHigh, setHrHigh] = useState('');
  const [legs, setLegs] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [motivation, setMotivation] = useState(3);
  const [flags, setFlags] = useState<DailyCheckIn['flags']>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [baseline, setBaseline] = useState<PersonalBaseline | null>(null);
  const [manualHrv, setManualHrv] = useState('');
  const [manualRhr, setManualRhr] = useState('');
  const [showBaselineSetup, setShowBaselineSetup] = useState(false);

  useEffect(() => {
    const bl = getPersonalBaseline();
    setBaseline(bl);
    const log = getCheckInLog();
    if (!bl.baselineEstablished && !bl.manualHrv && log.length === 0) {
      setShowBaselineSetup(true);
    }
  }, []);

  function toggleFlag(flag: DailyCheckIn['flags'][number]) {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  function handleSave() {
    const bl = getPersonalBaseline();
    const checkIn: DailyCheckIn = {
      date,
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
    };

    const detail = classifyRecovery(checkIn, bl);
    checkIn.recoveryClassification = detail.classification;

    upsertCheckIn(checkIn);

    const allCheckIns = getCheckInLog();
    const newBaseline = calculateBaseline(allCheckIns);
    newBaseline.manualHrv = bl.manualHrv;
    newBaseline.manualRestingHR = bl.manualRestingHR;
    setPersonalBaseline(newBaseline);
    setBaseline(newBaseline);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSaveBaseline() {
    const bl = getPersonalBaseline();
    bl.manualHrv = manualHrv ? parseFloat(manualHrv) : null;
    bl.manualRestingHR = manualRhr ? parseFloat(manualRhr) : null;
    setPersonalBaseline(bl);
    setBaseline(bl);
    setShowBaselineSetup(false);
  }

  const displayHrv = baseline?.hrv30DayAverage ?? baseline?.manualHrv;
  const displayRhr = baseline?.restingHR30DayAverage ?? baseline?.manualRestingHR;

  return (
    <div className="space-y-6">
      {/* Baseline setup prompt */}
      {showBaselineSetup && (
        <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-glacier-primary">Baseline Setup</p>
          <p className="text-xs text-glacier-secondary">
            Enter your typical HRV and resting HR, or skip and the app will calculate a rolling baseline after 14 days of check-ins.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-glacier-secondary mb-1">Typical HRV (ms)</label>
              <input
                type="number"
                value={manualHrv}
                onChange={(e) => setManualHrv(e.target.value)}
                placeholder="e.g. 65"
                className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
              />
            </div>
            <div>
              <label className="block text-xs text-glacier-secondary mb-1">Typical Resting HR (bpm)</label>
              <input
                type="number"
                value={manualRhr}
                onChange={(e) => setManualRhr(e.target.value)}
                placeholder="e.g. 52"
                className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-2 py-1.5 text-sm text-glacier-primary input-glow"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveBaseline}
              className="px-3 py-1.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
            >
              Save baseline
            </button>
            <button
              onClick={() => setShowBaselineSetup(false)}
              className="px-3 py-1.5 text-glacier-secondary hover:text-glacier-primary text-sm transition-colors"
            >
              Skip — I'll wait for rolling average
            </button>
          </div>
        </div>
      )}

      {/* Baseline display */}
      {(displayHrv || displayRhr) && (
        <div className="text-xs text-glacier-secondary flex gap-4">
          {displayHrv && <span>HRV baseline: {displayHrv}ms</span>}
          {displayRhr && <span>RHR baseline: {displayRhr}bpm</span>}
          {baseline?.baselineEstablished && <span className="text-glacier-muted">· 30-day rolling</span>}
          {!baseline?.baselineEstablished && <span className="text-glacier-muted">· manual</span>}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs text-glacier-secondary mb-1 uppercase tracking-wider">Date</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
        />
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
        <h2 className="text-xs text-glacier-secondary uppercase tracking-wider font-medium">How do you feel this morning?</h2>
        {(['legs', 'energy', 'motivation'] as const).map((field) => {
          const val = field === 'legs' ? legs : field === 'energy' ? energy : motivation;
          const setter = field === 'legs' ? setLegs : field === 'energy' ? setEnergy : setMotivation;
          return (
            <div key={field} className="flex items-center gap-4">
              <span className="text-sm capitalize w-20 text-glacier-primary">{field}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setter(n)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      n <= val
                        ? 'bg-glacier-accent text-glacier-bg'
                        : 'bg-glacier-card border border-glacier-edge text-glacier-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-glacier-muted">{val}/5</span>
            </div>
          );
        })}
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

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
      >
        {saved ? 'Saved ✓' : 'Save Check-In'}
      </button>
    </div>
  );
}
