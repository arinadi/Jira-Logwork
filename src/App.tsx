import { AuthProvider } from './context/AuthContext';
import { AuthPanel } from './components/AuthPanel';
import { Layout, Play, Loader2, Moon, Sun, BarChart3, Upload, Zap } from 'lucide-react';
import { Uploader } from './components/Uploader';
import { MappingDialog } from './components/MappingDialog';
import { WorklogTable } from './components/WorklogTable';
import { DailyCapacityTracker } from './components/DailyCapacityTracker';
import { SummaryDashboard } from './components/SummaryDashboard';
import { JiraFetchDialog } from './components/JiraFetchDialog';
import { useCSV } from './hooks/useCSV';
import { useSync } from './hooks/useSync';
import { useState, useEffect } from 'react';

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showFetchDialog, setShowFetchDialog] = useState(false);

  const { 
    entries, 
    isMapping, 
    pendingData, 
    importFile, 
    applyMapping, 
    updateEntry,
    removeEntry, 
    clearEntries,
    addEntries,
    cancelMapping 
  } = useCSV();

  const { 
    syncSingleEntry, 
    syncAllValid, 
    isSyncing, 
    progress 
  } = useSync(entries, updateEntry);

  const readyEntries = entries.filter(e => e.status === 'ready');
  const readyCount = readyEntries.length;
  const errorCount = entries.filter(e => ['failed', 'error'].includes(e.status)).length;
  const syncedCount = entries.filter(e => e.status === 'synced').length;

  // Sync completion side effect
  useEffect(() => {
    if (!isSyncing && progress.total > 0 && progress.current === progress.total) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSummary(true);
    }
  }, [isSyncing, progress]);

  // Dark mode side effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] transition-colors duration-300">
      {/* Header */}
      <header className="glass-header px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-atlassian-blue p-2 rounded-xl shadow-lg shadow-atlassian-blue/20">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[var(--text-main)] leading-tight tracking-tight">Zero-Trust Worklog IDE</h1>
            <p className="text-[10px] text-[var(--text-subtle)] font-black uppercase tracking-[0.2em] opacity-60">Engineered for Jira</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[var(--text-subtle)]"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-px h-6 bg-[var(--border-color)]"></div>
          <AuthPanel />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex max-w-[1600px] mx-auto w-full p-6 gap-6">
        {/* Table Area */}
        <div className="flex-1 flex flex-col gap-6">
          {entries.length > 0 && (
            <div className="flex items-center justify-between card-premium p-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSummary(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-main)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  <BarChart3 className="w-4 h-4 text-atlassian-blue" />
                  Show Summary
                </button>
                <button 
                  onClick={() => setShowFetchDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-atlassian-blue/5 border border-atlassian-blue/20 rounded-xl text-sm font-bold text-atlassian-blue hover:bg-atlassian-blue hover:text-white transition-all shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  Fetch More From Jira
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex gap-8 pr-6 border-r border-[var(--border-color)]">
                  <div className="text-center group">
                    <p className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest opacity-50">Ready</p>
                    <p className="text-xl font-black text-atlassian-blue group-hover:scale-110 transition-transform">{readyCount}</p>
                  </div>
                  <div className="text-center group text-emerald-500">
                    <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Synced</p>
                    <p className="text-xl font-black group-hover:scale-110 transition-transform">{syncedCount}</p>
                  </div>
                  <div className="text-center group text-red-500">
                    <p className="text-[10px] font-black text-red-500/40 uppercase tracking-widest">Errors</p>
                    <p className="text-xl font-black group-hover:scale-110 transition-transform">{errorCount}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={clearEntries}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    Clear Workspace
                  </button>
                  <button 
                    onClick={syncAllValid}
                    disabled={isSyncing || readyCount === 0}
                    className={`btn-primary flex items-center gap-2 group relative overflow-hidden ${isSyncing ? 'pr-20' : ''}`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing...
                        <span className="absolute right-0 top-0 bottom-0 bg-white/20 px-3 flex items-center justify-center font-mono text-xs">
                          {progress.current}/{progress.total}
                        </span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" fill="currentColor" /> 
                        Sync All Valid
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {entries.length > 0 ? (
            <div className="flex flex-col gap-6 overflow-hidden">
              <div className="flex-1 overflow-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                <WorklogTable 
                  entries={entries} 
                  onUpdate={updateEntry}
                  onRemove={removeEntry} 
                  onClearAll={clearEntries}
                  onSyncRow={syncSingleEntry}
                />
              </div>
              
              {/* Secondary Dropzone */}
              <div className="group relative border-2 border-dashed border-[var(--border-color)] rounded-3xl p-10 hover:border-atlassian-blue/30 hover:bg-atlassian-blue/[0.02] transition-all flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-atlassian-blue" />
                </div>
                <p className="text-[var(--text-subtle)] font-bold text-sm">
                  Append more logs by dropping a CSV here
                </p>
                <p className="text-[10px] text-[var(--text-subtle)] mt-2 italic">
                  Or use the <span className="font-bold text-atlassian-blue">"Fetch More From Jira"</span> button above to auto-generate logs from your history.
                </p>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <Uploader onFileSelect={importFile} />
              
              <div className="flex items-center gap-4 py-4">
                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                <span className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-[0.3em]">OR START WITH HISTORY</span>
                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
              </div>

               <div className="card-premium p-12 text-center group cursor-pointer hover:border-atlassian-blue/50 transition-all" onClick={() => setShowFetchDialog(true)}>
                <div className="w-20 h-20 bg-atlassian-blue/5 text-atlassian-blue rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-atlassian-blue group-hover:text-white transition-all shadow-lg shadow-atlassian-blue/5">
                  <Zap className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Fetch From Jira History</h3>
                <p className="text-[var(--text-subtle)] max-w-sm mx-auto font-medium">
                  Automatically generate worklogs by scanning your issue status changes from a date range.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Capacity Tracker */}
        <aside className="w-85 flex flex-col gap-6 pb-6">
          <div className="card-premium p-6 sticky top-24 overflow-hidden">
             {/* Gradient Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-atlassian-blue/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <h2 className="text-xl font-black text-[var(--text-main)] mb-1 flex items-center gap-2">
              Performance Tracker
            </h2>
            <p className="text-xs text-[var(--text-subtle)] font-bold uppercase tracking-wider mb-8 opacity-60">Daily Target: 8.0 Hours</p>
            
            <DailyCapacityTracker entries={entries} />
          </div>
          
          {isSyncing && (
            <div className="bg-atlassian-blue rounded-3xl shadow-2xl p-6 animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Batch Sync Active
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black text-white/80 uppercase tracking-widest">
                  <span>Progress</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-white transition-all duration-300 shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-blue-100 font-medium italic leading-relaxed">
                  Sequencing logs with 5s cooldown to respect Jira API safety.
                </p>
              </div>
            </div>
          )}
        </aside>
      </main>

      <MappingDialog 
        isOpen={isMapping}
        headers={pendingData?.headers || []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialMapping={{} as any}
        onConfirm={applyMapping}
        onCancel={cancelMapping}
      />

      {showSummary && (
        <SummaryDashboard 
          entries={entries} 
          onClose={() => setShowSummary(false)} 
        />
      )}

      <JiraFetchDialog 
        isOpen={showFetchDialog}
        onClose={() => setShowFetchDialog(false)}
        onImport={addEntries}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
