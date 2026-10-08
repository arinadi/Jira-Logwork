import type { WorklogEntry } from '../types/worklog';
import { validateEntry } from './validation';

/**
 * Rows that "Sync to Jira" posts in one go. A suggestion is a guess for a day without ticket activity,
 * so it waits until the user accepts or edits it; posting guesses in bulk would put wrong time in Jira.
 */
export function isBatchSyncable(entry: WorklogEntry): boolean {
  return entry.status === 'ready' && !entry.suggestion && Object.keys(validateEntry(entry)).length === 0;
}
