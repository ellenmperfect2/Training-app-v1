'use client';
import type { ArchivedObjective } from '@/lib/storage';

interface Props {
  archived: ArchivedObjective[];
}

export default function ObjectiveHistory({ archived }: Props) {
  if (archived.length === 0) {
    return (
      <div className="bg-glacier-card border border-glacier-edge rounded-lg p-6 text-center text-glacier-secondary text-sm">
        No completed objectives yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {archived.map((obj) => (
        <div key={obj.id} className="bg-glacier-card border border-glacier-edge rounded-lg p-4 space-y-3 card-hover">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-glacier-primary">{obj.name}</div>
              <div className="text-xs text-glacier-secondary">{obj.type}</div>
            </div>
            <span className={`text-xs font-medium ${
              obj.finalReadinessTier === 'ready'      ? 'text-glacier-success' :
              obj.finalReadinessTier === 'borderline' ? 'text-glacier-warning' : 'text-glacier-danger'
            }`}>
              {obj.finalReadinessTier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 text-xs text-glacier-secondary">
            <div>Activated: {obj.activatedDate}</div>
            <div>Target: {obj.targetDate}</div>
            <div>Completed: {obj.completedDate}</div>
            <div>Weeks trained: {obj.trainingSummary.totalWeeks}</div>
          </div>

          {obj.assessmentResults.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-glacier-muted">Assessment results</div>
              {obj.assessmentResults.map((r) => (
                <div key={r.assessmentId} className="flex justify-between text-xs">
                  <span className="text-glacier-secondary">{r.assessmentId}</span>
                  <span className={
                    r.result === 'pass'       ? 'text-glacier-success' :
                    r.result === 'miss'       ? 'text-glacier-danger' :
                    r.result === 'borderline' ? 'text-glacier-warning' : 'text-glacier-muted'
                  }>
                    {r.result ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
