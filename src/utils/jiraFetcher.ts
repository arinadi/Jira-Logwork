import type { AuthConfig } from '../types/auth';
import type { WorklogEntry } from '../types/worklog';
import { jiraService } from '../services/jira';
import { format, parseISO, addDays, isWithinInterval, eachDayOfInterval, isWeekend } from 'date-fns';
import { parseDurationToHours } from './validation';
import { componentInClause } from './scanDefaults';

export interface FetchParams {
  jql: string;
  startDate: string;
  endDate: string;
  defaultTime?: string;
  /** Component names new rows are allowed on; empty or missing = all. */
  allowedComponents?: string[];
  /** yyyy-MM-dd days that are not working days besides weekends (public holidays, leave) */
  nonWorkingDays?: string[];
  /** Status names that count as "working on it"; empty = Jira's In Progress category */
  workingStatuses?: string[];
}

/**
 * Issues scanned at the same time. A small pool removes most of the waiting on round trips; if Jira still
 * finds it too much it answers 429, which jiraService retries after Retry-After.
 */
const ISSUE_CONCURRENCY = 5;

/**
 * The API spec says bulk changelog dates are ISO text, but the live site sent a non-string (parseISO threw);
 * epoch milliseconds is Jira's other date form. Accept both so the scan does not depend on which one arrives.
 */
function jiraDate(value: string | number): Date {
  return typeof value === 'number' ? new Date(value) : parseISO(value);
}

/** Empty working days after the last active day that may inherit its tickets. */
const CARRY_OVER_WORKING_DAYS = 5;

/** Reads a startAt-paged Jira list to the end; Jira may return fewer items than asked, so trust total. */
async function readAllPages<T>(
  readPage: (startAt: number) => Promise<{ items: T[]; total?: number }>,
  signal?: AbortSignal
): Promise<T[]> {
  const all: T[] = [];
  while (!signal?.aborted) {
    const { items, total } = await readPage(all.length);
    all.push(...items);
    if (items.length === 0 || all.length >= (total ?? 0)) break;
  }
  return all;
}

/** Convert whole minutes to Jira time notation (e.g., 160 -> "2h 40m") */
function minutesToJiraTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Splits free minutes over n tickets so the parts add up exactly.
 * Floor + hand the remainder out one minute at a time: rounding each part alone drifts (8h / 7 → 8h 3m).
 */
function splitMinutes(freeMinutes: number, n: number): number[] {
  const base = Math.floor(freeMinutes / n);
  const remainder = freeMinutes - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Extract plain text from Atlassian Document Format (ADF) — first 2 lines only (Optimized for comments) */
function adfToPlainText(adf: unknown): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  if (typeof adf !== 'object') return '';
  const doc = adf as { content?: Array<{ content?: Array<{ text?: string }> }> };
  const lines: string[] = [];
  for (const block of (doc.content || []).slice(0, 2)) {
    const texts: string[] = [];
    for (const inline of block.content || []) {
      if (inline.text) texts.push(inline.text);
    }
    if (texts.length > 0) lines.push(texts.join(' '));
  }
  const result = lines.join('. ').trim();
  return result.length > 160 ? result.substring(0, 157) + '...' : result;
}

interface ADFNode {
  type?: string;
  text?: string;
  content?: ADFNode[];
}

/** Deep recursive extraction specifically for Worklog comments (handles lists/nested blocks) */
function adfToWorklogText(adf: unknown): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  if (typeof adf !== 'object') return '';

  const extract = (node: ADFNode): string => {
    if (node.type === 'text') return node.text || '';
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extract).join(' ');
    }
    return '';
  };

  const doc = adf as ADFNode;
  const blocks = (doc.content || []).slice(0, 5); // Allow more blocks for worklogs
  const lines = blocks.map(block => extract(block).trim()).filter(Boolean);
  
  const result = lines.join('. ').replace(/\s+/g, ' ').trim();
  return result.length > 300 ? result.substring(0, 297) + '...' : result;
}

/** The fields this scanner reads from Jira REST v3 comment and worklog objects. */
interface JiraAuthor { accountId?: string }
interface JiraComment { author?: JiraAuthor; created: string; body: unknown }
interface JiraWorklog { author?: JiraAuthor; started: string; timeSpentSeconds?: number; comment?: unknown }

export interface ScanResult {
  entries: WorklogEntry[];
  /** Days that had new activity but no free time left, so no new rows were made. */
  fullDays: string[];
  /** Issues whose history could not be read; their activity is missing from entries. */
  failedIssues: string[];
  /** Issues with activity but none of the allowed components; no new rows were made for them. */
  outsideComponents: string[];
}

