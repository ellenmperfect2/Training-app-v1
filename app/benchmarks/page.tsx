import BenchmarkChecklist from '@/components/benchmarks/BenchmarkChecklist';

export default function BenchmarksPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Benchmarks</h1>
        <p className="text-sm text-glacier-secondary mt-1">
          Track your readiness benchmarks for each active objective.
        </p>
      </div>
      <BenchmarkChecklist />
    </div>
  );
}
