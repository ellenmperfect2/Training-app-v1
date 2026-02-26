'use client';
import { useState } from 'react';
import {
  appendConditioningSession,
  type ConditioningSession,
  type PullupSet,
  type DeadhangSet,
  type HangboardSet,
} from '@/lib/storage';

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function ConditioningLogger() {
  const [date, setDate] = useState(today());
  const [pullupSets, setPullupSets] = useState<PullupSet[]>([]);
  const [deadhangSets, setDeanghSets] = useState<DeadhangSet[]>([]);
  const [hangboardSets, setHangboardSets] = useState<HangboardSet[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const session: ConditioningSession = {
      id: uid(),
      date,
      pullupSets,
      deadhangSets,
      hangboardSets,
      notes,
    };
    appendConditioningSession(session);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setPullupSets([]);
    setDeanghSets([]);
    setHangboardSets([]);
    setNotes('');
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Date</label>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
      </div>

      {/* Pullups */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Pullups</h2>
          <button onClick={() => setPullupSets((p) => [...p, { weightAdded: 0, reps: 0, assist: 'none' }])}
            className="text-xs text-zinc-400 hover:text-zinc-200">+ Set</button>
        </div>
        {pullupSets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" value={s.reps || ''} onChange={(e) => setPullupSets((prev) => prev.map((x, j) => j === i ? { ...x, reps: parseInt(e.target.value) || 0 } : x))}
              placeholder="reps" className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <input type="number" value={s.weightAdded || ''} onChange={(e) => setPullupSets((prev) => prev.map((x, j) => j === i ? { ...x, weightAdded: parseFloat(e.target.value) || 0 } : x))}
              placeholder="+lbs" className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <select value={s.assist} onChange={(e) => setPullupSets((prev) => prev.map((x, j) => j === i ? { ...x, assist: e.target.value as PullupSet['assist'] } : x))}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs">
              <option value="none">no band</option>
              <option value="light">light band</option>
              <option value="medium">medium band</option>
              <option value="heavy">heavy band</option>
            </select>
            <button onClick={() => setPullupSets((p) => p.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-zinc-500 text-xs">✕</button>
          </div>
        ))}
      </section>

      {/* Deadhangs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Deadhangs</h2>
          <button onClick={() => setDeanghSets((p) => [...p, { hangSeconds: 0, restSeconds: 0 }])}
            className="text-xs text-zinc-400 hover:text-zinc-200">+ Set</button>
        </div>
        {deadhangSets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" value={s.hangSeconds || ''} onChange={(e) => setDeanghSets((prev) => prev.map((x, j) => j === i ? { ...x, hangSeconds: parseInt(e.target.value) || 0 } : x))}
              placeholder="hang sec" className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-600">/ rest</span>
            <input type="number" value={s.restSeconds || ''} onChange={(e) => setDeanghSets((prev) => prev.map((x, j) => j === i ? { ...x, restSeconds: parseInt(e.target.value) || 0 } : x))}
              placeholder="rest sec" className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <button onClick={() => setDeanghSets((p) => p.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-zinc-500 text-xs">✕</button>
          </div>
        ))}
      </section>

      {/* Hangboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Hangboard</h2>
          <button onClick={() => setHangboardSets((p) => [...p, { edgeSizeMm: 18, hangDurationSeconds: 7, restDurationSeconds: 3, rounds: 6, weight: 0, assist: 'none' }])}
            className="text-xs text-zinc-400 hover:text-zinc-200">+ Set</button>
        </div>
        {hangboardSets.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-500">edge</label>
            <input type="number" value={s.edgeSizeMm} onChange={(e) => setHangboardSets((prev) => prev.map((x, j) => j === i ? { ...x, edgeSizeMm: parseInt(e.target.value) || 18 } : x))}
              className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-600">mm</span>
            <label className="text-xs text-zinc-500">hang</label>
            <input type="number" value={s.hangDurationSeconds} onChange={(e) => setHangboardSets((prev) => prev.map((x, j) => j === i ? { ...x, hangDurationSeconds: parseInt(e.target.value) || 7 } : x))}
              className="w-12 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-600">s / rest</span>
            <input type="number" value={s.restDurationSeconds} onChange={(e) => setHangboardSets((prev) => prev.map((x, j) => j === i ? { ...x, restDurationSeconds: parseInt(e.target.value) || 3 } : x))}
              className="w-12 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-600">s ×</span>
            <input type="number" value={s.rounds} onChange={(e) => setHangboardSets((prev) => prev.map((x, j) => j === i ? { ...x, rounds: parseInt(e.target.value) || 6 } : x))}
              className="w-12 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-600">rounds</span>
            <button onClick={() => setHangboardSets((p) => p.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-zinc-500 text-xs">✕</button>
          </div>
        ))}
      </section>

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
