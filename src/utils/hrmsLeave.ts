import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns';

/** The fields of an HRMS leave request this app reads; everything else in the record is ignored. */
export interface HrmsLeaveRecord {
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  leave_type: string;
  status: string;
  date_of_cancellation: string | null;
}

// HRMS counts a working day as 08:00–17:00 with lunch 12:00–13:00 = 8h (a full-day WFH row shows 8.00 hours).
const WORK_START = 8 * 60;
const WORK_END = 17 * 60;
const LUNCH_START = 12 * 60;
const LUNCH_END = 13 * 60;
const FULL_DAY = 8 * 60;

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Work minutes between two clock times of one day, without the lunch break. */
function workMinutes(from: number, to: number): number {
  const start = Math.max(from, WORK_START);
  const stop = Math.min(to, WORK_END);
  if (stop <= start) return 0;
  const lunch = Math.max(0, Math.min(stop, LUNCH_END) - Math.max(start, LUNCH_START));
  return Math.min(FULL_DAY, stop - start - lunch);
}

/**
 * Leave minutes per weekday (yyyy-MM-dd). Only approved, not-cancelled requests count: pending or denied
 * leave may not happen, and suggesting no work for it would leave real working days empty.
 */
export function leaveMinutesByDay(records: HrmsLeaveRecord[]): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const record of records) {
    if (record.status !== 'Approved' || record.date_of_cancellation) continue;
    const first = record.from_date;
    const last = record.to_date;
    for (const day of eachDayOfInterval({ start: parseISO(first), end: parseISO(last) })) {
      if (isWeekend(day)) continue;
      const date = format(day, 'yyyy-MM-dd');
      const from = date === first ? minutesOf(record.from_time) : WORK_START;
      const to = date === last ? minutesOf(record.to_time) : WORK_END;
      const minutes = workMinutes(from, to);
      if (minutes > 0) byDay[date] = Math.min(FULL_DAY, (byDay[date] || 0) + minutes);
    }
  }
  return byDay;
}
