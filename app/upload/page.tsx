import UploadModal from '@/components/upload/UploadModal';
import CardioSummary from '@/components/upload/CardioSummary';

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-glacier-primary">Cardio</h1>
      <UploadModal />
      <CardioSummary />
    </div>
  );
}
