'use client';
import { useState } from 'react';
import StrengthLogger from '@/components/log/strength/StrengthLogger';
import StrengthHistory from '@/components/log/strength/StrengthHistory';

export default function StrengthPage() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-glacier-primary">Strength Session</h1>
        {!showHistory && (
          <button
            onClick={() => setShowHistory(true)}
            className="text-sm text-glacier-secondary hover:text-glacier-primary transition-colors"
          >
            View History
          </button>
        )}
      </div>

      {showHistory
        ? <StrengthHistory onClose={() => setShowHistory(false)} />
        : <StrengthLogger />
      }
    </div>
  );
}
