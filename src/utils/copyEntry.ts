import type { WorklogEntry } from '../types/worklog';

/**
 * Copies one row to other days as new unsynced rows.
 * A day where the same issue already has a row is skipped: a second row there would double-log that issue.
 */
export function copyEntryToDays(entry: WorklogEntry, dates: string[], existing: WorklogEntry[]): WorklogEntry[] {
  const taken = new Set(existing.filter(e => e.issueKey === entry.issueKey).map(e => e.date));
  return Array.from(new Set(dates))
    .filter(date => !taken.has(date))
    .sort()
    .map(date => ({
      id: crypto.randomUUID(),
      issueKey: entry.issueKey,
      date,
      timeSpent: entry.timeSpent,
      comment: entry.comment,
      status: 'ready',
      originalRowIndex: entry.originalRowIndex,
    }));
}
