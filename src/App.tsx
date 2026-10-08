import { useEffect, useId, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Moon, Play, Search, Sun, Upload } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesProvider';
import { usePreferences } from './context/preferencesContext';
import { AuthPanel } from './components/AuthPanel';
import { Uploader } from './components/Uploader';
import { MappingDialog } from './components/MappingDialog';
import { DayGroupList } from './components/DayGroupList';
import { SummaryDashboard } from './components/SummaryDashboard';
import { JiraFetchDialog } from './components/JiraFetchDialog';
import { useCSV } from './hooks/useCSV';
import { useSync } from './hooks/useSync';
import { useHolidays } from './hooks/useHolidays';
import { formatMinutes, groupByDay, rangeSummary } from './utils/dayGroups';
import { loadTheme, saveTheme, type Theme } from './utils/preferences';
import { isBatchSyncable } from './utils/syncRules';

function AppContent() {
  const csvInputId = useId();
  const [theme, setTheme] = useState<Theme>(() => loadTheme(localStorage, window.matchMedia('(prefers-color-scheme: dark)').matches));
  const [showSummary, setShowSummary] = useState(false);
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const { config } = useAuth();
  const { dailyTargetMinutes, holidayCountry, allowedComponents } = usePreferences();

  const {
    entries, isMapping, pendingData, importFile, applyMapping, updateEntry, removeEntry,
    copyEntryToDates, acceptSuggestions, clearEntries, addEntries, cancelMapping,
  } = useCSV();
  const { syncSingleEntry, syncAllValid, isSyncing, progress } = useSync(entries, updateEntry, allowedComponents);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(localStorage, next);
    setTheme(next);
  };

  const years = useMemo(() => {
    const set = new Set(entries.map(e => Number(e.date.slice(0, 4))).filter(y => y > 1900));
    return Array.from(set).sort();
  }, [entries]);
  const holidays = useHolidays(years, holidayCountry);
  const groups = useMemo(
    () => groupByDay(entries, { targetMinutes: dailyTargetMinutes, holidays, today: format(new Date(), 'yyyy-MM-dd') }),
    [entries, dailyTargetMinutes, holidays]
  );
  const summary = rangeSummary(groups, dailyTargetMinutes);
  const dated = groups.filter(g => g.date !== '');

  const readyValid = entries.filter(isBatchSyncable).length;
  const suggestedCount = entries.filter(e => e.suggestion && e.status === 'ready').length;
  const syncedCount = entries.filter(e => e.status === 'synced').length;
  const failedCount = entries.filter(e => e.status === 'failed' || e.status === 'error').length;

  const handleSyncAll = async () => {
    await syncAllValid();
    setShowSummary(true);
  };

  const summaryPercent = summary.targetMinutes > 0 ? Math.min(100, (summary.loggedMinutes / summary.targetMinutes) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <h1 className="text-base font-semibold mr-auto">Jira Logwork</h1>
          <button type="button" className="btn-primary" onClick={() => setShowFetchDialog(true)}>
            <Search className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Scan Jira</span><span className="sr-only sm:hidden">Scan Jira</span>
          </button>
          <label htmlFor={csvInputId} className="btn cursor-pointer">
            <Upload className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Import CSV</span><span className="sr-only sm:hidden">Import CSV</span>
          </label>
          <input
            id={csvInputId}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
          </button>
          <AuthPanel />
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4 space-y-3">
        {entries.length === 0 ? (
          <div className="space-y-3">
            <div className="card p-6 text-center">
              <h2 className="text-lg font-semibold">No worklogs yet</h2>
              <p className="mt-1 text-sm text-[var(--text-subtle)] max-w-md mx-auto">
                Scan your Jira activity for a date range, or import a CSV. Rows are kept in this browser until you clear them.
              </p>
              <button type="button" className="btn-primary mt-3" onClick={() => setShowFetchDialog(true)}>
                <Search className="w-4 h-4" aria-hidden="true" /> Scan Jira history
              </button>
            </div>
            <Uploader onFileSelect={importFile} />
          </div>
        ) : (
          <>
            <section aria-label="Range summary" className="card p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-subtle)]">
                  {dated.length > 0
                    ? `${format(parseISO(dated[0].date), 'dd MMM')} – ${format(parseISO(dated[dated.length - 1].date), 'dd MMM yyyy')} · ${summary.workingDays} working days`
                    : 'No dated rows'}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMinutes(summary.loggedMinutes)} <span className="font-normal text-[var(--text-subtle)]">/ {formatMinutes(summary.targetMinutes)} target</span>
                </p>
              </div>
              <div className="hidden sm:block w-40 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden" aria-hidden="true">
                <div className="h-full bg-atlassian-blue" style={{ width: `${summaryPercent}%` }} />
              </div>
              <p className="text-sm text-[var(--text-subtle)]">
                <span className="font-medium text-[var(--text-main)]">{readyValid}</span> ready ·{' '}
                {suggestedCount > 0 && <><span className="font-medium text-[var(--off)]">{suggestedCount}</span> suggested (review per day) ·{' '}</>}
                <span className="font-medium text-[var(--ok)]">{syncedCount}</span> synced ·{' '}
                <span className="font-medium text-[var(--danger)]">{failedCount}</span> failed
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" className="btn-danger" onClick={clearEntries} disabled={isSyncing}>Clear workspace</button>
                <button type="button" className="btn-primary" onClick={handleSyncAll} disabled={isSyncing || readyValid === 0}>
                  {isSyncing
                    ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Syncing {progress.current}/{progress.total}</>
                    : <><Play className="w-4 h-4" aria-hidden="true" /> Sync {readyValid} to Jira</>}
                </button>
              </div>
              {/* Announce batch progress without moving focus. */}
              <p className="sr-only" aria-live="polite">{isSyncing ? `Syncing ${progress.current} of ${progress.total}` : ''}</p>
            </section>

            <DayGroupList
              groups={groups}
              targetMinutes={dailyTargetMinutes}
              jiraDomain={config?.domain}
              onUpdate={updateEntry}
              onRemove={removeEntry}
              onCopyToDays={copyEntryToDates}
              onAcceptSuggestions={acceptSuggestions}
              onSyncRow={syncSingleEntry}
            />
          </>
        )}
      </main>

      {isMapping && pendingData && (
        <MappingDialog headers={pendingData.headers} onConfirm={applyMapping} onCancel={cancelMapping} />
      )}
      {showSummary && <SummaryDashboard entries={entries} onClose={() => setShowSummary(false)} />}
      {/* Mounted only while open, so its date defaults are taken at open time */}
      {showFetchDialog && <JiraFetchDialog onClose={() => setShowFetchDialog(false)} onImport={addEntries} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppContent />
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;
