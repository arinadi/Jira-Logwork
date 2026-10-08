import { describe, it, expect } from 'vitest';
import { leaveKind, leaveMinutesByDay, leaveTypesByDay, type HrmsLeaveRecord } from './hrmsLeave';

// Shaped like HRMS ajax-get-my-requests rows; made-up dates, no personal data.
const leave = (over: Partial<HrmsLeaveRecord>): HrmsLeaveRecord => ({
  from_date: '2026-09-07', to_date: '2026-09-07', from_time: '08:00:00', to_time: '17:00:00',
  leave_type: 'Annual leave', status: 'Approved', date_of_cancellation: null, ...over,
});

describe('leaveMinutesByDay', () => {
  it('counts a full day as 8h and a morning half day as 4h', () => {
    expect(leaveMinutesByDay([
      leave({ from_date: '2026-09-07', to_date: '2026-09-07' }),
      leave({ from_date: '2026-09-08', to_date: '2026-09-08', to_time: '12:00:00', leave_type: 'Long service leave' }),
      leave({ from_date: '2026-09-09', to_date: '2026-09-09', from_time: '13:00:00' }),
    ])).toEqual({ '2026-09-07': 480, '2026-09-08': 240, '2026-09-09': 240 });
  });

  it('spreads a multi-day leave over its weekdays, partial first and last day', () => {
    // Thu 10 from 13:00 → Tue 15 until 12:00; Sat 12 / Sun 13 skipped.
    expect(leaveMinutesByDay([leave({ from_date: '2026-09-10', from_time: '13:00:00', to_date: '2026-09-15', to_time: '12:00:00' })]))
      .toEqual({ '2026-09-10': 240, '2026-09-11': 480, '2026-09-14': 480, '2026-09-15': 240 });
  });

  it('ignores leave that is not approved or was cancelled, and adds up two requests on one day', () => {
    expect(leaveMinutesByDay([
      leave({ status: 'Pending' }),
      leave({ status: 'Denied', from_date: '2026-09-08', to_date: '2026-09-08' }),
      leave({ date_of_cancellation: '2026-09-01', from_date: '2026-09-09', to_date: '2026-09-09' }),
      leave({ from_date: '2026-09-10', to_date: '2026-09-10', to_time: '12:00:00' }),
      leave({ from_date: '2026-09-10', to_date: '2026-09-10', from_time: '13:00:00', leave_type: 'Sick leave' }),
    ])).toEqual({ '2026-09-10': 480 });
  });
});

describe('leave kind and types per day', () => {
  it('treats sick types as sick leave and every other type as annual leave', () => {
    expect(leaveKind('Sick leave')).toBe('sick');
    expect(leaveKind('Cuti Sakit')).toBe('sick');
    expect(leaveKind('Long service leave')).toBe('annual');
    expect(leaveKind('Annual leave')).toBe('annual');
  });

  it('lists the approved leave types of each weekday, once each', () => {
    expect(leaveTypesByDay([
      leave({ from_date: '2026-09-10', to_date: '2026-09-11', leave_type: 'Annual leave' }),
      leave({ from_date: '2026-09-11', to_date: '2026-09-11', from_time: '13:00:00', leave_type: 'Sick leave' }),
      leave({ from_date: '2026-09-11', to_date: '2026-09-11', leave_type: 'Annual leave' }),
      leave({ from_date: '2026-09-14', to_date: '2026-09-14', status: 'Denied' }),
    ])).toEqual({ '2026-09-10': ['Annual leave'], '2026-09-11': ['Annual leave', 'Sick leave'] });
  });
});

