import React, { useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/preferencesContext';
import { jiraFetcher, type FetchParams, type ScanResult } from '../utils/jiraFetcher';
import { defaultScanJql, defaultScanRange, scanPresetRange, type ScanPreset } from '../utils/scanDefaults';
import { csvExporter } from '../utils/csvExporter';
import type { WorklogEntry } from '../types/worklog';
import { Dialog } from './Dialog';

interface JiraFetchDialogProps {
  onClose: () => void;
  onImport: (entries: WorklogEntry[]) => void;
}

const PRESETS: Array<{ id: ScanPreset; label: string }> = [
  { id: 'thisWeek', label: 'This week' },
  { id: 'lastWeek', label: 'Last week' },
  { id: 'thisMonth', label: 'This month' },
];

export const JiraFetchDialog: React.FC<JiraFetchDialogProps> = ({ onClose, onImport }) => {
  const { config } = useAuth();
  const { dailyTarget } = usePreferences();
  // Lazy init: the parent mounts this dialog on open, so "today" is the day the dialog is opened.
  const [range, setRange] = useState(() => defaultScanRange(new Date()));
  const [customJql, setCustomJql] = useState<string | null>(null);
  // An edited JQL is the user's own query: date changes must not overwrite it, only "Reset" does.
  const jql = customJql ?? defaultScanJql(range.startDate, range.endDate);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFetch = async () => {
    if (!config) {
      setError('Connect to Jira in Settings first.');
      return;
    }
    setIsLoading(true);
    setScan(null);
    setError(null);
    setProgress({ current: 0, total: 0, message: 'Starting scan…' });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const params: FetchParams = { ...range, jql, defaultTime: dailyTarget };

    try {
      const scanResult = await jiraFetcher.fetchEvents(
        config,
        params,
        (current, total, message) => setProgress({ current, total, message }),
        controller.signal
      );
      setScan(scanResult);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(`Scan failed: ${(err as Error).message}. Check the JQL and that you are logged in to Jira.`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    setProgress(prev => ({ ...prev, message: 'Stopping… partial results follow.' }));
    abortControllerRef.current?.abort();
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const entries = scan?.entries ?? [];

  const footer = isLoading ? (
    <button type="button" className="btn-danger" onClick={handleStop}>Stop scan</button>
  ) : scan ? (
    <>
      <button type="button" className="btn-subtle mr-auto" onClick={() => setScan(null)}>Change parameters</button>
      <button
        type="button"
        className="btn"
        disabled={entries.length === 0}
        onClick={() => csvExporter.exportRawData(entries.map(r => ({ 'issue id': r.issueKey, date: r.date, hour: r.timeSpent, comment: r.comment })))}
      >
        <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
      </button>
      <button type="button" className="btn-primary" disabled={entries.length === 0} onClick={() => { onImport(entries); onClose(); }}>
        Add {entries.length} rows to workspace
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn-subtle" onClick={onClose}>Cancel</button>
      <button type="button" className="btn-primary" onClick={handleFetch}>Scan Jira</button>
    </>
  );

  return (
    <Dialog
      title="Scan Jira history"
      description={`Turns your worklogs, status changes and comments into rows. Daily target: ${dailyTarget} (change it in Settings).`}
      onClose={onClose}
      busy={isLoading}
      width="max-w-xl"
      footer={footer}
    >
      {error && <p role="alert" className="mb-3 px-2 py-1.5 rounded-[3px] text-sm bg-[var(--danger-bg)] text-[var(--danger)]">{error}</p>}

      {isLoading && (
        <div className="py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Scanning… {percent}%
          </div>
          <div
            role="progressbar"
            aria-label="Scan progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden"
          >
            <div className="h-full bg-atlassian-blue transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-[var(--text-subtle)]" aria-live="polite">{progress.message}</p>
        </div>
      )}

      {scan && !isLoading && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm">
            Found <strong>{entries.length}</strong> rows on <strong>{new Set(entries.map(r => r.issueKey)).size}</strong> issues
            over <strong>{new Set(entries.map(r => r.date)).size}</strong> days.
          </p>
          {scan.failedIssues.length > 0 && (
            <p role="alert" className="px-2 py-1.5 rounded-[3px] text-sm bg-[var(--danger-bg)] text-[var(--danger)]">
              Partial result: could not read {scan.failedIssues.join(', ')}. Their activity is missing.
            </p>
          )}
          {scan.fullDays.length > 0 && (
            <p className="px-2 py-1.5 rounded-[3px] text-sm bg-[var(--bg-input)] text-[var(--text-subtle)]">
              Already at target, no new rows: {scan.fullDays.join(', ')}.
            </p>
          )}
        </div>
      )}

      {!scan && !isLoading && (
        <div className="space-y-3">
          <div role="group" aria-label="Date range presets" className="flex flex-wrap gap-1">
            {PRESETS.map(p => {
              const presetRange = scanPresetRange(p.id, new Date());
              const active = presetRange.startDate === range.startDate && presetRange.endDate === range.endDate;
              return (
                <button key={p.id} type="button" className={active ? 'btn-primary' : 'btn'} aria-pressed={active} onClick={() => setRange(presetRange)}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="scan-start" className="field-label">Start date</label>
              <input id="scan-start" type="date" className="field" value={range.startDate} max={range.endDate}
                onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="scan-end" className="field-label">End date</label>
              <input id="scan-end" type="date" className="field" value={range.endDate} min={range.startDate}
                onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
          </div>
          <details className="rounded-[3px] border px-2 py-1.5">
            <summary className="cursor-pointer text-sm font-medium">Advanced: JQL{customJql !== null && ' (edited)'}</summary>
            <label htmlFor="scan-jql" className="field-label mt-2">Issues to scan</label>
            <textarea id="scan-jql" className="field h-auto min-h-24 py-1 font-mono text-xs leading-relaxed" value={jql}
              onChange={(e) => setCustomJql(e.target.value)} />
            {customJql !== null && (
              <button type="button" className="btn-subtle mt-1" onClick={() => setCustomJql(null)}>Reset to default JQL</button>
            )}
          </details>
        </div>
      )}
    </Dialog>
  );
};
