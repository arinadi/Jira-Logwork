import { addDays, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subDays, subWeeks } from 'date-fns';

/**
 * Default date range of a history scan: the last 7 days up to today.
 * Uses the local calendar: toISOString() is UTC, which is yesterday before 07:00 in UTC+7.
 */
export function defaultScanRange(now: Date): { startDate: string; endDate: string } {
  return {
    startDate: format(subDays(now, 7), 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd'),
  };
}

/**
 * Default scan JQL: issues where the user logged work, changed status, or watches and that were updated in the range.
 * Jira Cloud has no "commented by" clause and gameloft.atlassian.net rejects updatedBy();
 * commenting makes the user a watcher by default, so watcher + updated is how comments are found.
 * currentUser() instead of a name: names are not unique and Jira Cloud JQL resolves them unreliably.
 * A JQL date means 00:00 of that day, so DURING ends at the day after the range.
 */
export function defaultScanJql(startDate: string, endDate: string, allowedComponents: string[] = []): string {
  const dayAfterEnd = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
  const ownWorklogs = `worklogAuthor = currentUser() AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  const activity = `status CHANGED BY currentUser() DURING ("${startDate}", "${dayAfterEnd}")`
    + ` OR watcher = currentUser() AND updated >= "${startDate}"`;
  if (allowedComponents.length === 0) return `${ownWorklogs} OR ${activity}`;
  // Only the activity part is limited: own worklogs on any issue must still be found so the day total is right.
  // This only makes the scan smaller; jiraFetcher enforces the component rule itself.
  return `${ownWorklogs} OR (${activity}) AND ${componentInClause(allowedComponents)}`;
}

/** `component in ("A", "B")` with quotes in names escaped for JQL. */
export function componentInClause(components: string[]): string {
  return `component in (${components.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ')})`;
}

export type ScanPreset = 'thisWeek' | 'lastWeek' | 'thisMonth';

/** Work weeks start on Monday (ISO); date-fns defaults to Sunday. Ranges end today, never in the future. */
export function scanPresetRange(preset: ScanPreset, now: Date): { startDate: string; endDate: string } {
  const day = (d: Date) => format(d, 'yyyy-MM-dd');
  const monday = { weekStartsOn: 1 } as const;
  switch (preset) {
    case 'thisWeek':
      return { startDate: day(startOfWeek(now, monday)), endDate: day(now) };
    case 'lastWeek': {
      const lastWeek = subWeeks(now, 1);
      return { startDate: day(startOfWeek(lastWeek, monday)), endDate: day(endOfWeek(lastWeek, monday)) };
    }
    case 'thisMonth':
      return { startDate: day(startOfMonth(now)), endDate: day(now) };
  }
}
