import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, CopyPlus, Loader2, Play, Trash2 } from 'lucide-react';
import type { WorklogEntry } from '../types/worklog';
import { formatMinutes, type DayGroup } from '../utils/dayGroups';
import { validateEntry } from '../utils/validation';
import { EditableCell } from './DataGrid/EditableCell';
import { CopyToDaysDialog } from './CopyToDaysDialog';

interface DayGroupListProps {
  groups: DayGroup[];
  targetMinutes: number;
  jiraDomain?: string;
  onUpdate: (id: string, updates: Partial<WorklogEntry>) => void;
  onRemove: (id: string) => void;
  onCopyToDays: (id: string, dates: string[]) => void;
  onSyncRow: (entry: WorklogEntry) => void;
}

const dayTitle = (date: string) => (date ? format(parseISO(date), 'EEE dd MMM yyyy') : 'No valid date');

/** Short text for a day's state; the text (not the color) carries the meaning. */
function dayStateText(group: DayGroup): { text: string; tone: 'ok' | 'warn' | 'danger' | 'off' | 'none' } {
  if (group.date === '') return { text: 'Fix the date of these rows', tone: 'danger' };
  if (group.state === 'off') {
    const reason = group.holidayName || 'Weekend';
    return group.overtimeMinutes > 0
      ? { text: `${reason} · ${formatMinutes(group.overtimeMinutes)} overtime`, tone: 'off' }
      : { text: reason, tone: 'none' };
  }
  if (group.state === 'met') return { text: 'Target met', tone: 'ok' };
  if (group.state === 'over') return { text: `${formatMinutes(group.overtimeMinutes)} over`, tone: 'danger' };
  return { text: `${formatMinutes(group.missingMinutes)} missing`, tone: group.totalMinutes === 0 ? 'none' : 'warn' };
}

const toneClass = {
  ok: 'bg-[var(--ok-bg)] text-[var(--ok)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  off: 'bg-[var(--off-bg)] text-[var(--off)]',
  none: 'bg-[var(--bg-input)] text-[var(--text-subtle)]',
};

const barClass = { ok: 'bg-[var(--ok)]', warn: 'bg-[var(--warn)]', danger: 'bg-[var(--danger)]', off: 'bg-[var(--off)]', none: 'bg-[var(--text-subtle)]' };