/** Raw event collected before smart distribution */
interface RawEvent {
  issueKey: string;
  date: string;
  summary: string;
  comment: string;
  statusChange: string;
}

export const jiraFetcher = {
  /**
   * Turns the user's Jira activity in [startDate, endDate] into worklog rows.
   * The rules are documented in README.md "Smart Fetch: How Activity Becomes Worklogs".
   *
   * Step 1: GET /rest/api/3/myself + /rest/api/3/search/jql (user JQL + own worklogs) → issues
   * Step 2: per issue, all pages of changelog, comments and worklogs in range
   * Step 3: per day, synced rows with real time; free time split over new tickets
   */
  async fetchEvents(
    config: AuthConfig, 
    params: FetchParams, 
    onProgress?: (current: number, total: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<ScanResult> {
    const { jql, startDate, endDate, defaultTime = '8h', allowedComponents = [], nonWorkingDays = [], workingStatuses = [] } = params;
    const allowed = new Set(allowedComponents.map(c => c.toLowerCase()));
    const start = parseISO(startDate);
    // End date must include the full day — shift to next midnight so isWithinInterval is inclusive
    const end = addDays(parseISO(endDate), 1);
    
    // Step 1 — Fetch all issue keys + summaries
    // Match activity by accountId: display names are not unique and can change.
    const me = await jiraService.getCurrentUser(config, signal);
    const myAccountId: string = me.accountId;

    onProgress?.(0, 1, 'Searching for matching issues...');
    const issueMap = new Map<string, string>(); // key -> summary
    const keyById = new Map<string, string>(); // bulk changelog answers by issue ID
    const componentsByKey = new Map<string, string[]>(); // lower-case component names
    // Status id + assignee now: the starting point to replay history backwards for empty days.
    const currentByKey = new Map<string, { statusId: string; assignee: string | null }>();
    const collectIssues = async (query: string) => {
      let nextPageToken: string | undefined;
      while (!signal?.aborted) {
        const data = await jiraService.searchIssues(config, query, nextPageToken, signal);
        const issues = data.issues || [];
        for (const issue of issues) {
          const summary = issue.fields?.summary || issue.key;
          issueMap.set(issue.key, summary);
          if (issue.id) keyById.set(String(issue.id), issue.key);
          componentsByKey.set(issue.key, (issue.fields?.components || []).map((c: { name?: string }) => (c.name || '').toLowerCase()));
          currentByKey.set(issue.key, { statusId: String(issue.fields?.status?.id ?? ''), assignee: issue.fields?.assignee?.accountId ?? null });
        }
        if (data.isLast || !data.nextPageToken) break;
        nextPageToken = data.nextPageToken;
      }
    };

    try {
      await collectIssues(jql);
      // The day budget must see every worklog of the user, also on issues the user's JQL does not match.
      await collectIssues(`worklogAuthor = currentUser() AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err;
    }
    // Only these get comment + worklog calls; tickets found below are only candidates for empty days.
    const scanKeys = Array.from(issueMap.keys());

    const dayAfterEnd = format(end, 'yyyy-MM-dd');
    const componentClause = allowedComponents.length
      ? ` AND ${componentInClause(allowedComponents)}`
      : '';
    try {
      await collectIssues(`assignee WAS currentUser() DURING ("${startDate}", "${dayAfterEnd}")${componentClause}`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err;
    }
    const allIssueKeys = Array.from(issueMap.keys());

    // One bulk call per 1000 issues instead of one changelog call per issue: the per-issue round trips
    // were most of the scan time.
    const statusChangesByKey = new Map<string, Array<{ date: string; statusChange: string }>>();
    // Every status/assignee change by anyone, to know who had the ticket in which status on a given day.
    const historyByKey = new Map<string, Array<{ time: number; field: 'status' | 'assignee'; from: string | null; to: string | null }>>();
    for (let from = 0; from < allIssueKeys.length && !signal?.aborted; from += 1000) {
      const chunk = allIssueKeys.slice(from, from + 1000);
      let nextPageToken: string | undefined;
      do {
        const page = await jiraService.bulkFetchChangelogs(config, chunk, ['status', 'assignee'], nextPageToken, signal);
        for (const issueLog of page.issueChangeLogs || []) {
          const key = keyById.get(String(issueLog.issueId)) || String(issueLog.issueId);
          for (const history of issueLog.changeHistories || []) {
            const createdDate = jiraDate(history.created);
            for (const item of history.items || []) {
              if (item.field !== 'status' && item.field !== 'assignee') continue;
              const list = historyByKey.get(key) || [];
              list.push({ time: createdDate.getTime(), field: item.field, from: item.from ?? null, to: item.to ?? null });
              historyByKey.set(key, list);
            }
            if (history.author?.accountId !== myAccountId) continue;
            if (!isWithinInterval(createdDate, { start, end })) continue;
            for (const item of history.items || []) {
              if (item.field !== 'status') continue;
              const list = statusChangesByKey.get(key) || [];
              list.push({ date: format(createdDate, 'yyyy-MM-dd'), statusChange: `${item.fromString || 'None'} → ${item.toString || 'None'}` });
              statusChangesByKey.set(key, list);
            }
          }
        }
        nextPageToken = page.nextPageToken || undefined;
      } while (nextPageToken && !signal?.aborted);
    }
    const totalSteps = scanKeys.length; // progress counts finished issues
    let doneIssues = 0;
    onProgress?.(0, totalSteps, `Found ${scanKeys.length} issues. Reading comments and worklogs...`);

    // Collect raw events and track existing worklogs
    const rawEvents: RawEvent[] = [];
    const failedIssues: string[] = [];
    const existingWorklogs = new Map<string, { comment: string; seconds: number }>(); // "issueKey::yyyy-MM-dd" -> own worklogs that day
    
    // Comments + worklogs of one issue; ISSUE_CONCURRENCY issues run at the same time.
    const scanIssue = async (key: string) => {
      const summary = issueMap.get(key) || key;

      try {
        const statusChangeDates = statusChangesByKey.get(key) || [];

        // Build a map: date -> latest comment text (by author, on that date)
        const commentsByDate = new Map<string, string>();
        const comments = await readAllPages<JiraComment>(async startAt => {
          const page = await jiraService.getIssueComments(config, key, startAt, signal);
          return { items: page.comments || [], total: page.total };
        }, signal);

        for (const c of comments) {
          const isMine = c.author?.accountId === myAccountId;
          const cDate = parseISO(c.created);
          const cDateKey = format(cDate, 'yyyy-MM-dd');
          const text = adfToPlainText(c.body);
          if (!text) continue;

          // For each date within range, keep the latest comment
          if (isMine && isWithinInterval(cDate, { start, end }) && !commentsByDate.has(cDateKey)) {
            commentsByDate.set(cDateKey, text);
          }
        }

        const worklogs = await readAllPages<JiraWorklog>(async startAt => {
          const page = await jiraService.getIssueWorklogs(
            config, key, { startAt, startedAfter: start.getTime(), startedBefore: end.getTime() }, signal
          );
          return { items: page.worklogs || [], total: page.total };
        }, signal);
        const worklogDates = new Set<string>();
        
        for (const w of worklogs) {
          if (w.author?.accountId !== myAccountId) continue;
          
          const wDate = parseISO(w.started);
          if (!isWithinInterval(wDate, { start, end })) continue;

          const wDateKey = format(wDate, 'yyyy-MM-dd');
          const wComment = w.comment ? adfToWorklogText(w.comment) : '';
          
          const logged = existingWorklogs.get(`${key}::${wDateKey}`);
          existingWorklogs.set(`${key}::${wDateKey}`, {
            comment: logged?.comment || wComment,
            seconds: (logged?.seconds || 0) + (w.timeSpentSeconds || 0),
          });
          worklogDates.add(wDateKey);
        }

        // Unified Activity Detection
        // Combine all dates where SOMETHING happened
        const allActivityDates = new Set<string>();
        statusChangeDates.forEach(sc => allActivityDates.add(sc.date));
        commentsByDate.forEach((_, date) => allActivityDates.add(date));
        worklogDates.forEach(date => allActivityDates.add(date));

        // Build raw events for each active date
        for (const date of allActivityDates) {
          // Only the user's own words from that day describe that day's work; others' comments do not.
          const dateComment = commentsByDate.get(date) || '';
          
          // Find all transitions for this specific date
          const transitions = statusChangeDates
            .filter(sc => sc.date === date)
            .map(sc => sc.statusChange);

          rawEvents.push({
            issueKey: key,
            date: date,
            summary,
            comment: dateComment,
            statusChange: transitions.join(', '),
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Keep scanning the other issues, but the user must see this issue is missing from the result.
          console.warn(`Error processing ${key}, skipping:`, err);
          failedIssues.push(key);
        } else {
          return; // cancelled: no progress update, the workers stop picking new issues
        }
      }
      doneIssues++;
      onProgress?.(doneIssues, totalSteps, `${doneIssues} / ${totalSteps} issues`);
    };

    // A small fixed pool keeps the scan fast without flooding Jira; any 429 is retried in jiraService.
    let nextIndex = 0;
    const worker = async () => {
      while (!signal?.aborted && nextIndex < scanKeys.length) {
        await scanIssue(scanKeys[nextIndex++]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(ISSUE_CONCURRENCY, scanKeys.length) }, worker));
    // Workers finish in any order; keep the list stable for the user.
    failedIssues.sort();

    // Step 4 — Smart Report: merge transitions + distribute time
    const finalMsg = signal?.aborted ? 'Scan stopped. Processing partial results...' : 'Building smart report...';
    onProgress?.(totalSteps, totalSteps, finalMsg);

    const dailyHours = parseDurationToHours(defaultTime) || 8;

    // 4a. Group by issueKey+date → merge all transitions into one entry
    const merged = new Map<string, { issueKey: string; date: string; summary: string; comment: string; transitions: string[] }>();
    for (const ev of rawEvents) {
      const mergeKey = `${ev.issueKey}::${ev.date}`;
      const existing = merged.get(mergeKey);
      if (existing) {
        // Append transition to existing entry
        if (!existing.transitions.includes(ev.statusChange)) {
          existing.transitions.push(ev.statusChange);
        }
      } else {
        merged.set(mergeKey, {
          issueKey: ev.issueKey,
          date: ev.date,
          summary: ev.summary,
          comment: ev.comment,
          transitions: ev.statusChange ? [ev.statusChange] : [],
        });
      }
    }

    // 4a'. Only issues with an allowed component may get NEW rows. Rows for existing worklogs stay: that time
    // is already in Jira and must count toward the day, or the split would plan the day past its target.
    const isAllowed = (key: string) => allowed.size === 0 || (componentsByKey.get(key) || []).some(c => allowed.has(c));
    const outsideComponents = new Set<string>();
    for (const [mergeKey, entry] of merged) {
      if (existingWorklogs.has(mergeKey) || isAllowed(entry.issueKey)) continue;
      merged.delete(mergeKey);
      outsideComponents.add(entry.issueKey);
    }

    // 4b. Group merged entries by date for time distribution
    const byDate = new Map<string, Array<{ issueKey: string; date: string; summary: string; comment: string; transitions: string[] }>>();
    for (const entry of merged.values()) {
      const list = byDate.get(entry.date) || [];
      list.push(entry);
      byDate.set(entry.date, list);
    }

    // 4c. Build final entries with distributed time + combined comment
    const entries: WorklogEntry[] = [];
    const fullDays: string[] = [];
    for (const [date, ticketsOnDay] of byDate) {
      // Only the time not yet logged that day (on any issue) is free to hand out.
      let loggedSecondsOnDay = 0;
      for (const [k, logged] of existingWorklogs) {
        if (k.endsWith(`::${date}`)) loggedSecondsOnDay += logged.seconds;
      }
      const newTickets = ticketsOnDay
        .filter(t => !existingWorklogs.has(`${t.issueKey}::${date}`))
        .map(t => t.issueKey)
        .sort();
      // Floor to whole minutes: Jira takes minutes, and rounding up could push the day over target.
      const freeMinutes = Math.max(0, Math.floor((dailyHours * 3600 - loggedSecondsOnDay) / 60));
      if (newTickets.length > 0 && freeMinutes === 0) fullDays.push(date);
      const parts = splitMinutes(freeMinutes, newTickets.length || 1);
      const newMinutes = new Map(newTickets.map((k, i) => [k, parts[i]]));

      for (const ticket of ticketsOnDay) {
        const existingKey = `${ticket.issueKey}::${date}`;
        const logged = existingWorklogs.get(existingKey);
        const hasExistingWorklog = logged !== undefined;
        // No free minute for this ticket: a new row would push the day over target, and Jira rejects 0m.
        if (!hasExistingWorklog && !newMinutes.get(ticket.issueKey)) continue;
        const existingWorklogComment = logged?.comment;

        // Generated text: [own comment that day] | Status: A → B, B → C — else the issue summary.
        const transitionText = ticket.transitions.join(', ');
        const commentParts = [];
        if (ticket.comment) commentParts.push(ticket.comment);
        if (transitionText) commentParts.push(`Status: ${transitionText}`);
        const generatedComment = commentParts.join(' | ') || ticket.summary;
        // A synced row shows what is in Jira; generated text only fills an empty worklog comment.
        const finalComment = hasExistingWorklog ? existingWorklogComment || generatedComment : generatedComment;

        entries.push({
          id: crypto.randomUUID(),
          issueKey: ticket.issueKey,
          date,
          // A synced row mirrors what is in Jira; showing the generated split would misstate the day total.
          timeSpent: logged ? minutesToJiraTime(Math.round(logged.seconds / 60)) : minutesToJiraTime(newMinutes.get(ticket.issueKey) || 0),
          comment: finalComment,
          status: hasExistingWorklog ? 'synced' : 'ready',
          originalRowIndex: entries.length,
        });
      }
    }

    // Step 5 — Empty working days: suggest what the user was most likely doing.
    const statuses = await jiraService.getStatuses(config, signal);
    const workingNames = new Set(workingStatuses.map(n => n.toLowerCase()));
    const workingStatusIds = new Set(statuses
      .filter(st => (workingNames.size > 0 ? workingNames.has(st.name.toLowerCase()) : st.category === 'indeterminate'))
      .map(st => st.id));
    const targetMinutes = Math.round(dailyHours * 60);

    /** Undo every change after `time` from the current values: who had the ticket, in which status, then. */
    const stateAt = (key: string, time: number) => {
      const state = { ...(currentByKey.get(key) || { statusId: '', assignee: null }) };
      const changes = [...(historyByKey.get(key) || [])].sort((a, b) => b.time - a.time);
      for (const change of changes) {
        if (change.time <= time) break;
        if (change.field === 'status') state.statusId = change.from ?? '';
        else state.assignee = change.from;
      }
      return state;
    };
    // "That day" = at its start or right after any change during it, so a ticket picked up mid-day counts.
    const workedOn = (key: string, dayStart: number, dayEnd: number) => {
      const moments = [dayStart, ...(historyByKey.get(key) || []).map(c => c.time).filter(t => t >= dayStart && t < dayEnd)];
      return moments.some(t => {
        const state = stateAt(key, t);
        return state.assignee === myAccountId && workingStatusIds.has(state.statusId);
      });
    };

    const nonWorking = new Set(nonWorkingDays);
    const suggest = (date: string, rows: Array<{ issueKey: string; comment: string }>, suggestion: 'in-progress' | 'carry-over') => {
      const parts = splitMinutes(targetMinutes, rows.length);
      rows.forEach((row, i) => {
        if (parts[i] === 0) return;
        entries.push({
          id: crypto.randomUUID(),
          issueKey: row.issueKey,
          date,
          timeSpent: minutesToJiraTime(parts[i]),
          comment: row.comment,
          status: 'ready',
          originalRowIndex: entries.length,
          suggestion,
        });
      });
    };

    // Days in order: the last day with real rows is the carry-over source for the empty days after it.
    let lastActiveRows: WorklogEntry[] = [];
    let workingDaysSinceActive = 0;
    for (const day of eachDayOfInterval({ start, end: addDays(end, -1) })) {
      const date = format(day, 'yyyy-MM-dd');
      if (isWeekend(day) || nonWorking.has(date)) continue;
      const realRows = entries.filter(e => e.date === date && !e.suggestion);
      if (realRows.length > 0) {
        lastActiveRows = realRows;
        workingDaysSinceActive = 0;
        continue;
      }
      workingDaysSinceActive++;

      // 1. Tickets I had in a working status that day: the best evidence of what the day was spent on.
      const dayStart = day.getTime();
      const dayEnd = addDays(day, 1).getTime();
      const inProgress = allIssueKeys.filter(key => isAllowed(key) && workedOn(key, dayStart, dayEnd)).sort();
      if (inProgress.length > 0) {
        suggest(date, inProgress.map(key => ({ issueKey: key, comment: `In progress: ${issueMap.get(key) || key}` })), 'in-progress');
        continue;
      }

      // 2. Else the work of the last active day most likely went on — but only for a short gap; a longer
      // one is more likely leave or other work, and a wrong guess would end up in Jira.
      if (lastActiveRows.length > 0 && workingDaysSinceActive <= CARRY_OVER_WORKING_DAYS) {
        const seen = new Set<string>();
        const carried = lastActiveRows
          .filter(r => isAllowed(r.issueKey) && !seen.has(r.issueKey) && seen.add(r.issueKey))
          .sort((a, b) => a.issueKey.localeCompare(b.issueKey))
          .map(r => ({ issueKey: r.issueKey, comment: `Continued: ${r.comment}` }));
        if (carried.length > 0) suggest(date, carried, 'carry-over');
      }
      // 3. Otherwise the day stays empty on purpose.
    }

    // Sort by date ascending, then by issue key
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.issueKey.localeCompare(b.issueKey));

    onProgress?.(totalSteps, totalSteps, `Done! ${entries.length} worklogs across ${byDate.size} days.`);
    fullDays.sort();
    return { entries, fullDays, failedIssues, outsideComponents: Array.from(outsideComponents).sort() };
  }
};


