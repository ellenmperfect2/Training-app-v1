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
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">HR Calibration Offset</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Adjusts all Coros HR readings before they're used in analysis. Positive = your device reads low (corrects up). Negative = your device reads high (corrects down).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffset(offset - 1)}
            className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            −
          </button>
          <span className="text-lg font-mono text-zinc-100 w-12 text-center">
            {offset >= 0 ? `+${offset}` : offset}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            +
          </button>
          <span className="text-xs text-zinc-500 ml-2">bpm</span>
        </div>

        {offset !== 0 && (
          <div className="text-xs text-zinc-500 bg-zinc-950 rounded px-3 py-2">
            Example: raw {exampleRaw} bpm → calibrated <span className="text-zinc-300">{exampleCalibrated} bpm</span>
          </div>
        )}
        {offset === 0 && (
          <div className="text-xs text-zinc-600">No offset applied — HR readings used as-is.</div>
        )}
      </section>

      {/* Active Limitations */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Active Limitations</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
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
                    ? 'bg-amber-900/30 border-amber-700 text-amber-300'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                  active ? 'bg-amber-600 border-amber-600' : 'border-zinc-600'
                }`}>
                  {active && <span className="text-white text-xs leading-none">✓</span>}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Training Methodology</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
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
                    ? 'bg-zinc-700 border-zinc-600'
                    : 'bg-zinc-950 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 ${
                  active ? 'bg-zinc-300 border-zinc-300' : 'border-zinc-500'
                }`} />
                <div>
                  <div className={`text-sm font-medium ${active ? 'text-zinc-100' : 'text-zinc-300'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Suppressed recommendation types */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Suppressed Recommendation Types</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
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
                    ? 'bg-red-900/20 border-red-800 text-red-300'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                  active ? 'bg-red-700 border-red-700' : 'border-zinc-600'
                }`}>
                  {active && <span className="text-white text-xs leading-none">✓</span>}
                </span>
                <div>
                  <div className={`text-sm font-medium ${active ? 'text-red-300' : 'text-zinc-300'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Objective notes */}
      {objectiveNames.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Objective Notes</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Personal context for each active objective. Included in Claude.ai analysis prompts.
            </p>
          </div>

          <div className="space-y-3">
            {objectiveNames.map(({ id, name }) => (
              <div key={id}>
                <label className="block text-xs text-zinc-400 mb-1">{name}</label>
                <textarea
                  value={prefs.objectiveNotes[id] ?? ''}
                  onChange={(e) => setObjectiveNote(id, e.target.value)}
                  onBlur={() => saveObjectiveNote(id)}
                  rows={2}
                  placeholder="e.g. Aiming for a sub-12h finish, training at altitude in June..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm resize-none text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Save indicator */}
      {saved && (
        <div className="text-xs text-green-400 text-center py-1 transition-opacity">
          Saved
        </div>
      )}
    </div>
  );
}