export const DayGroupList: React.FC<DayGroupListProps> = ({ groups, targetMinutes, jiraDomain, onUpdate, onRemove, onCopyToDays, onSyncRow }) => {
  const [copySource, setCopySource] = useState<WorklogEntry | null>(null);
  const datedDays = groups.filter(g => g.date !== '').map(g => g.date);

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const state = dayStateText(group);
        const headingId = `day-${group.date || 'undated'}`;
        const fill = targetMinutes > 0 ? Math.min(100, (group.totalMinutes / targetMinutes) * 100) : 0;
        return (
          <section key={group.date || 'undated'} aria-labelledby={headingId} className={`card ${group.state === 'off' && group.date ? 'opacity-90' : ''}`}>
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-b bg-[var(--bg-input)]">
              <h3 id={headingId} className="text-sm font-semibold">
                {dayTitle(group.date)}
              </h3>
              {group.isToday && <span className="lozenge bg-atlassian-blue text-white">Today</span>}
              <span className="text-sm tabular-nums">
                {formatMinutes(group.totalMinutes)}
                {group.state !== 'off' && group.date && <span className="text-[var(--text-subtle)]"> / {formatMinutes(targetMinutes)}</span>}
              </span>
              <span className={`lozenge ${toneClass[state.tone]}`}>{state.text}</span>
              {group.date && group.state !== 'off' && (
                <span className="ml-auto hidden sm:block w-32 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden" aria-hidden="true">
                  <span className={`block h-full ${barClass[state.tone]}`} style={{ width: `${fill}%` }} />
                </span>
              )}
            </header>

            {group.entries.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--text-subtle)]">No worklogs.</p>
            ) : (
              <ul>
                {group.entries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    jiraDomain={jiraDomain}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    onSyncRow={onSyncRow}
                    onCopy={() => setCopySource(entry)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {copySource && (
        <CopyToDaysDialog
          entry={copySource}
          suggestedDays={datedDays}
          onCopy={(dates) => { onCopyToDays(copySource.id, dates); setCopySource(null); }}
          onClose={() => setCopySource(null)}
        />
      )}
    </div>
  );
};

interface EntryRowProps {
  entry: WorklogEntry;
  jiraDomain?: string;
  onUpdate: (id: string, updates: Partial<WorklogEntry>) => void;
  onRemove: (id: string) => void;
  onSyncRow: (entry: WorklogEntry) => void;
  onCopy: () => void;
}

const EntryRow: React.FC<EntryRowProps> = ({ entry, jiraDomain, onUpdate, onRemove, onSyncRow, onCopy }) => {
  const errors = validateEntry(entry);
  const isSyncing = entry.status === 'syncing';
  const isSynced = entry.status === 'synced';
  // A synced row mirrors a worklog that exists in Jira; editing it here would not change Jira.
  const locked = isSyncing || isSynced;
  const name = `${entry.issueKey || 'row'} on ${entry.date || 'no date'}`;

  return (
    <li className="grid gap-x-3 gap-y-1 px-3 py-2 border-b last:border-b-0 items-start grid-cols-[1fr_auto] md:grid-cols-[9rem_8.5rem_5rem_minmax(0,1fr)_6.5rem_auto]">
      <EditableCell
        value={entry.issueKey}
        label={`Issue key of ${name}`}
        onSave={(val) => onUpdate(entry.id, { issueKey: val.toUpperCase().trim() })}
        isInvalid={!!errors.issueKey}
        errorMessage={errors.issueKey}
        href={jiraDomain && entry.issueKey ? `https://${jiraDomain}/browse/${entry.issueKey}` : undefined}
        disabled={locked}
        className="col-span-1"
      />
      <div className="row-start-1 col-start-2 md:col-start-auto md:row-start-auto md:order-last flex items-center justify-end gap-0.5">
        <button
          type="button"
          className="icon-btn text-[var(--link)]"
          onClick={() => onSyncRow(entry)}
          disabled={locked || Object.keys(errors).length > 0}
          aria-label={`Sync ${name} to Jira`}
          title="Sync to Jira"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
        </button>
        <button type="button" className="icon-btn" onClick={onCopy} aria-label={`Copy ${name} to other days`} title="Copy to other days">
          <CopyPlus className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn hover:text-[var(--danger)]"
          onClick={() => onRemove(entry.id)}
          disabled={locked}
          aria-label={`Remove ${name}`}
          title="Remove row"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <EditableCell
        value={entry.date}
        type="date"
        label={`Date of ${entry.issueKey || 'row'}`}
        onSave={(val) => onUpdate(entry.id, { date: val })}
        isInvalid={!!errors.date}
        errorMessage={errors.date}
        disabled={locked}
        className="text-sm text-[var(--text-subtle)] tabular-nums"
      />
      <EditableCell
        value={entry.timeSpent}
        label={`Time spent for ${name}`}
        onSave={(val) => onUpdate(entry.id, { timeSpent: val.trim() })}
        isInvalid={!!errors.timeSpent}
        errorMessage={errors.timeSpent}
        disabled={locked}
        className="font-semibold tabular-nums"
      />
      <EditableCell
        value={entry.comment}
        type="textarea"
        label={`Comment for ${name}`}
        onSave={(val) => onUpdate(entry.id, { comment: val })}
        disabled={locked}
        className="col-span-2 md:col-span-1 text-sm"
      />
      <StatusLozenge status={entry.status} message={entry.errorMessage || Object.values(errors)[0]} />
    </li>
  );
};

/** Icon + text: the state must not depend on color alone. */
const StatusLozenge: React.FC<{ status: WorklogEntry['status']; message?: string }> = ({ status, message }) => {
  switch (status) {
    case 'ready':
      return message
        ? <span className="lozenge bg-[var(--warn-bg)] text-[var(--warn)] w-fit" title={message}><AlertCircle className="w-3 h-3" aria-hidden="true" />Check</span>
        : <span className="lozenge bg-[var(--bg-input)] text-[var(--text-subtle)] w-fit">Ready</span>;
    case 'syncing':
      return <span className="lozenge bg-[#e9f2ff] text-[var(--link)] dark:bg-[#09326c] dark:text-[#85b8ff] w-fit" role="status"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />Syncing</span>;
    case 'synced':
      return <span className="lozenge bg-[var(--ok-bg)] text-[var(--ok)] w-fit"><CheckCircle2 className="w-3 h-3" aria-hidden="true" />Synced</span>;
    case 'failed':
    case 'error':
      return (
        <span className="flex flex-col gap-0.5">
          <span className="lozenge bg-[var(--danger-bg)] text-[var(--danger)] w-fit"><AlertCircle className="w-3 h-3" aria-hidden="true" />Failed</span>
          {message && <span className="text-xs text-[var(--danger)]">{message}</span>}
        </span>
      );
    default:
      return null;
  }
};
