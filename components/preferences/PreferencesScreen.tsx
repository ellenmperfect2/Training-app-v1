'use client';
import { useState, useEffect } from 'react';
import {
  getUserPreferences,
  setUserPreferences,
  getActiveObjectives,
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
  type LimitationType,
  type MethodologyType,
  type SuppressedRecommendationType,
} from '@/lib/storage';

const LIMITATION_OPTIONS: { value: LimitationType; label: string }[] = [
  { value: 'knee', label: 'Knee' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'back', label: 'Back' },
  { value: 'forearm', label: 'Forearm / grip' },
  { value: 'other', label: 'Other' },
];

const METHODOLOGY_OPTIONS: { value: MethodologyType; label: string; description: string }[] = [
  {
    value: 'uphill-athlete',
    label: 'Uphill Athlete',
    description: 'Zone 2 base and mountain-specific strength; prioritizes aerobic engine for alpine objectives.',
  },
  {
    value: 'general-endurance',
    label: 'General Endurance',
    description: 'Mixed cardio with less terrain specificity; suitable for road running and cycling goals.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Equal emphasis across cardio, strength, and skill domains with no single priority.',
  },
];

const SUPPRESSION_OPTIONS: { value: SuppressedRecommendationType; label: string; description: string }[] = [
  {
    value: 'high-impact-cardio',
    label: 'High-impact cardio',
    description: 'Suppress running and plyometric cardio suggestions.',
  },
  {
    value: 'heavy-lower-body',
    label: 'Heavy lower body',
    description: 'Suppress heavy squat, deadlift, and lunge suggestions.',
  },
  {
    value: 'climbing',
    label: 'Climbing sessions',
    description: 'Suppress gym and outdoor climbing session suggestions.',
  },
];

