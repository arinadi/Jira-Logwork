import React from 'react';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { csvExporter } from '../utils/csvExporter';
import { entryMinutes, formatMinutes } from '../utils/dayGroups';
import type { WorklogEntry } from '../types/worklog';
import { Dialog } from './Dialog';

interface SummaryDashboardProps {
  entries: WorklogEntry[];
  onClose: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ entries, onClose }) => {
  const synced = entries.filter(e => e.status === 'synced');
  const failed = entries.filter(e => e.status === 'failed' || e.status === 'error');
  if (synced.length === 0 && failed.length === 0) return null;

  // Sum real minutes: parseFloat("2h 40m") would read 2 and drop the minutes.
  const syncedMinutes = synced.reduce((sum, e) => sum + entryMinutes(e), 0);

  return (
    <Dialog
      title={failed.length > 0 ? 'Sync finished with errors' : 'Sync finished'}
      onClose={onClose}
      footer={
        <>
          {failed.length > 0 && (
            <button type="button" className="btn mr-auto" onClick={() => csvExporter.exportFailedRows(entries)}>
              <Download className="w-4 h-4" aria-hidden="true" /> Download failed rows
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </>
      }
    >
      <dl className="grid grid-cols-3 gap-3">
        <div className="p-2 rounded-[3px] bg-[var(--ok-bg)] text-[var(--ok)]">
          <dt className="flex items-center gap-1 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Synced rows</dt>
          <dd className="text-xl font-semibold tabular-nums">{synced.length}</dd>
        </div>
        <div className="p-2 rounded-[3px] bg-[var(--danger-bg)] text-[var(--danger)]">
          <dt className="flex items-center gap-1 text-xs font-semibold"><AlertCircle className="w-3 h-3" aria-hidden="true" /> Failed rows</dt>
          <dd className="text-xl font-semibold tabular-nums">{failed.length}</dd>
        </div>
        <div className="p-2 rounded-[3px] bg-[var(--bg-input)]">
          <dt className="text-xs font-semibold text-[var(--text-subtle)]">Time in Jira</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatMinutes(syncedMinutes)}</dd>
        </div>
      </dl>
    </Dialog>
  );
};
