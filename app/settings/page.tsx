import SettingsScreen from '@/components/settings/SettingsScreen';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Data backup, restore, and app information.</p>
      </div>
      <SettingsScreen />
    </div>
  );
}
