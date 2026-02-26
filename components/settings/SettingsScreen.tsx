'use client';
import { useState, useEffect, useRef } from 'react';
import { getLastExportDate, setLastExportDate, clearLastExportDate } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';

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
  const { theme: T } = useTheme();
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

  const sectionStyle = {
    background: T.bg2,
    border: `1px solid ${T.line}`,
    borderRadius: 8,
    padding: 16,
  };

  return (
    <div className="space-y-6">

      {/* Info panel */}
      <section style={sectionStyle} className="space-y-2">
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: T.inkMid }}>App version</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: T.inkMid }}>{APP_VERSION}</span>
        </div>
        {lastExportDate && (
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: T.inkMid }}>Last backup from this device</span>
            <span style={{ fontSize: 12, color: T.inkMid }}>{formatDate(lastExportDate)}</span>
          </div>
        )}
        <p style={{ fontSize: 12, color: T.inkDim, paddingTop: 8, borderTop: `1px solid ${T.line}`, marginTop: 8 }}>
          Your data is stored in this browser only. Export regularly to protect against data
          loss. To move to a new device, export here and import on the new device.
        </p>
      </section>

      {/* Export */}
      <section style={sectionStyle} className="space-y-3">
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Export My Data</h2>
          <p style={{ fontSize: 12, color: T.inkMid, marginTop: 2 }}>
            Download all your workout history, check-ins, objectives, and settings as a JSON file.
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: T.surface,
            border: `1px solid ${T.line}`,
            color: T.ink,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Export My Data
        </button>
        {exportMessage && (
          <p style={{ fontSize: 12, color: T.mossHi }}>{exportMessage}</p>
        )}
      </section>

      {/* Import */}
      <section style={sectionStyle} className="space-y-3">
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Restore from Backup</h2>
          <p style={{ fontSize: 12, color: T.inkMid, marginTop: 2 }}>
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
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: T.bg2,
            border: `1px solid ${T.line}`,
            color: T.inkMid,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Restore from Backup
        </button>
        {importError && (
          <p style={{ fontSize: 12, color: T.warn }}>{importError}</p>
        )}
      </section>

      {/* Clear All Data */}
      <section style={sectionStyle} className="space-y-3">
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Clear All Data</h2>
          <p style={{ fontSize: 12, color: T.inkMid, marginTop: 2 }}>
            Permanently delete all workout history, check-ins, objectives, and settings.
          </p>
        </div>
        <button
          onClick={() => setClearModal(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: T.warn + '22',
            border: `1px solid ${T.warn}66`,
            color: T.warn,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Clear All Data
        </button>
      </section>

      {/* Import confirmation modal */}
      {importModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 24, maxWidth: 384, width: '100%' }} className="space-y-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Confirm Restore</h3>
            <p style={{ fontSize: 14, color: T.inkMid }}>
              This will replace all current app data with the contents of this backup from{' '}
              <span style={{ color: T.ink }}>{formatDate(importModal.exportDate)}</span>.
              This cannot be undone. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setImportModal(null)}
                style={{ padding: '8px 16px', borderRadius: 6, background: 'none', border: 'none', color: T.inkMid, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                style={{ padding: '8px 16px', borderRadius: 6, background: T.surface, border: `1px solid ${T.line}`, color: T.ink, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import success overlay */}
      {importSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 24, maxWidth: 384, width: '100%' }}>
            <p style={{ fontSize: 14, color: T.mossHi, textAlign: 'center' }}>{importSuccess}</p>
          </div>
        </div>
      )}

      {/* Clear All Data confirmation modal */}
      {clearModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 24, maxWidth: 384, width: '100%' }} className="space-y-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.warn }}>Delete All Data</h3>
            <p style={{ fontSize: 14, color: T.inkMid }}>
              This permanently deletes all your workout history, check-ins, objectives, and
              settings. This cannot be undone.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.inkDim, marginBottom: 4 }}>
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={clearInput}
                onChange={(e) => setClearInput(e.target.value)}
                style={{
                  width: '100%',
                  background: T.bg,
                  border: `1px solid ${T.line}`,
                  borderRadius: 4,
                  padding: '8px 12px',
                  fontSize: 14,
                  color: T.ink,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setClearModal(false); setClearInput(''); }}
                style={{ padding: '8px 16px', borderRadius: 6, background: 'none', border: 'none', color: T.inkMid, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                disabled={clearInput !== 'DELETE'}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: T.warn,
                  border: 'none',
                  color: T.bg,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: clearInput !== 'DELETE' ? 'not-allowed' : 'pointer',
                  opacity: clearInput !== 'DELETE' ? 0.4 : 1,
                }}
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
