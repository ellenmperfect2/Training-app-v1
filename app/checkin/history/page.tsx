import CheckInHistory from '@/components/checkin/CheckInHistory';
import Link from 'next/link';

export default function CheckInHistoryPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/checkin"
          className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors"
        >
          ← Daily Check-In
        </Link>
        <h1 className="text-xl font-semibold">Check-In History</h1>
      </div>
      <CheckInHistory />
    </div>
  );
}
