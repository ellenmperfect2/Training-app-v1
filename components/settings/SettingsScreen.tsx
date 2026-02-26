'use client';
import { useState, useEffect, useRef } from 'react';
import { getLastExportDate, setLastExportDate, clearLastExportDate } from '@/lib/storage';

const APP_VERSION = '0.1.0';

// All keys included in the export payload.
const EXPORT_KEYS = [
  'activeObjectives',
  'archivedObjectives',
  'workoutLog',
  'checkInLog',
  'personalBaseline',
  'stimulusHistory',
  'progressionHistory',
  'activeTrainingConfig',
  'configHistory',
  'combinedPlan',
  'conflicts',
  'userPreferences',
  'userZones',
] as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function SettingsScreen() {
  const [lastExportDate, setLastExportDateState] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importModal, setImportModal] = useState<{
    exportDate: string;
    data: Record<string, unknown>;
  } | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [clearModal, setClearModal] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastExportDateState(getLastExportDate());
  }, []);

  // ── Export ─────────────────────────────────────────────────────────────

  function handleExport() {
    const data: Record<string, unknown> = {};
    for (const key of EXPORT_KEYS) {
      const raw = window.localStorage.getItem(key);
      try {
        data[key] = raw !== null ? JSON.parse(raw) : null;
      } catch {
        data[key] = null;
      }
    }

    const payload = {
      exportVersion: 1,
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `summit-dashboard-backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const now = new Date().toISOString();
    setLastExportDate(now);
    setLastExportDateState(now);
    setExportMessage('Backup saved — store this file somewhere safe.');
    setTimeout(() => setExportMessage(null), 4000);
  }

  // ── Import ─────────────────────────────────────────────────────────────

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setImportError('Could not read file — make sure it is a valid JSON backup.');
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setImportError('Invalid backup file format.');
      return;
    }

    const payload = parsed as Record<string, unknown>;

    if (!('exportVersion' in payload)) {
      setImportError('Invalid backup: exportVersion field is missing.');
      return;
    }

    const data = payload.data as Record<string, unknown> | undefined;
    if (!data || !('workoutLog' in data) || !('checkInLog' in data)) {
      setImportError('Invalid backup: missing required workoutLog or checkInLog data.');
      return;
    }

    setImportError(null);
    setImportModal({
      exportDate: typeof payload.exportDate === 'string' ? payload.exportDate : '',
      data,
    });
  }

  function handleImportConfirm() {
    if (!importModal) return;
    const { data } = importModal;
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    }
    const successMsg = `Data restored from ${formatDate(importModal.exportDate)} backup.`;
    setImportModal(null);
    setImportSuccess(successMsg);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  // ── Clear All Data ─────────────────────────────────────────────────────

  function handleClearConfirm() {
    if (clearInput !== 'DELETE') return;
    for (const key of EXPORT_KEYS) {
      window.localStorage.removeItem(key);
    }
    clearLastExportDate();
    setClearModal(false);
    setClearInput('');
    window.location.reload();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Info panel */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">App version</span>
          <span className="text-xs font-mono text-zinc-400">{APP_VERSION}</span>
        </div>
        {lastExportDate && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Last backup from this device</span>
            <span className="text-xs text-zinc-400">{formatDate(lastExportDate)}</span>
          </div>
        )}
        <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800 mt-2">
          Your data is stored in this browser only. Export regularly to protect against data
          loss. To move to a new device, export here and import on the new device.
        </p>
      </section>

      {/* Export */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Export My Data</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Download all your workout history, check-ins, objectives, and settings as a JSON
            file.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-100 font-medium transition-colors"
        >
          Export My Data
        </button>
        {exportMessage && (
          <p className="text-xs text-green-400">{exportMessage}</p>
        )}
      </section>

      {/* Import */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Restore from Backup</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Replace all current data with a previously exported backup file.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-300 font-medium transition-colors"
        >
          Restore from Backup
        </button>
        {importError && (
          <p className="text-xs text-red-400">{importError}</p>
        )}
      </section>

      {/* Clear All Data */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Clear All Data</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Permanently delete all workout history, check-ins, objectives, and settings.
          </p>
        </div>
        <button
          onClick={() => setClearModal(true)}
          className="px-4 py-2 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-sm text-red-400 font-medium transition-colors"
        >
          Clear All Data
        </button>
      </section>

      {/* Import confirmation modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Confirm Restore</h3>
            <p className="text-sm text-zinc-400">
              This will replace all current app data with the contents of this backup from{' '}
              <span className="text-zinc-200">{formatDate(importModal.exportDate)}</span>.
              This cannot be undone. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setImportModal(null)}
                className="px-4 py-2 rounded text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-100 font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import success overlay */}
      {importSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full">
            <p className="text-sm text-green-400 text-center">{importSuccess}</p>
          </div>
        </div>
      )}

      {/* Clear All Data confirmation modal */}
      {clearModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-semibold text-red-400">Delete All Data</h3>
            <p className="text-sm text-zinc-400">
              This permanently deletes all your workout history, check-ins, objectives, and
              settings. This cannot be undone.
            </p>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={clearInput}
                onChange={(e) => setClearInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setClearModal(false); setClearInput(''); }}
                className="px-4 py-2 rounded text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                disabled={clearInput !== 'DELETE'}
                className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-800 hover:bg-red-700 text-zinc-100"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
