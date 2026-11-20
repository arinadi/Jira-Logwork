export type EntryStatus = 'ready' | 'syncing' | 'synced' | 'failed' | 'error';

export interface WorklogEntry {
  id: string;
  issueKey: string;
  date: string;
  timeSpent: string;
  comment: string;
  status: EntryStatus;
  errorMessage?: string;
  originalRowIndex: number;
  /** Set on rows the scan guessed for a day without ticket activity; cleared when the user accepts or edits. */
  suggestion?: 'in-progress' | 'carry-over';
  /**
   * Extra time on an issue that already has a worklog that day, so the day still reaches its target when no new
   * ticket is left to take it. It sits beside the locked synced row of the same issue and day.
   */
  topUp?: true;
}

export interface FieldMapping {
  issueKey: string;
  date: string;
  timeSpent: string;
  comment: string;
}

export const REQUIRED_FIELDS = ['issueKey', 'date', 'timeSpent'] as const;
