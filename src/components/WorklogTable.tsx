import React from 'react';
import { Trash2, Play, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { WorklogEntry } from '../types/worklog';
import { EditableCell } from './DataGrid/EditableCell';
import { validateEntry } from '../utils/validation';

interface WorklogTableProps {
  entries: WorklogEntry[];
  onUpdate: (id: string, updates: Partial<WorklogEntry>) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onSyncRow: (entry: WorklogEntry) => void;
}

export const WorklogTable: React.FC<WorklogTableProps> = ({ 
  entries, 
  onUpdate, 
  onRemove, 
  onClearAll,
  onSyncRow
}) => {
  if (entries.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200">
            <th className="w-40 px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider">Issue Key</th>
            <th className="w-40 px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider">Date</th>
            <th className="w-32 px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider">Time</th>
            <th className="px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider">Comment</th>
            <th className="w-32 px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider">Status</th>
            <th className="w-24 px-4 py-3 text-xs font-bold text-atlassian-text-subtle uppercase tracking-wider text-right">
              <button 
                onClick={onClearAll}
                className="flex items-center gap-1 ml-auto text-red-500 hover:text-red-700 transition-colors uppercase"
                title="Clear all rows"
              >
                <XCircle className="w-4 h-4" />
                Clear
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const errors = validateEntry(entry);
            const isSyncing = entry.status === 'syncing';
            const isSynced = entry.status === 'synced';
            
            return (
              <tr key={entry.id} className={`transition-colors group ${isSyncing ? 'bg-atlassian-blue/5' : 'hover:bg-slate-50/50'}`}>
                <td className="p-0 border-r border-gray-50">
                  <EditableCell 
                    value={entry.issueKey}
                    onSave={(val) => onUpdate(entry.id, { issueKey: val.toUpperCase().trim() })}
                    isInvalid={!!errors.issueKey}
                    errorMessage={errors.issueKey}
                    className="font-semibold text-atlassian-blue"
                  />
                </td>
                <td className="p-0 border-r border-gray-50">
                  <EditableCell 
                    value={entry.date}
                    type="date"
                    onSave={(val) => onUpdate(entry.id, { date: val })}
                    isInvalid={!!errors.date}
                    errorMessage={errors.date}
                  />
                </td>
                <td className="p-0 border-r border-gray-50">
                  <EditableCell 
                    value={entry.timeSpent}
                    onSave={(val) => onUpdate(entry.id, { timeSpent: val })}
                    isInvalid={!!errors.timeSpent}
                    errorMessage={errors.timeSpent}
                    className="font-bold whitespace-nowrap"
                  />
                </td>
                <td className="p-0 border-r border-gray-50">
                  <EditableCell 
                    value={entry.comment}
                    onSave={(val) => onUpdate(entry.id, { comment: val })}
                    className="text-atlassian-text-subtle"
                  />
                </td>
                <td className="px-4 py-2 border-r border-gray-50">
                  <StatusBadge status={entry.status} error={entry.errorMessage || Object.values(errors)[0]} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className={`flex items-center justify-end gap-1 transition-opacity ${isSyncing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                      onClick={() => onRemove(entry.id)}
                      disabled={isSyncing || isSynced}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onSyncRow(entry)}
                      disabled={isSyncing || isSynced || Object.keys(errors).length > 0}
                      className="p-1.5 text-atlassian-blue hover:bg-atlassian-blue/5 rounded-md transition-all disabled:opacity-30"
                      title="Sync this row"
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
  switch (status) {
    case 'ready':
      if (error) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase border border-amber-100" title={error}>
            Invalid
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase border border-slate-200">
          Ready
        </span>
      );
    case 'syncing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase border border-blue-200 animate-pulse">
          Syncing...
        </span>
      );
    case 'synced':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200 shadow-sm shadow-emerald-100">
          <CheckCircle2 className="w-3 h-3" />
          Synced
        </span>
      );
    case 'failed':
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase border border-red-200" title={error}>
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return null;
  }
};
