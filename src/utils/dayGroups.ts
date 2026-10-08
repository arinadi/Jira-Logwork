import { eachDayOfInterval, format, isValid, isWeekend, parseISO } from 'date-fns';
import type { WorklogEntry } from '../types/worklog';
import { parseDurationToHours } from './validation';

export type DayState = 'met' | 'under' | 'over' | 'off';

export interface DayGroup {
  /** yyyy-MM-dd, or '' for rows without a valid date */
  date: string;
  entries: WorklogEntry[];
  totalMinutes: number;
  state: DayState;
  /** Target minus logged, on a working day that is under target */
  missingMinutes: number;
  /** Logged above target on a working day, or everything logged on an off day */
  overtimeMinutes: number;
  isToday: boolean;
  isWeekend: boolean;
  holidayName?: string;
  /** Approved leave that day; a full day of leave makes the day 'off' */
  leaveMinutes: number;
  /** The day's target after leave; 0 on an off day */
  targetMinutes: number;
}

export interface DayGroupOptions {
  targetMinutes: number;
  /** yyyy-MM-dd → holiday name */
  holidays: Map<string, string>;
  /** yyyy-MM-dd */
  today: string;
  /** yyyy-MM-dd → minutes of approved leave */
  leave?: Map<string, number>;
  /** Issue keys where leave is logged; time on them is the leave, not extra work */
  leaveTickets?: string[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isDay = (date: string) => DAY.test(date) && isValid(parseISO(date));

/** Minutes of a Jira duration; an invalid duration counts as 0 (validation flags it on the row). */
export const entryMinutes = (entry: WorklogEntry) => Math.round((parseDurationToHours(entry.timeSpent) || 0) * 60);

/**
 * One group per calendar day from the first to the last row date. Empty days are included,
 * because a working day with nothing logged is exactly what the user must notice.
 */
export function groupByDay(entries: WorklogEntry[], options: DayGroupOptions): DayGroup[] {
  const byDate = new Map<string, WorklogEntry[]>();
  const undated: WorklogEntry[] = [];
  for (const entry of entries) {
    if (!isDay(entry.date)) { undated.push(entry); continue; }
    byDate.set(entry.date, [...(byDate.get(entry.date) || []), entry]);
  }

  const groups: DayGroup[] = [];
  const dates = Array.from(byDate.keys()).sort();
  if (dates.length > 0) {
    for (const day of eachDayOfInterval({ start: parseISO(dates[0]), end: parseISO(dates[dates.length - 1]) })) {
      const date = format(day, 'yyyy-MM-dd');
      const dayEntries = (byDate.get(date) || []).sort((a, b) => a.issueKey.localeCompare(b.issueKey));
      const totalMinutes = dayEntries.reduce((sum, e) => sum + entryMinutes(e), 0);
      const weekend = isWeekend(day);
      const holidayName = options.holidays.get(date);
      const leaveMinutes = options.leave?.get(date) || 0;
      // Leave already logged on a leave ticket is the leave itself: subtracting it from the target as well
      // would count it twice (4h leave + 4h on the leave ticket + 4h work showed "4h over").
      const onLeaveTickets = dayEntries
        .filter(e => options.leaveTickets?.includes(e.issueKey))
        .reduce((sum, e) => sum + entryMinutes(e), 0);
      const unloggedLeave = Math.max(0, leaveMinutes - onLeaveTickets);
      // Leave hours are not owed: they come off the target, and a full leave day is off like a holiday.
      const target = Math.max(0, options.targetMinutes - unloggedLeave);
      const off = weekend || holidayName !== undefined || target === 0;
      groups.push({
        date,
        entries: dayEntries,
        totalMinutes,
        state: off ? 'off' : totalMinutes === target ? 'met' : totalMinutes < target ? 'under' : 'over',
        missingMinutes: off ? 0 : Math.max(0, target - totalMinutes),
        // On an off day every logged minute is overtime; there is no target to subtract.
        overtimeMinutes: off ? totalMinutes : Math.max(0, totalMinutes - target),
        isToday: date === options.today,
        isWeekend: weekend,
        holidayName,
        leaveMinutes,
        targetMinutes: off ? 0 : target,
      });
    }
  }

  if (undated.length > 0) {
    const totalMinutes = undated.reduce((sum, e) => sum + entryMinutes(e), 0);
    // Rows without a date (e.g. from a CSV) must stay visible so the user can fix them.
    groups.push({
      date: '', entries: undated, totalMinutes, state: 'off', missingMinutes: 0, overtimeMinutes: 0,
      isToday: false, isWeekend: false, leaveMinutes: 0, targetMinutes: 0,
    });
  }
  return groups;
}

export interface RangeSummary {
  loggedMinutes: number;
  targetMinutes: number;
  workingDays: number;
}

/** Logged vs. expected over the dated range; undated rows are not part of any day, so they are left out. */
export function rangeSummary(groups: DayGroup[], dailyTargetMinutes: number): RangeSummary {
  const dated = groups.filter(g => g.date !== '');
  const working = dated.filter(g => g.state !== 'off');
  return {
    loggedMinutes: dated.reduce((sum, g) => sum + g.totalMinutes, 0),
    // Per-day targets, so partial leave lowers the expected total; leave only ever lowers a day, never raises it.
    targetMinutes: working.reduce((sum, g) => sum + Math.min(g.targetMinutes, dailyTargetMinutes), 0),
    workingDays: working.length,
  };
}

/** Display form of a minute count, same notation as Jira ("2h 30m", "45m", "0h"). */
export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
