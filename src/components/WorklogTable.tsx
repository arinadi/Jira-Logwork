import React from 'react';
import { Trash2, Play, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { WorklogEntry } from '../types/worklog';
import { EditableCell } from './DataGrid/EditableCell';
import { validateEntry } from '../utils/validation';
import { useAuth } from '../context/AuthContext';

interface WorklogTableProps {
  entries: WorklogEntry[];
  onUpdate: (id: string, updates: Partial<WorklogEntry>) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onSyncRow: (entry: WorklogEntry) => void;
}

const thStyle: React.CSSProperties = {
  color: 'var(--text-subtle)',
  opacity: 0.7,
};

const headerBg: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  borderColor: 'var(--border-color)',
};

export const WorklogTable: React.FC<WorklogTableProps> = ({ 
  entries, 
  onUpdate, 
  onRemove, 
  onClearAll,
  onSyncRow
}) => {
  const { config } = useAuth();
  
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr style={headerBg}>
            <th className="w-40 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={thStyle}>Issue Key</th>
            <th className="w-40 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={thStyle}>Date</th>
            <th className="w-32 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={thStyle}>Time</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={thStyle}>Comment</th>
            <th className="w-32 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={thStyle}>Status</th>
            <th className="w-24 px-6 py-4">
              <button 
                onClick={onClearAll}
                className="flex items-center gap-1 ml-auto text-red-500/60 hover:text-red-500 transition-all uppercase text-[10px] font-black tracking-widest active:scale-90"
                title="Clear Workspace"
              >
                <XCircle className="w-3.5 h-3.5" />
                Clear
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const errors = validateEntry(entry);
            const isSyncing = entry.status === 'syncing';
            const isSynced = entry.status === 'synced';
            
            return (
              <tr
                key={entry.id}
                className="group transition-all duration-300 hover:opacity-90"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <td className="p-0" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <EditableCell 
                    value={entry.issueKey}
                    onSave={(val) => onUpdate(entry.id, { issueKey: val.toUpperCase().trim() })}
                    isInvalid={!!errors.issueKey}
                    errorMessage={errors.issueKey}
                    className="font-semibold text-atlassian-blue px-6"
                    href={config?.domain ? `https://${config.domain}/browse/${entry.issueKey}` : undefined}
                  />
                </td>
                <td className="p-0" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <EditableCell 
                    value={entry.date}
                    type="date"
                    onSave={(val) => onUpdate(entry.id, { date: val })}
                    isInvalid={!!errors.date}
                    errorMessage={errors.date}
                    className="px-6"
                  />
                </td>
                <td className="p-0" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <EditableCell 
                    value={entry.timeSpent}
                    onSave={(val) => onUpdate(entry.id, { timeSpent: val })}
                    isInvalid={!!errors.timeSpent}
                    errorMessage={errors.timeSpent}
                    className="font-semibold whitespace-nowrap px-6"
                  />
                </td>
                <td className="p-0" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <EditableCell 
                    value={entry.comment}
                    onSave={(val) => onUpdate(entry.id, { comment: val })}
                    className="px-6 italic py-2"
                    type="textarea"
                  />
                </td>
                <td className="px-6 py-4" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <StatusBadge status={entry.status} error={entry.errorMessage || Object.values(errors)[0]} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`flex items-center justify-end gap-2 transition-all duration-300 ${isSyncing ? 'opacity-100' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                    <button 
                      onClick={() => onRemove(entry.id)}
                      disabled={isSyncing || isSynced}
                      className="p-2 rounded-xl transition-all disabled:opacity-30 active:scale-90 hover:opacity-70"
                      style={{ color: 'var(--text-subtle)' }}
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onSyncRow(entry)}
                      disabled={isSyncing || isSynced || Object.keys(errors).length > 0}
                      className="p-2 text-atlassian-blue hover:bg-atlassian-blue/10 rounded-xl transition-all disabled:opacity-30 active:scale-90"
                      title="Sync Worklog"
                    >
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-atlassian-blue" /> : <Play className="w-4 h-4" fill="currentColor" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const StatusBadge: React.FC<{ status: WorklogEntry['status'], error?: string }> = ({ status, error }) => {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  switch (status) {
    case 'ready':
      if (error) {
        return (
          <span style={{ ...base, backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.15)' }} title={error}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f59e0b' }} className="animate-pulse" />
            Warning
          </span>
        );
      }
      return (
        <span style={{ ...base, backgroundColor: 'var(--bg-input)', color: 'var(--text-subtle)', border: '1px solid var(--border-color)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-subtle)', opacity: 0.4 }} />
          Awaiting
        </span>
      );
    case 'syncing':
      return (
        <span style={{ ...base, backgroundColor: 'rgba(0, 82, 204, 0.08)', color: '#0052cc', border: '1px solid rgba(0, 82, 204, 0.15)' }} className="animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Syncing
        </span>
      );
    case 'synced':
      return (
        <span style={{ ...base, backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle2 className="w-3 h-3" />
          Success
        </span>
      );
    case 'failed':
    case 'error':
      return (
        <span style={{ ...base, backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.15)' }} title={error}>
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return null;
  }
};
