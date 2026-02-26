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
    <div className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-glacier-secondary uppercase tracking-wider font-medium mb-1">
            Today&apos;s Recommendation
          </div>
          <div className="text-base font-semibold text-glacier-primary">{rec.title}</div>
        </div>
        <span className="text-xs text-glacier-muted">{date}</span>
      </div>

      {/* Parameters — prominent session description */}
      {rec.parameters && (
        <div className="text-sm text-glacier-primary leading-relaxed">{rec.parameters}</div>
      )}

      {/* Exercises */}
      {rec.exercises.length > 0 && (
        <div className="space-y-1">
          {rec.exercises.map((ex) => (
            <div key={ex.exerciseId} className="flex items-center justify-between text-sm">
              <span className="text-glacier-primary">{ex.name}</span>
              <span className="text-glacier-secondary">
                {ex.sets}×{ex.reps}
                {ex.note && <span className="ml-1 text-glacier-muted text-xs">({ex.note})</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modification / proximity flags */}
      <div className="space-y-1 text-xs">
        {rec.modificationFlag && (
          <div className="text-glacier-warning">{rec.modificationFlag}</div>
        )}
        {rec.proximityNote && (
          <div className="text-glacier-accent">{rec.proximityNote}</div>
        )}
      </div>

      {/* Collapsible "Why this?" */}
      <div>
        <button
          onClick={() => setWhyOpen((o) => !o)}
          className="text-xs text-glacier-muted hover:text-glacier-secondary transition-colors flex items-center gap-1"
        >
          Why this? <span className="text-glacier-muted">{whyOpen ? '▲' : '▼'}</span>
        </button>

        {whyOpen && (
          <div className="mt-2 space-y-1.5 text-xs text-glacier-secondary border-l border-glacier-edge pl-3">
            {rec.whyNote && <div>{rec.whyNote}</div>}
            {rec.configInfluenceNote && (
              <div className="text-glacier-muted">{rec.configInfluenceNote}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
