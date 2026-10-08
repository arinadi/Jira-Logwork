import type { WorklogEntry } from '../types/worklog';
import { leaveKind, type LeaveKind } from './hrmsLeave';
import type { LeaveTickets } from './preferences';
import { entryMinutes, formatMinutes } from './dayGroups';

export interface LeaveRowInput {
  date: string;
  kind: LeaveKind;
  tickets: LeaveTickets;
  /** HRMS leave that day, minutes (0 = none known) */
  hrmsLeaveMinutes: number;
  /** HRMS leave types that day */
  hrmsTypes: string[];
  targetMinutes: number;
  existing: WorklogEntry[];
}

const DEFAULT_TEXT: Record<LeaveKind, string> = { annual: 'Annual leave', sick: 'Sick leave' };

/**
 * The row "Add … leave" puts on a day, or null when there is nothing to add. HRMS knows how long the leave was;
 * without HRMS data the user is taking the whole day. Leave already on either leave ticket is not added again.
 */
export function leaveRowFor(input: LeaveRowInput): WorklogEntry | null {
  const ticket = input.tickets[input.kind];
  if (!ticket) return null;
  const sameDay = input.existing.filter(e => e.date === input.date);
  if (sameDay.some(e => e.issueKey === ticket)) return null;

  const leaveTickets = [input.tickets.annual, input.tickets.sick].filter(Boolean);
  const alreadyOnLeave = sameDay.filter(e => leaveTickets.includes(e.issueKey)).reduce((sum, e) => sum + entryMinutes(e), 0);
  const minutes = input.hrmsLeaveMinutes > 0 ? Math.max(0, input.hrmsLeaveMinutes - alreadyOnLeave) : input.targetMinutes;
  if (minutes === 0) return null;

  const types = input.hrmsTypes.filter(t => leaveKind(t) === input.kind);
  return {
    id: crypto.randomUUID(),
    issueKey: ticket,
    date: input.date,
    timeSpent: formatMinutes(minutes),
    comment: types.length > 0 ? types.join(', ') : DEFAULT_TEXT[input.kind],
    status: 'ready',
    originalRowIndex: input.existing.length,
  };
}
