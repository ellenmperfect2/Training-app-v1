'use client';
import { useState, useEffect } from 'react';
import {
  getUserZones,
  setUserZones,
  getUserPreferences,
  DEFAULT_USER_ZONES,
  type UserZones,
  type ZoneThresholds,
} from '@/lib/storage';
import { computeZonesFromAge, computeZonesFromMAF } from '@/lib/zones';

type Method = 'age-based' | 'maf' | 'custom';

const ZONE_LABELS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
const ZONE_COLORS_CSS = [
  'var(--zone1)',
  'var(--zone2)',
  'var(--zone3)',
  'var(--zone4)',
  'var(--zone5)',
];

function ZoneStrip({ zones, offset = 0 }: { zones: ZoneThresholds; offset?: number }) {
  const entries = [zones.z1, zones.z2, zones.z3, zones.z4, zones.z5];
  return (
    <div className="space-y-1.5">
      {entries.map((z, i) => {
        const lo = z.low + offset;
        const hi = z.high + offset;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-glacier-secondary w-5">{ZONE_LABELS[i]}</span>
            <div className="h-2 rounded flex-shrink-0 w-2" style={{ background: ZONE_COLORS_CSS[i] }} />
            <span className="text-xs text-glacier-primary tabular-nums">
              {lo}–{hi} bpm
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PreviewTable({ zones, offset = 0 }: { zones: ZoneThresholds; offset?: number }) {
  const entries = [zones.z1, zones.z2, zones.z3, zones.z4, zones.z5];
  return (
    <div className="bg-glacier-card-alt rounded px-3 py-2.5 space-y-1">
      <div className="text-xs text-glacier-muted mb-2">Preview (will save on confirm)</div>
      {entries.map((z, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ZONE_COLORS_CSS[i] }} />
          <span className="text-xs text-glacier-secondary w-5">{ZONE_LABELS[i]}</span>
          <span className="text-xs text-glacier-primary tabular-nums">
            {z.low + offset}–{z.high + offset} bpm
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ZoneManager() {
  const [zones, setZones] = useState<UserZones>(DEFAULT_USER_ZONES);
  const [method, setMethod] = useState<Method>('age-based');
  const [ageInput, setAgeInput] = useState('');
  const [preview, setPreview] = useState<ZoneThresholds | null>(null);
  const [customInputs, setCustomInputs] = useState({ z1: '', z2: '', z3: '', z4: '' });
  const [customError, setCustomError] = useState('');
  const [saved, setSaved] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const z = getUserZones();
    setZones(z);
    setMethod(z.method);
    if (z.age) setAgeInput(String(z.age));

    const prefs = getUserPreferences();
    setOffset(prefs.hrCalibrationOffset);
  }, []);

  function save(updated: UserZones) {
    setUserZones(updated);
    setZones(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  useEffect(() => {
    const age = parseInt(ageInput);
    if (!ageInput || isNaN(age) || age < 10 || age > 100) {
      setPreview(null);
      return;
    }
    if (method === 'age-based') setPreview(computeZonesFromAge(age));
    if (method === 'maf') setPreview(computeZonesFromMAF(age));
  }, [ageInput, method]);

  function handleAgeConfirm() {
    const age = parseInt(ageInput);
    if (isNaN(age) || age < 10 || age > 100) return;
    const computed = method === 'age-based' ? computeZonesFromAge(age) : computeZonesFromMAF(age);
    save({
      ...zones,
      method,
      age,
      maxHR: method === 'age-based' ? 220 - age : null,
      mafNumber: method === 'maf' ? 180 - age : null,
      activeZones: computed,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
    setPreview(null);
  }

  function handleCustomConfirm() {
    setCustomError('');
    const ceilings = [
      parseInt(customInputs.z1),
      parseInt(customInputs.z2),
      parseInt(customInputs.z3),
      parseInt(customInputs.z4),
    ];
    if (ceilings.some((c) => isNaN(c) || c < 50 || c > 220)) {
      setCustomError('All zone ceilings must be between 50 and 220 bpm.');
      return;
    }
    if (ceilings[0] >= ceilings[1] || ceilings[1] >= ceilings[2] || ceilings[2] >= ceilings[3]) {
      setCustomError('Zones must not overlap — each ceiling must be higher than the previous.');
      return;
    }
    const custom: ZoneThresholds = {
      z1: { low: 0, high: ceilings[0] },
      z2: { low: ceilings[0], high: ceilings[1] },
      z3: { low: ceilings[1], high: ceilings[2] },
      z4: { low: ceilings[2], high: ceilings[3] },
      z5: { low: ceilings[3], high: 220 },
    };
    save({
      ...zones,
      method: 'custom',
      customZones: custom,
      activeZones: custom,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }

  const mafNumber = zones.method === 'maf' && zones.mafNumber ? zones.mafNumber : null;

  return (
    <div className="space-y-6">
      {/* Current zones */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-glacier-primary">Current Zones</h2>
            <p className="text-xs text-glacier-secondary mt-0.5 capitalize">
              Method: {zones.method.replace('-', ' ')}
              {zones.age ? ` · Age ${zones.age}` : ''}
              {mafNumber ? ` · MAF ${mafNumber} bpm` : ''}
              {zones.lastUpdated ? ` · Updated ${zones.lastUpdated}` : ' · Default zones'}
            </p>
          </div>
          {saved && <span className="text-xs text-glacier-success">Saved</span>}
        </div>

        <ZoneStrip zones={zones.activeZones} offset={offset} />

        {offset !== 0 && (
          <p className="text-xs text-glacier-muted">
            HR calibration offset {offset > 0 ? '+' : ''}{offset} bpm applied to display.
          </p>
        )}
      </section>

      {/* Method selector */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-4 card-hover">
        <div>
          <h2 className="text-sm font-semibold text-glacier-primary">Update Zones</h2>
          <p className="text-xs text-glacier-secondary mt-0.5">Choose a calculation method.</p>
        </div>

        {/* Three-position toggle */}
        <div className="flex rounded border border-glacier-edge overflow-hidden text-sm">
          {(['age-based', 'maf', 'custom'] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setPreview(null); }}
              className={`flex-1 py-2 text-center transition-colors capitalize ${
                method === m
                  ? 'bg-glacier-accent text-glacier-bg font-semibold'
                  : 'text-glacier-secondary hover:text-glacier-primary hover:bg-glacier-card'
              }`}
            >
              {m === 'age-based' ? 'Age-Based' : m === 'maf' ? 'MAF Method' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Age-Based panel */}
        {method === 'age-based' && (
          <div className="space-y-3">
            <p className="text-xs text-glacier-secondary">
              Calculates zones as percentages of max HR (220 − age). Standard 5-zone model.
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={10} max={100}
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                placeholder="Age"
                className="w-24 bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
              />
              <span className="text-xs text-glacier-secondary">years old</span>
            </div>
            {preview && (
              <>
                <PreviewTable zones={preview} offset={offset} />
                <button
                  onClick={handleAgeConfirm}
                  className="w-full py-2 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
                >
                  Save These Zones
                </button>
              </>
            )}
          </div>
        )}

        {/* MAF Method panel */}
        {method === 'maf' && (
          <div className="space-y-3">
            <p className="text-xs text-glacier-secondary">
              MAF sets your aerobic ceiling at (180 − age) bpm. Recommended for aerobic base building phases.
              {ageInput && !isNaN(parseInt(ageInput)) && ` With your age, MAF = ${180 - parseInt(ageInput)} bpm.`}
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={10} max={100}
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                placeholder="Age"
                className="w-24 bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
              />
              <span className="text-xs text-glacier-secondary">years old</span>
            </div>
            {preview && (
              <>
                <PreviewTable zones={preview} offset={offset} />
                <button
                  onClick={handleAgeConfirm}
                  className="w-full py-2 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
                >
                  Save These Zones
                </button>
              </>
            )}
          </div>
        )}

        {/* Custom panel */}
        {method === 'custom' && (
          <div className="space-y-3">
            <p className="text-xs text-glacier-secondary">
              Enter results from a field test or lab test. Enter the ceiling of each zone (Z5 is above Z4 ceiling).
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'z1', label: 'Z1 ceiling' },
                { key: 'z2', label: 'Z2 ceiling' },
                { key: 'z3', label: 'Z3 ceiling' },
                { key: 'z4', label: 'Z4 ceiling' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-glacier-secondary mb-1">{label} (bpm)</label>
                  <input
                    type="number"
                    value={customInputs[key as keyof typeof customInputs]}
                    onChange={(e) => setCustomInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm text-glacier-primary input-glow"
                  />
                </div>
              ))}
            </div>
            {customError && (
              <p className="text-xs text-glacier-danger">{customError}</p>
            )}
            <button
              onClick={handleCustomConfirm}
              className="w-full py-2 bg-glacier-accent hover:opacity-90 text-glacier-bg rounded text-sm font-medium transition-opacity"
            >
              Save These Zones
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
