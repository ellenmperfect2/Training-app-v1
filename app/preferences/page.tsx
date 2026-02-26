import PreferencesScreen from '@/components/preferences/PreferencesScreen';

export default function PreferencesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-glacier-primary">Preferences</h1>
        <p className="text-xs text-glacier-secondary mt-0.5">Controls how recommendations are filtered and framed.</p>
      </div>
      <PreferencesScreen />
    </div>
  );
}
