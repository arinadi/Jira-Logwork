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
    cloneEntry,
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] transition-colors duration-500">
      {/* Header */}
      <header className="glass-header px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-atlassian-blue p-2.5 rounded-2xl shadow-xl shadow-atlassian-blue/15 animate-float">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-main)] leading-tight tracking-tight">Zero-Trust Worklog IDE</h1>
            <p className="text-pro-label">Engineered for Jira</p>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[var(--text-subtle)] active:scale-90"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-px h-8 bg-[var(--border-color)]"></div>
          <AuthPanel />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex max-w-[1600px] mx-auto w-full p-8 gap-8">
        {/* Table Area */}
        <div className="flex-1 flex flex-col gap-8">
          {entries.length > 0 && (
            <div className="flex items-center justify-between card-premium p-5 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSummary(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl text-sm font-semibold text-[var(--text-main)] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-sm active:scale-95"
                >
                  <BarChart3 className="w-4 h-4 text-atlassian-blue" />
                  Analytics
                </button>
                <button 
                  onClick={() => setShowFetchDialog(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-atlassian-blue/5 border border-atlassian-blue/10 rounded-2xl text-sm font-semibold text-atlassian-blue hover:bg-atlassian-blue hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  Fetch History
                </button>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="flex gap-10 pr-10 border-r border-[var(--border-color)]">
                  <div className="text-center group">
                    <p className="text-pro-label mb-1">Ready</p>
                    <p className="text-2xl font-semibold text-atlassian-blue group-hover:scale-110 transition-transform">{readyCount}</p>
                  </div>
                  <div className="text-center group">
                    <p className="text-pro-label mb-1 text-emerald-500">Synced</p>
                    <p className="text-2xl font-semibold text-emerald-500 group-hover:scale-110 transition-transform">{syncedCount}</p>
                  </div>
                  <div className="text-center group">
                    <p className="text-pro-label mb-1 text-red-500">Errors</p>
                    <p className="text-2xl font-semibold text-red-500 group-hover:scale-110 transition-transform">{errorCount}</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={clearEntries}
                    className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
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
                        <span className="absolute right-0 top-0 bottom-0 bg-white/20 px-4 flex items-center justify-center font-mono text-xs">
                          {progress.current}/{progress.total}
                        </span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" fill="currentColor" /> 
                        Batch Sync
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {entries.length > 0 ? (
            <div className="flex flex-col gap-8 overflow-hidden">
              <div className="flex-1 overflow-auto rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl shadow-black/[0.02]">
                <WorklogTable 
                  entries={entries} 
                  onUpdate={updateEntry}
                  onRemove={removeEntry} 
                  onClone={cloneEntry}
                  onClearAll={clearEntries}
                  onSyncRow={syncSingleEntry}
                />
              </div>
              
              {/* Secondary Dropzone */}
              <div className="group relative border-2 border-dashed border-[var(--border-color)] rounded-[2rem] p-12 hover:border-atlassian-blue/30 hover:bg-atlassian-blue/[0.01] transition-all flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Upload className="w-7 h-7 text-slate-300 group-hover:text-atlassian-blue" />
                </div>
                <p className="text-[var(--text-main)] font-semibold text-base">
                  Append more logs by dropping a CSV here
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-2 opacity-60">
                  Or use the <span className="font-bold text-atlassian-blue">"Fetch History"</span> button above for automation.
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
            <div className="flex flex-col gap-10">
              <Uploader onFileSelect={importFile} />
              
              <div className="flex items-center gap-6 py-4">
                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                <p className="text-pro-label">Or automate with history</p>
                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
              </div>

               <div className="card-premium p-12 text-center group cursor-pointer hover:border-atlassian-blue/30 transition-all duration-500" onClick={() => setShowFetchDialog(true)}>
                <div className="w-24 h-24 bg-atlassian-blue/5 text-atlassian-blue rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:bg-atlassian-blue group-hover:text-white transition-all duration-700 shadow-xl shadow-atlassian-blue/5 border border-atlassian-blue/10">
                  <Zap className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-semibold text-[var(--text-main)] mb-3 tracking-tight">Fetch From Jira History</h3>
                <p className="text-[var(--text-subtle)] max-w-sm mx-auto font-medium text-base leading-relaxed">
                  Automatically generate worklogs by scanning your issue status changes from a date range.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Capacity Tracker */}
        <aside className="w-96 flex flex-col gap-8 pb-8">
          <div 
            className="card-premium p-8 sticky top-28 overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
             {/* Gradient Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-atlassian-blue/[0.03] rounded-full blur-[80px] -mr-24 -mt-24"></div>
            
            <div className="relative z-10 shrink-0">
              <h2 className="text-2xl font-semibold text-[var(--text-main)] mb-1 flex items-center gap-2">
                Performance
              </h2>
              <p className="text-pro-label mb-10">Daily Target: 8.0 Hours</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
              <DailyCapacityTracker entries={entries} />
            </div>
          </div>
          
          {isSyncing && (
            <div className="bg-atlassian-blue rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-right-12 duration-700 shadow-atlassian-blue/20">
              <h3 className="text-base font-semibold text-white flex items-center gap-3 mb-6">
                <Loader2 className="w-5 h-5 animate-spin" /> Batch Sync Active
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between text-xs font-bold text-white/90 uppercase tracking-widest pl-1">
                  <span>Progress State</span>
                  <span className="font-mono text-sm">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-white transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3 bg-white/10 p-4 rounded-2xl items-start">
                  <div className="bg-white/20 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-[11px] text-blue-50 font-medium leading-relaxed italic">
                    Sequencing logs with 1s cooldown to protect Jira API rate limits.
                  </p>
                </div>
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
