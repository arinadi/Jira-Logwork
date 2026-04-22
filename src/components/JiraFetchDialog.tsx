import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Calendar, User, Loader2, Download, Table as TableIcon, Zap, RotateCcw } from 'lucide-react';
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

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-main)',
  borderColor: 'var(--border-color)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-subtle)',
};

const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const today = new Date().toISOString().split('T')[0];

export const JiraFetchDialog: React.FC<JiraFetchDialogProps> = ({ isOpen, onClose, onImport }) => {
  const { config } = useAuth();
  const [params, setParams] = useState<FetchParams>({
    jql: '',
    startDate: oneWeekAgo,
    endDate: today,
    authorName: '',
    defaultTime: '8h'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [results, setResults] = useState<WorklogEntry[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    setProgress({ current: 0, total: 0, message: 'Initializing scan...' });
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const entries = await jiraFetcher.fetchEvents(
        config, 
        params, 
        (current, total, message) => {
          setProgress({ current, total, message });
        },
        controller.signal
      );
      setResults(entries);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        alert('Error fetching Jira events. Check your JQL or connection.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      setProgress(prev => ({ ...prev, message: 'Stopping scan... please wait.' }));
      abortControllerRef.current.abort();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-500" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
      <div
        className="rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-700 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)', color: '#0052cc' }}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>Jira History Scanner</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-subtle)', opacity: 0.5 }}>Auto-Log from status changes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl transition-all active:scale-90 hover:opacity-70" style={{ color: 'var(--text-subtle)' }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-8 space-y-8">
          {!results && !isLoading && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={labelStyle}>Start Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#0052cc' }} />
                  <input
                    type="date"
                    className="w-full pl-12 pr-4 py-3.5 border rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-atlassian-blue/20 outline-none transition-all"
                    style={inputStyle}
                    value={params.startDate}
                    onChange={(e) => handleParamChange('startDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={labelStyle}>End Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#0052cc' }} />
                  <input
                    type="date"
                    className="w-full pl-12 pr-4 py-3.5 border rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-atlassian-blue/20 outline-none transition-all"
                    style={inputStyle}
                    value={params.endDate}
                    onChange={(e) => handleParamChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={labelStyle}>JQL Search Query</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-4 w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
                  <textarea
                    className="w-full pl-12 pr-4 py-4 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-atlassian-blue/20 outline-none transition-all min-h-[100px] leading-relaxed"
                    style={inputStyle}
                    value={params.jql}
                    onChange={(e) => setParams({ ...params, jql: e.target.value })}
                    placeholder="status CHANGED BY..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={labelStyle}>Author Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3.5 border rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-atlassian-blue/20 outline-none transition-all"
                    style={inputStyle}
                    value={params.authorName}
                    onChange={(e) => handleParamChange('authorName', e.target.value)}
                    placeholder="Full Display Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={labelStyle}>Default Log Hours</label>
                <input
                  type="text"
                  className="w-full px-5 py-3.5 border rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-atlassian-blue/20 outline-none transition-all"
                  style={inputStyle}
                  value={params.defaultTime}
                  onChange={(e) => setParams({ ...params, defaultTime: e.target.value })}
                  placeholder="8h"
                />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative w-32 h-32">
                <Loader2 className="w-full h-full text-atlassian-blue animate-spin opacity-20" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-atlassian-blue tracking-tight">
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-subtle)', opacity: 0.5 }}>Scanning</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-2xl tracking-tight" style={{ color: 'var(--text-main)' }}>Processing your history...</p>
                <p className="text-sm font-medium italic px-10" style={{ color: 'var(--text-subtle)', opacity: 0.6 }}>{progress.message}</p>
              </div>
              <div className="w-full max-w-md h-3 rounded-full overflow-hidden shadow-inner" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div
                  className="h-full bg-atlassian-blue rounded-full transition-all duration-700"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`, boxShadow: '0 0 15px rgba(0,82,204,0.3)' }}
                />
              </div>

              <button
                onClick={handleCancel}
                className="mt-6 px-10 py-3 rounded-2xl border border-red-500/20 text-red-500 font-semibold hover:bg-red-500/5 transition-all active:scale-95 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Stop Scan
              </button>
            </div>
          )}

          {results && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in zoom-in duration-700">
              <div className="w-24 h-24 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-xl animate-float border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                <Search className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>{results.length} Entries Discovered</h3>
                <p className="font-medium text-lg max-w-sm mx-auto" style={{ color: 'var(--text-subtle)', opacity: 0.7 }}>We analyzed your history and generated {results.length} smart worklogs.</p>
              </div>

              <div className="flex gap-4 w-full max-w-lg mx-auto">
                <div className="flex-1 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0052cc] mb-1">Tickets</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{new Set(results.map(r => r.issueKey)).size}</p>
                </div>
                <div className="flex-1 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0052cc] mb-1">Days</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{new Set(results.map(r => r.date)).size}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 w-full max-w-lg mx-auto">
                <button
                  onClick={() => {
                    csvExporter.exportRawData(results.map(r => ({
                      'issue id': r.issueKey,
                      date: r.date,
                      hour: r.timeSpent,
                      comment: r.comment
                    })));
                  }}
                  className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border hover:shadow-xl transition-all duration-500 group active:scale-95"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <Download className="w-6 h-6 group-hover:-translate-y-1 transition-transform" style={{ color: 'var(--text-subtle)' }} />
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--text-subtle)' }}>Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    onImport(results);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-atlassian-blue/20 bg-atlassian-blue/5 hover:bg-atlassian-blue hover:text-white transition-all duration-500 group shadow-lg shadow-atlassian-blue/5 active:scale-95"
                >
                  <div className="p-3 bg-atlassian-blue rounded-xl group-hover:bg-white group-hover:text-atlassian-blue transition-colors">
                    <TableIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-semibold group-hover:text-white transition-colors">Import to Workspace</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setResults(null)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Change Parameters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !results && (
          <div className="p-4 border-t flex justify-end gap-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
            <button
              onClick={onClose}
              className="px-8 py-3 font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--text-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleFetch}
              className="px-10 py-3 bg-atlassian-blue text-white rounded-[1.25rem] font-semibold hover:bg-atlassian-blue-dark shadow-xl shadow-atlassian-blue/20 transition-all active:scale-95"
            >
              Start Automated Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
