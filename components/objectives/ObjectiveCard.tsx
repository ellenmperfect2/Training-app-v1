'use client';
import { useState } from 'react';
import type { ActivatedObjective } from '@/lib/storage';
import { getObjectiveTimelineStatus } from '@/lib/status';
import { useTheme } from '@/lib/theme-context';
import { TYPE, GRID } from '@/lib/theme';
import { getTopoForPage } from '@/lib/topo-utils';
import TopoLayer from '@/components/TopoLayer';
import SurveyGrid from '@/components/SurveyGrid';

interface Props {
  objective: ActivatedObjective;
  onComplete: () => void;
  onUpdateWeight: (weight: number) => void;
}

export default function ObjectiveCard({ objective, onComplete, onUpdateWeight }: Props) {
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [weight, setWeight] = useState(objective.priorityWeight);
  const { theme: T } = useTheme();
  const topoData = getTopoForPage('objectives');

  const timeline = getObjectiveTimelineStatus(objective);
  const today = new Date().toISOString().slice(0, 10);
  const weeksOut = Math.round(
    (new Date(objective.targetDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  const timelineColor =
    timeline === 'on-track' ? T.mossHi :
    timeline === 'ahead'    ? T.moss :
    T.sand;

  function handleWeightChange(newWeight: number) {
    setWeight(newWeight);
    onUpdateWeight(newWeight);
  }

  return (
    <div
      className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Topo layer — behind all content, flipped */}
      <TopoLayer topoData={topoData} width={600} height={160} fadeDirection="bottom" flip={true} />
      {/* Survey grid */}
      <SurveyGrid width={600} height={160} opacity={GRID.objOpacity} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="flex items-start justify-between">
          <div>
            {/* Objective name — DM Serif Display */}
            <div style={{ ...TYPE.displayMd, color: T.ink }}>{objective.name}</div>
            <div style={{ fontSize: 10, color: T.inkMid, marginTop: 2 }}>{objective.type}</div>
          </div>
          <div className="text-right">
            {/* Key numeric callout — DM Serif Display */}
            <div style={{ ...TYPE.displayNum, color: T.ink, lineHeight: 1 }}>{weeksOut}</div>
            <div style={{ fontSize: 9, color: T.inkDim, letterSpacing: '0.08em' }}>weeks out</div>
            <div style={{ fontSize: 11, color: timelineColor, fontWeight: 500, marginTop: 4 }}>{timeline}</div>
          </div>
        </div>

        {/* Priority weight */}
        <div>
          <label style={{ display: 'block', fontSize: 10, color: T.inkMid, marginBottom: 4 }}>
            Priority weight: {weight}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={weight}
            onChange={(e) => handleWeightChange(parseInt(e.target.value))}
            style={{ accentColor: T.moss }}
            className="w-full"
          />
        </div>

        {/* Phase */}
        <div style={{ fontSize: 12, color: T.inkMid }}>Phase: {objective.currentPhase}</div>

        {/* Assessments */}
        {objective.assessmentResults.length > 0 && (
          <div className="space-y-1">
            <div style={{ fontSize: 10, color: T.inkDim }}>Assessments</div>
            {objective.assessmentResults.map((r) => (
              <div key={r.assessmentId} className="flex items-center justify-between text-xs">
                <span style={{ color: T.inkMid }}>{r.assessmentId}</span>
                <span style={{ color:
                  r.result === 'pass'       ? T.mossHi :
                  r.result === 'miss'       ? T.warn :
                  r.result === 'borderline' ? T.sand : T.inkDim
                }}>
                  {r.result ?? 'pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Complete */}
        <div style={{ paddingTop: 4, borderTop: `1px solid ${T.line}` }}>
          {!confirmComplete ? (
            <button
              onClick={() => setConfirmComplete(true)}
              style={{ fontSize: 12, color: T.inkDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Mark complete
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 12, color: T.inkMid }}>Archive this objective?</span>
              <button
                onClick={onComplete}
                style={{ fontSize: 12, color: T.mossHi, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Yes, archive
              </button>
              <button
                onClick={() => setConfirmComplete(false)}
                style={{ fontSize: 12, color: T.inkDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
