import type { WorklogEntry } from '../types/worklog';

export const WORKSPACE_STORAGE_KEY = 'jira_logwork_workspace';

/** Saves every row, so a reload or a closed tab does not lose unsynced work. */
export function saveWorkspace(storage: Storage, entries: WorklogEntry[]): void {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(entries));
}

export function loadWorkspace(storage: Storage): WorklogEntry[] {
  const saved = storage.getItem(WORKSPACE_STORAGE_KEY);
  if (!saved) return [];

  let entries: WorklogEntry[];
  try {
    entries = JSON.parse(saved);
  } catch (e) {
    console.error('Saved workspace is not valid JSON; starting empty', e);
    return [];
  }
  if (!Array.isArray(entries)) return [];

  // A reload during sync leaves no answer from Jira: the worklog may or may not exist.
  // 'ready' would invite a blind retry and a double log, so ask the user to check first.
  return entries.map(e => e.status === 'syncing'
    ? { ...e, status: 'failed', errorMessage: 'Sync was interrupted — check Jira before retry.' }
    : e);
}
