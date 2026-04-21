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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="bg-atlassian-blue p-8 text-white relative overflow-hidden">
          <Zap className="absolute -right-8 -top-8 w-48 h-48 text-white/10 rotate-12" />
          <h2 className="text-3xl font-bold mb-2">Sync Complete!</h2>
          <p className="text-blue-100 font-medium">Batch processing finished successfully.</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Success</span>
              </div>
              <p className="text-3xl font-black text-emerald-700">{synced.length}</p>
              <p className="text-xs text-emerald-600/70 font-medium mt-1">Rows Synced</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Failed</span>
              </div>
              <p className="text-3xl font-black text-red-700">{failed.length}</p>
              <p className="text-xs text-red-600/70 font-medium mt-1">Errors Found</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-atlassian-blue/10 flex items-center justify-center text-atlassian-blue">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-atlassian-text">~ {totalSyncedHours.toFixed(1)} Total Hours</p>
              <p className="text-xs text-atlassian-text-subtle">Successfully recorded in Jira.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {failed.length > 0 && (
              <button
                onClick={() => csvExporter.exportFailedRows(entries)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition-all active:scale-95 shadow-sm"
              >
                <Download className="w-5 h-5" />
                Download Failed Log (CSV)
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-atlassian-blue text-white font-bold hover:bg-atlassian-blue-dark transition-all active:scale-95 shadow-lg shadow-atlassian-blue/20"
            >
              Back to Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
