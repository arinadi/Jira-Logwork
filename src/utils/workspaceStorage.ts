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

export const LEAVE_STORAGE_KEY = 'jira_logwork_leave';

/**
 * Stores the leave a scan read for its range. Days of that range are replaced (leave may have been cancelled
 * since); days outside it are kept, so an older, wider scan still shows its leave.
 */
export function saveLeave(storage: Storage, range: { startDate: string; endDate: string }, leaveByDay: Record<string, number>): void {
  const kept = Object.entries(loadLeave(storage)).filter(([date]) => date < range.startDate || date > range.endDate);
  storage.setItem(LEAVE_STORAGE_KEY, JSON.stringify({ ...Object.fromEntries(kept), ...leaveByDay }));
}

export function loadLeave(storage: Storage): Record<string, number> {
  try {
    const parsed = JSON.parse(storage.getItem(LEAVE_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.error('Saved leave is not valid JSON; ignoring it', e);
    return {};
  }
}

export const LEAVE_TYPES_STORAGE_KEY = 'jira_logwork_leave_types';

/** Same range rule as saveLeave: the scanned range is replaced, other days are kept. */
export function saveLeaveTypes(storage: Storage, range: { startDate: string; endDate: string }, typesByDay: Record<string, string[]>): void {
  const kept = Object.entries(loadLeaveTypes(storage)).filter(([date]) => date < range.startDate || date > range.endDate);
  storage.setItem(LEAVE_TYPES_STORAGE_KEY, JSON.stringify({ ...Object.fromEntries(kept), ...typesByDay }));
}

export function loadLeaveTypes(storage: Storage): Record<string, string[]> {
  try {
    const parsed = JSON.parse(storage.getItem(LEAVE_TYPES_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.error('Saved leave types are not valid JSON; ignoring them', e);
    return {};
  }
}
