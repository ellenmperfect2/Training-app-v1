import ZoneManager from '@/components/zones/ZoneManager';

export default function ZonesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Heart Rate Zones</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Zone thresholds used for FIT file zone distribution and cardio recommendations.
        </p>
      </div>
      <ZoneManager />
    </div>
  );
}
