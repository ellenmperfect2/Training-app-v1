import ClimbingLogger from '@/components/log/climbing/ClimbingLogger';
import ConditioningLogger from '@/components/log/climbing/ConditioningLogger';

export default function ClimbingPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-glacier-primary mb-6">Climbing Session</h1>
        <ClimbingLogger />
      </div>
    </div>
  );
}
