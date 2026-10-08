import { describe, it, expect } from 'vitest';
import { copyEntryToDays } from './copyEntry';
import type { WorklogEntry } from '../types/worklog';

const row = (id: string, issueKey: string, date: string, status: WorklogEntry['status']): WorklogEntry =>
  ({ id, issueKey, date, timeSpent: '2h', comment: 'pairing', status, originalRowIndex: 0 });

describe('copyEntryToDays', () => {
  it('makes a new ready row per chosen day, skipping days where that issue already has a row', () => {
    const source = { ...row('src', 'A-1', '2026-10-05', 'synced'), errorMessage: 'old' };
    const existing = [source, row('x', 'A-1', '2026-10-07', 'ready'), row('y', 'B-1', '2026-10-08', 'ready')];

    const copies = copyEntryToDays(source, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'], existing);

    expect(copies.map(c => [c.issueKey, c.date, c.timeSpent, c.comment, c.status, c.errorMessage])).toEqual([
      ['A-1', '2026-10-06', '2h', 'pairing', 'ready', undefined],
      ['A-1', '2026-10-08', '2h', 'pairing', 'ready', undefined],
    ]);
    expect(new Set([source.id, ...copies.map(c => c.id)]).size).toBe(3);
  });
});
