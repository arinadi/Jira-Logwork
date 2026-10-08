import { describe, it, expect } from 'vitest';
import { mergeFetchedEntries } from './mergeEntries';
import type { WorklogEntry } from '../types/worklog';

const row = (id: string, issueKey: string, date: string, status: WorklogEntry['status'], timeSpent = '4h'): WorklogEntry =>
  ({ id, issueKey, date, timeSpent, comment: '', status, originalRowIndex: 0 });

describe('mergeFetchedEntries', () => {
  it('replaces unsynced rows of the same issue and day, keeps synced ones, adds new ones', () => {
    const existing = [
      row('old-ready', 'A-1', '2026-10-06', 'ready', '8h'),
      row('old-failed', 'A-2', '2026-10-06', 'failed'),
      row('old-synced', 'A-3', '2026-10-06', 'synced'),
      row('other-day', 'A-1', '2026-10-05', 'ready'),
    ];
    const incoming = [
      row('new-a1', 'A-1', '2026-10-06', 'ready', '2h'),
      row('new-a2', 'A-2', '2026-10-06', 'ready'),
      row('new-a3', 'A-3', '2026-10-06', 'synced'),
      row('new-a4', 'A-4', '2026-10-06', 'ready'),
    ];

    const merged = mergeFetchedEntries(existing, incoming);

    expect(merged.map(e => e.id).sort()).toEqual(['new-a1', 'new-a2', 'new-a4', 'old-synced', 'other-day']);
  });
});
