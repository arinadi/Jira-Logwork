import { describe, it, expect } from 'vitest';
import { leaveRowFor, type LeaveRowInput } from './leaveRow';
import type { WorklogEntry } from '../types/worklog';

const row = (issueKey: string, date: string, timeSpent: string): WorklogEntry =>
  ({ id: `${issueKey}-${date}`, issueKey, date, timeSpent, comment: '', status: 'synced', originalRowIndex: 0 });

const base: LeaveRowInput = {
  date: '2026-03-30', kind: 'annual', tickets: { annual: 'DESP-36823', sick: 'DESP-50000' },
  hrmsLeaveMinutes: 0, hrmsTypes: [], targetMinutes: 480, existing: [],
};

describe('leaveRowFor', () => {
  it('logs the HRMS leave hours of the day on the matching leave ticket, with the leave type as text', () => {
    const leave = leaveRowFor({ ...base, hrmsLeaveMinutes: 240, hrmsTypes: ['Long service leave'], existing: [row('DESP-35490', '2026-03-30', '4h')] });

    expect(leave && [leave.issueKey, leave.date, leave.timeSpent, leave.comment, leave.status]).toEqual(['DESP-36823', '2026-03-30', '4h', 'Long service leave', 'ready']);
  });

  it('uses the full daily target when HRMS has no leave that day, and a default text', () => {
    const leave = leaveRowFor({ ...base, kind: 'sick' });

    expect(leave && [leave.issueKey, leave.timeSpent, leave.comment]).toEqual(['DESP-50000', '8h', 'Sick leave']);
  });

  it('only counts the leave not logged yet, and adds nothing when the ticket is unset or already has a row that day', () => {
    // 8h HRMS leave, 3h of it already on the sick ticket → 5h left for the annual ticket.
    expect(leaveRowFor({ ...base, hrmsLeaveMinutes: 480, existing: [row('DESP-50000', '2026-03-30', '3h')] })?.timeSpent).toBe('5h');
    expect(leaveRowFor({ ...base, tickets: { annual: '', sick: 'DESP-50000' } })).toBeNull();
    expect(leaveRowFor({ ...base, existing: [row('DESP-36823', '2026-03-30', '4h')] })).toBeNull();
  });
});
