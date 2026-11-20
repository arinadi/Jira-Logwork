import type { WorklogEntry } from '../types/worklog';

// A top-up row has its own key: it lives beside the synced row of the same issue and day, so the synced row must
// not drop it, and a new scan replaces an unsynced top-up row only by another top-up row.
const dayKey = (e: WorklogEntry) => `${e.issueKey}::${e.date}${e.topUp ? '::top-up' : ''}`;

/**
 * Adds the rows of a new scan to the workspace without duplicating issue + day.
 * A new scan knows the day better than an unsynced row from an older scan, so it replaces it.
 * A synced row is already in Jira; it stays, and the scan's copy of it is dropped.
 */
export function mergeFetchedEntries(existing: WorklogEntry[], incoming: WorklogEntry[]): WorklogEntry[] {
  const incomingKeys = new Set(incoming.map(dayKey));
  const syncedKeys = new Set(existing.filter(e => e.status === 'synced').map(dayKey));
  const kept = existing.filter(e => e.status === 'synced' || !incomingKeys.has(dayKey(e)));
  return [...kept, ...incoming.filter(e => !syncedKeys.has(dayKey(e)))];
}
