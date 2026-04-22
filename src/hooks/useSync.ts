import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { jiraService } from '../services/jira';
import type { WorklogEntry } from '../types/worklog';
import { validateEntry } from '../utils/validation';

export const useSync = (
  entries: WorklogEntry[],
  onUpdateEntry: (id: string, updates: Partial<WorklogEntry>) => void
) => {
  const { config } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const syncSingleEntry = useCallback(async (entry: WorklogEntry) => {
    if (!config) return;

    // Validate before syncing
    const errors = validateEntry(entry);
    if (Object.keys(errors).length > 0) {
      onUpdateEntry(entry.id, { status: 'error', errorMessage: 'Validation failed before sync.' });
      return false;
    }

    onUpdateEntry(entry.id, { status: 'syncing', errorMessage: undefined });

    try {
      const response = await jiraService.addWorklog(config, entry.issueKey, {
        date: entry.date,
        timeSpent: entry.timeSpent,
        comment: entry.comment,
      });

      if (response.ok) {
        onUpdateEntry(entry.id, { status: 'synced' });
        return true;
      } else {
        const data = await response.json().catch(() => ({}));
        const msg = data.errorMessages?.[0] || 'Sync failed. Check Jira permissions.';
        onUpdateEntry(entry.id, { status: 'failed', errorMessage: msg });
        return false;
      }
    } catch {
      onUpdateEntry(entry.id, { status: 'failed', errorMessage: 'Network error or CORS issue.' });
      return false;
    }
  }, [config, onUpdateEntry]);

  const syncAllValid = useCallback(async () => {
    const readyEntries = entries.filter(e => e.status === 'ready' && Object.keys(validateEntry(e)).length === 0);
    if (readyEntries.length === 0 || !config) return;

    setIsSyncing(true);
    setProgress({ current: 0, total: readyEntries.length });

    for (let i = 0; i < readyEntries.length; i++) {
      const entry = readyEntries[i];
      
      // Update progress
      setProgress(prev => ({ ...prev, current: i + 1 }));

      // Sync the entry
      await syncSingleEntry(entry);

      // 1-second delay between requests to protect Jira API rate limits
      if (i < readyEntries.length - 1) {
        await sleep(1000);
      }
    }

    setIsSyncing(false);
    setProgress({ current: 0, total: 0 });
  }, [entries, config, syncSingleEntry]);

  return {
    syncSingleEntry,
    syncAllValid,
    isSyncing,
    progress
  };
};
