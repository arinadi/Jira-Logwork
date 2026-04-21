import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, User, Loader2, Download, Table as TableIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { jiraService } from '../services/jira';
import { jiraFetcher, type FetchParams } from '../utils/jiraFetcher';
import { csvExporter } from '../utils/csvExporter';
import type { WorklogEntry } from '../types/worklog';

interface JiraFetchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: WorklogEntry[]) => void;
}

export const JiraFetchDialog: React.FC<JiraFetchDialogProps> = ({ isOpen, onClose, onImport }) => {
  const { config } = useAuth();
  const [params, setParams] = useState<FetchParams>({
    jql: '',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    authorName: '',
    defaultTime: '8h'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [results, setResults] = useState<WorklogEntry[] | null>(null);

  // Pre-fill user info
  useEffect(() => {
    if (isOpen && config && !params.authorName) {
      jiraService.getCurrentUser(config).then(user => {
        const name = user.displayName;
        setParams(prev => ({
          ...prev,
          authorName: name,
          jql: `status CHANGED BY "${name}" DURING ("${prev.startDate}","${prev.endDate}")`
        }));
      }).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, config]);

  // Update JQL template when dates or author change
  const handleParamChange = (key: keyof FetchParams, value: string) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'startDate' || key === 'endDate' || key === 'authorName') {
        next.jql = `status CHANGED BY "${next.authorName}" DURING ("${next.startDate}","${next.endDate}")`;
      }
      return next;
    });
  };

  const handleFetch = async () => {
    if (!config) return;
    setIsLoading(true);
    setResults(null);
    try {
      const entries = await jiraFetcher.fetchEvents(config, params, (current, total, message) => {
        setProgress({ current, total, message });
      });
      setResults(entries);
    } catch {
      alert('Error fetching Jira events. Check your JQL or connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-[var(--text-main)]">Jira History Scrapper</h2>
            <p className="text-sm text-[var(--text-subtle)] font-bold uppercase tracking-wider opacity-60">Auto-Log from Status Changes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-[var(--text-subtle)]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!results && !isLoading && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlassian-blue" />
                  <input 
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-atlassian-blue outline-none transition-all"
                    value={params.startDate}
                    onChange={(e) => handleParamChange('startDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlassian-blue" />
                  <input 
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-atlassian-blue outline-none transition-all"
                    value={params.endDate}
                    onChange={(e) => handleParamChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">JQL Search Query</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-atlassian-blue outline-none transition-all min-h-[80px]"
                    value={params.jql}
                    onChange={(e) => setParams({ ...params, jql: e.target.value })}
                    placeholder="status CHANGED BY..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Author Name (Exact)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-atlassian-blue outline-none transition-all"
                    value={params.authorName}
                    onChange={(e) => handleParamChange('authorName', e.target.value)}
                    placeholder="Full Display Name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Default Hours</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-atlassian-blue outline-none transition-all"
                  value={params.defaultTime}
                  onChange={(e) => setParams({ ...params, defaultTime: e.target.value })}
                  placeholder="8h"
                />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-24 h-24">
                <Loader2 className="w-full h-full text-atlassian-blue animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black text-atlassian-blue">
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-black text-xl text-[var(--text-main)]">Scanning History...</p>
                <p className="text-sm text-[var(--text-subtle)] italic">{progress.message}</p>
              </div>
              <div className="w-full max-w-sm h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-atlassian-blue transition-all duration-300" 
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {results && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-none">
                <Search className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-[var(--text-main)]">{results.length} Events Found</h3>
                <p className="text-[var(--text-subtle)] font-medium">We found {results.length} status change events matching your criteria.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => {
                    csvExporter.exportRawData(results.map(r => ({
                      'issue id': r.issueKey,
                      date: r.date,
                      hour: r.timeSpent,
                      comment: r.comment
                    })));
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-atlassian-blue transition-all group"
                >
                  <Download className="w-6 h-6 text-slate-400 group-hover:text-atlassian-blue" />
                  <span className="font-bold text-sm">Download as CSV</span>
                </button>
                <button 
                  onClick={() => {
                    onImport(results);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-atlassian-blue bg-atlassian-blue/5 hover:bg-atlassian-blue text-atlassian-blue hover:text-white transition-all group"
                >
                  <TableIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Import to Grid</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {!isLoading && !results && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
             <button
              onClick={onClose}
              className="px-6 py-2.5 text-[var(--text-subtle)] font-bold hover:text-[var(--text-main)]"
            >
              Cancel
            </button>
            <button
              onClick={handleFetch}
              className="px-8 py-2.5 bg-atlassian-blue text-white rounded-xl font-bold hover:bg-atlassian-blue-dark shadow-lg shadow-atlassian-blue/20 transition-all active:scale-95"
            >
              Start Scanning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
