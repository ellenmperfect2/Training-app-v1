import CheckInForm from '@/components/checkin/CheckInForm';
import Link from 'next/link';

export default function CheckInPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Daily Check-In</h1>
        <Link
          href="/checkin/history"
          className="text-xs text-glacier-secondary hover:text-glacier-primary transition-colors underline"
        >
          View history
        </Link>
      </div>
      <CheckInForm />
    </div>
  );
}