export default function PreferencesScreen() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [objectiveNames, setObjectiveNames] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(getUserPreferences());
    const objectives = getActiveObjectives();
    setObjectiveNames(objectives.map((o) => ({ id: o.id, name: o.name })));
  }, []);

  function save(updated: UserPreferences) {
    setPrefs(updated);
    setUserPreferences(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function toggleLimitation(val: LimitationType) {
    const current = prefs.activeLimitations;
    const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
    save({ ...prefs, activeLimitations: next });
  }

  function toggleSuppression(val: SuppressedRecommendationType) {
    const current = prefs.suppressedRecommendationTypes;
    const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
    save({ ...prefs, suppressedRecommendationTypes: next });
  }

  function setMethodology(val: MethodologyType) {
    save({ ...prefs, preferredMethodology: val });
  }

  function setOffset(val: number) {
    const clamped = Math.max(-20, Math.min(20, val));
    save({ ...prefs, hrCalibrationOffset: clamped });
  }

  function setObjectiveNote(id: string, note: string) {
    const updated = { ...prefs, objectiveNotes: { ...prefs.objectiveNotes, [id]: note } };
    setPrefs(updated);
  }

  function saveObjectiveNote(id: string) {
    setUserPreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const offset = prefs.hrCalibrationOffset;
  const exampleRaw = 145;
  const exampleCalibrated = exampleRaw + offset;

  return (
    <div className="space-y-8">

      {/* HR Calibration */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-glacier-primary">HR Calibration Offset</h2>
          <p className="text-xs text-glacier-secondary mt-0.5">
            Adjusts all Coros HR readings before they're used in analysis. Positive = your device reads low (corrects up). Negative = your device reads high (corrects down).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffset(offset - 1)}
            className="w-8 h-8 rounded bg-glacier-card-alt border border-glacier-edge text-glacier-secondary text-sm hover:border-glacier-edge-hover transition-colors"
          >
            −
          </button>
          <span className="text-lg font-mono text-glacier-primary w-12 text-center">
            {offset >= 0 ? `+${offset}` : offset}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            className="w-8 h-8 rounded bg-glacier-card-alt border border-glacier-edge text-glacier-secondary text-sm hover:border-glacier-edge-hover transition-colors"
          >
            +
          </button>
          <span className="text-xs text-glacier-secondary ml-2">bpm</span>
        </div>

        {offset !== 0 && (
          <div className="text-xs text-glacier-secondary bg-glacier-bg rounded px-3 py-2">
            Example: raw {exampleRaw} bpm → calibrated <span className="text-glacier-primary">{exampleCalibrated} bpm</span>
          </div>
        )}
        {offset === 0 && (
          <div className="text-xs text-glacier-muted">No offset applied — HR readings used as-is.</div>
        )}
      </section>

      {/* Active Limitations */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-glacier-primary">Active Limitations</h2>
          <p className="text-xs text-glacier-secondary mt-0.5">
            Exercises that stress these areas will be suppressed from daily recommendations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {LIMITATION_OPTIONS.map((opt) => {
            const active = prefs.activeLimitations.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleLimitation(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-sm text-left transition-colors ${
                  active
                    ? 'bg-glacier-warning-soft border-glacier-warning text-glacier-primary'
                    : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                  active ? 'bg-glacier-warning border-glacier-warning' : 'border-glacier-edge'
                }`}>
                  {active && <span className="text-glacier-bg text-xs leading-none">✓</span>}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-glacier-primary">Training Methodology</h2>
          <p className="text-xs text-glacier-secondary mt-0.5">
            Influences how the recommendation engine frames training priorities.
          </p>
        </div>

        <div className="space-y-2">
          {METHODOLOGY_OPTIONS.map((opt) => {
            const active = prefs.preferredMethodology === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMethodology(opt.value)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded border text-left transition-colors ${
                  active
                    ? 'bg-glacier-card-alt border-glacier-edge-hover'
                    : 'bg-glacier-card-alt border-glacier-edge hover:border-glacier-edge-hover'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 ${
                  active ? 'bg-glacier-accent border-glacier-accent' : 'border-glacier-edge'
                }`} />
                <div>
                  <div className={`text-sm font-medium ${active ? 'text-glacier-primary' : 'text-glacier-secondary'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-glacier-muted mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Suppressed recommendation types */}
      <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-glacier-primary">Suppressed Recommendation Types</h2>
          <p className="text-xs text-glacier-secondary mt-0.5">
            Permanently filter out categories of suggestions from your daily recommendation.
          </p>
        </div>

        <div className="space-y-2">
          {SUPPRESSION_OPTIONS.map((opt) => {
            const active = prefs.suppressedRecommendationTypes.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleSuppression(opt.value)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded border text-left transition-colors ${
                  active
                    ? 'bg-glacier-danger-soft border-glacier-danger text-glacier-primary'
                    : 'bg-glacier-card-alt border-glacier-edge text-glacier-secondary hover:border-glacier-edge-hover'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                  active ? 'bg-glacier-danger border-glacier-danger' : 'border-glacier-edge'
                }`}>
                  {active && <span className="text-glacier-bg text-xs leading-none">✓</span>}
                </span>
                <div>
                  <div className={`text-sm font-medium ${active ? 'text-glacier-danger' : 'text-glacier-secondary'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-glacier-muted mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Objective notes */}
      {objectiveNames.length > 0 && (
        <section className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-glacier-primary">Objective Notes</h2>
            <p className="text-xs text-glacier-secondary mt-0.5">
              Personal context for each active objective. Included in Claude.ai analysis prompts.
            </p>
          </div>

          <div className="space-y-3">
            {objectiveNames.map(({ id, name }) => (
              <div key={id}>
                <label className="block text-xs text-glacier-secondary mb-1">{name}</label>
                <textarea
                  value={prefs.objectiveNotes[id] ?? ''}
                  onChange={(e) => setObjectiveNote(id, e.target.value)}
                  onBlur={() => saveObjectiveNote(id)}
                  rows={2}
                  placeholder="e.g. Aiming for a sub-12h finish, training at altitude in June..."
                  className="w-full bg-glacier-card-alt border border-glacier-edge rounded px-3 py-2 text-sm resize-none text-glacier-primary placeholder-glacier-muted input-glow"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Save indicator */}
      {saved && (
        <div className="text-xs text-glacier-success text-center py-1 transition-opacity">
          Saved
        </div>
      )}
    </div>
  );
}
