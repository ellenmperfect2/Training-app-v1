'use client';
import type { ArchivedObjective } from '@/lib/storage';

interface Props {
  archived: ArchivedObjective[];
}

export default function ObjectiveHistory({ archived }: Props) {
  if (archived.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-sm">
        No completed objectives yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {archived.map((obj) => (
        <div key={obj.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{obj.name}</div>
              <div className="text-xs text-zinc-500">{obj.type}</div>
            </div>
            <span className={`text-xs font-medium ${
              obj.finalReadinessTier === 'ready' ? 'text-green-400' :
              obj.finalReadinessTier === 'borderline' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {obj.finalReadinessTier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 text-xs text-zinc-500">
            <div>Activated: {obj.activatedDate}</div>
            <div>Target: {obj.targetDate}</div>
            <div>Completed: {obj.completedDate}</div>
            <div>Weeks trained: {obj.trainingSummary.totalWeeks}</div>
          </div>

          {obj.assessmentResults.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-zinc-600">Assessment results</div>
              {obj.assessmentResults.map((r) => (
                <div key={r.assessmentId} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{r.assessmentId}</span>
                  <span className={
                    r.result === 'pass' ? 'text-green-400' :
                    r.result === 'miss' ? 'text-red-400' :
                    r.result === 'borderline' ? 'text-yellow-400' : 'text-zinc-600'
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
