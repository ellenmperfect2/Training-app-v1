'use client';
import { useState } from 'react';
import {
  appendClimbingSession,
  getProgressionHistory,
  setProgressionHistory,
  type ClimbingSession,
  type Climb,
} from '@/lib/storage';
import { updateClimbingProgression } from '@/lib/progression';

type SessionType = ClimbingSession['sessionType'];

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'bouldering', label: 'Bouldering' },
  { value: 'top-rope', label: 'Top Rope' },
  { value: 'lead', label: 'Lead' },
  { value: 'outdoor-sport', label: 'Outdoor Sport' },
  { value: 'outdoor-trad', label: 'Outdoor Trad' },
];

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12'];
const YDS_GRADES = ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b'];

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function ClimbingLogger() {
  const [date, setDate] = useState(today());
  const [sessionType, setSessionType] = useState<SessionType>('bouldering');
  const [climbs, setClimbs] = useState<Climb[]>([{ grade: '', result: 'send' }]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const grades = sessionType === 'bouldering' ? V_GRADES : YDS_GRADES;

  function addClimb() {
    setClimbs((prev) => [...prev, { grade: '', result: 'send' }]);
  }

  function removeClimb(i: number) {
    setClimbs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateClimb(i: number, field: keyof Climb, value: string) {
    setClimbs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function handleSave() {
    const session: ClimbingSession = {
      id: uid(),
      date,
      sessionType,
      climbs: climbs.filter((c) => c.grade),
      notes,
    };

    appendClimbingSession(session);

    const history = getProgressionHistory();
    const updated = updateClimbingProgression(history, session);
    setProgressionHistory(updated);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setClimbs([{ grade: '', result: 'send' }]);
    setNotes('');
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Date</label>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-2">Session type</label>
        <div className="flex flex-wrap gap-2">
          {SESSION_TYPES.map((t) => (
            <button key={t.value} onClick={() => setSessionType(t.value)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                sessionType === t.value
                  ? 'bg-zinc-600 border-zinc-500'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Climbs</label>
          <button onClick={addClimb} className="text-xs text-zinc-400 hover:text-zinc-200">+ Add climb</button>
        </div>

        {climbs.map((climb, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={climb.grade}
              onChange={(e) => updateClimb(i, 'grade', e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Grade…</option>
              {grades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="flex gap-1">
              {(['send', 'attempt'] as const).map((r) => (
                <button key={r} onClick={() => updateClimb(i, 'result', r)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    climb.result === r
                      ? r === 'send' ? 'bg-green-900/50 border-green-700 text-green-300' : 'bg-zinc-700 border-zinc-600 text-zinc-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => removeClimb(i)} className="text-zinc-700 hover:text-zinc-500 text-xs ml-auto">✕</button>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm resize-none" />
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium">
        {saved ? 'Saved ✓' : 'Save Session'}
      </button>
    </div>
  );
}
