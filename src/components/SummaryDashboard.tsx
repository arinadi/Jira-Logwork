import React from 'react';
import { CheckCircle2, XCircle, Download, Clock, Zap } from 'lucide-react';
import { csvExporter } from '../utils/csvExporter';
import type { WorklogEntry } from '../types/worklog';

interface SummaryDashboardProps {
  entries: WorklogEntry[];
  onClose: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ entries, onClose }) => {
  const synced = entries.filter(e => e.status === 'synced');
  const failed = entries.filter(e => e.status === 'failed' || e.status === 'error');
  
  if (synced.length === 0 && failed.length === 0) return null;

  const totalSyncedHours = synced.reduce((acc, curr) => {
    const h = parseFloat(curr.timeSpent);
    return isNaN(h) ? acc : acc + h;
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 border border-[var(--border-color)]">
        <div className="bg-atlassian-blue px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <Zap className="absolute -right-8 -top-8 w-48 h-48 text-white/5 rotate-12" />
          <h2 className="text-4xl font-semibold mb-2 tracking-tight">Sync Complete!</h2>
          <p className="text-blue-100 font-medium text-lg opacity-80 font-sans">Batch processing finished successfully.</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
              </div>
              <p className="text-4xl font-semibold text-emerald-700 dark:text-emerald-400">{synced.length}</p>
              <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/50 font-bold uppercase tracking-wider mt-1">Rows Synced</p>
            </div>
            
            <div className="p-6 rounded-[2rem] bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500 mb-2">
                <XCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
              </div>
              <p className="text-4xl font-semibold text-red-700 dark:text-red-400">{failed.length}</p>
              <p className="text-[10px] text-red-600/60 dark:text-red-500/50 font-bold uppercase tracking-wider mt-1">Errors Found</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-atlassian-blue/10 flex items-center justify-center text-atlassian-blue">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[var(--text-main)] tracking-tight">{totalSyncedHours.toFixed(1)} Total Hours</p>
              <p className="text-xs text-[var(--text-subtle)] font-medium opacity-60">Successfully recorded in Jira.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {failed.length > 0 && (
              <button
                onClick={() => csvExporter.exportFailedRows(entries)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[var(--bg-surface)] border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-[0.98] shadow-sm text-base"
              >
                <Download className="w-5 h-5" />
                Download Error Logs
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full py-5 rounded-2xl bg-atlassian-blue text-white font-semibold text-lg hover:bg-atlassian-blue-dark transition-all active:scale-[0.98] shadow-xl shadow-atlassian-blue/20"
            >
              Finish & Clear Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
