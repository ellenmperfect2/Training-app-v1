'use client';
import { useState } from 'react';
import type { RecommendationCard as Rec } from '@/lib/recommendation';

interface Props {
  recommendation: Rec;
  date: string;
}

export default function RecommendationCard({ recommendation: rec, date }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
            Today&apos;s Recommendation
          </div>
          <div className="text-base font-semibold">{rec.title}</div>
        </div>
        <span className="text-xs text-zinc-600">{date}</span>
      </div>

      {/* Parameters — prominent session description */}
      {rec.parameters && (
        <div className="text-sm text-zinc-300 leading-relaxed">{rec.parameters}</div>
      )}

      {/* Exercises */}
      {rec.exercises.length > 0 && (
        <div className="space-y-1">
          {rec.exercises.map((ex) => (
            <div key={ex.exerciseId} className="flex items-center justify-between text-sm">
              <span className="text-zinc-200">{ex.name}</span>
              <span className="text-zinc-500">
                {ex.sets}×{ex.reps}
                {ex.note && <span className="ml-1 text-zinc-600 text-xs">({ex.note})</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modification / proximity flags */}
      <div className="space-y-1 text-xs">
        {rec.modificationFlag && (
          <div className="text-amber-400">{rec.modificationFlag}</div>
        )}
        {rec.proximityNote && (
          <div className="text-sky-400">{rec.proximityNote}</div>
        )}
      </div>

      {/* Collapsible "Why this?" */}
      <div>
        <button
          onClick={() => setWhyOpen((o) => !o)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
        >
          Why this? <span className="text-zinc-700">{whyOpen ? '▲' : '▼'}</span>
        </button>

        {whyOpen && (
          <div className="mt-2 space-y-1.5 text-xs text-zinc-500 border-l border-zinc-800 pl-3">
            {rec.whyNote && <div>{rec.whyNote}</div>}
            {rec.configInfluenceNote && (
              <div className="text-zinc-600">{rec.configInfluenceNote}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
