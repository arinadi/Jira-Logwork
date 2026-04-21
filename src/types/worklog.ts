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
}

export interface FieldMapping {
  issueKey: string;
  date: string;
  timeSpent: string;
  comment: string;
}

export const REQUIRED_FIELDS = ['issueKey', 'date', 'timeSpent'] as const;
