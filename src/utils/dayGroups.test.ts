import { describe, it, expect } from 'vitest';
import { groupByDay, rangeSummary } from './dayGroups';
import type { WorklogEntry } from '../types/worklog';

const row = (issueKey: string, date: string, timeSpent: string): WorklogEntry =>
  ({ id: `${issueKey}-${date}-${timeSpent}`, issueKey, date, timeSpent, comment: '', status: 'ready', originalRowIndex: 0 });

const options = { targetMinutes: 8 * 60, holidays: new Map([['2026-10-09', 'Test Holiday']]), today: '2026-10-08' };

describe('groupByDay', () => {
  it('makes one group per calendar day with totals and states, including empty days', () => {
    const entries = [
      row('B-1', '2026-10-05', '4h'), row('A-1', '2026-10-05', '4h'),   // Mon: met
      row('A-1', '2026-10-06', '6h'),                                   // Tue: under 2h
      row('A-1', '2026-10-07', '7h'), row('A-2', '2026-10-07', '2h 30m'), // Wed: over 1h 30m
      // Thu 08 (today): no rows → under 8h
      row('A-1', '2026-10-09', '1h'),                                   // Fri: holiday, overtime 1h
      // Sat 10: weekend, empty
      row('A-1', '2026-10-11', '2h'),                                   // Sun: weekend, overtime 2h
    ];

    const groups = groupByDay(entries, options);

    expect(groups.map(g => [g.date, g.totalMinutes, g.state, g.missingMinutes, g.overtimeMinutes])).toEqual([
      ['2026-10-05', 480, 'met', 0, 0],
      ['2026-10-06', 360, 'under', 120, 0],
      ['2026-10-07', 570, 'over', 0, 90],
      ['2026-10-08', 0, 'under', 480, 0],
      ['2026-10-09', 60, 'off', 0, 60],
      ['2026-10-10', 0, 'off', 0, 0],
      ['2026-10-11', 120, 'off', 0, 120],
    ]);
    expect(groups[0].entries.map(e => e.issueKey)).toEqual(['A-1', 'B-1']);
    expect(groups.find(g => g.isToday)?.date).toBe('2026-10-08');
    expect(groups[4].holidayName).toBe('Test Holiday');
    expect(groups.filter(g => g.isWeekend).map(g => g.date)).toEqual(['2026-10-10', '2026-10-11']);
  });

  it('puts rows without a valid date in a last group with an empty date', () => {
    const groups = groupByDay([row('A-1', '2026-10-05', '8h'), row('A-2', 'not-a-date', '1h'), row('A-3', '', '1h')], options);

    expect(groups.map(g => g.date)).toEqual(['2026-10-05', '']);
    expect(groups[1].entries.map(e => e.issueKey)).toEqual(['A-2', 'A-3']);
  });
});

describe('rangeSummary', () => {
  it('compares all dated logged time with target × working days', () => {
    const groups = groupByDay([
      row('A-1', '2026-10-08', '6h'),   // Thu, working
      row('A-1', '2026-10-09', '1h'),   // Fri, holiday
      row('A-1', '2026-10-12', '8h'),   // Mon, working (Sat/Sun between are off)
      row('A-2', '', '3h'),             // undated: not part of the range
    ], options);

    expect(rangeSummary(groups, 8 * 60)).toEqual({ loggedMinutes: 15 * 60, targetMinutes: 16 * 60, workingDays: 2 });
  });
});

describe('groupByDay with leave', () => {
  it('treats a full leave day as off and lowers the target of a partial leave day', () => {
    const leave = new Map([['2026-10-06', 480], ['2026-10-07', 240]]);
    const groups = groupByDay([
      row('A-1', '2026-10-05', '8h'),
      row('A-1', '2026-10-07', '3h'),   // Wed: 4h leave → target 4h, 1h missing
      row('A-1', '2026-10-08', '8h'),
    ], { ...options, today: '2026-10-01', leave });

    expect(groups.map(g => [g.date, g.state, g.targetMinutes, g.missingMinutes, g.leaveMinutes])).toEqual([
      ['2026-10-05', 'met', 480, 0, 0],
      ['2026-10-06', 'off', 0, 0, 480],
      ['2026-10-07', 'under', 240, 60, 240],
      ['2026-10-08', 'met', 480, 0, 0],
    ]);
    expect(rangeSummary(groups, 8 * 60)).toEqual({ loggedMinutes: 19 * 60, targetMinutes: 20 * 60, workingDays: 3 });
  });
});
