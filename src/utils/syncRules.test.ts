import { describe, it, expect } from 'vitest';
import { isBatchSyncable } from './syncRules';
import type { WorklogEntry } from '../types/worklog';

const row = (over: Partial<WorklogEntry>): WorklogEntry =>
  ({ id: '1', issueKey: 'DESP-1', date: '2026-10-06', timeSpent: '2h', comment: '', status: 'ready', originalRowIndex: 0, ...over });

describe('isBatchSyncable', () => {
  it('takes valid ready rows, but never a suggestion the user has not accepted', () => {
    expect(isBatchSyncable(row({}))).toBe(true);
    expect(isBatchSyncable(row({ suggestion: 'in-progress' }))).toBe(false);
    expect(isBatchSyncable(row({ suggestion: 'carry-over' }))).toBe(false);
    expect(isBatchSyncable(row({ status: 'synced' }))).toBe(false);
    expect(isBatchSyncable(row({ timeSpent: 'xx' }))).toBe(false);
  });
});
