import type { AuthConfig } from '../types/auth';
import type { WorklogEntry } from '../types/worklog';
import { jiraService } from '../services/jira';
import { format, parseISO, addDays, isWithinInterval } from 'date-fns';
import { parseDurationToHours } from './validation';

export interface FetchParams {
  jql: string;
  startDate: string;
  endDate: string;
  defaultTime?: string;
}

/** Delay helper to avoid hammering Jira API — interruptible by signal */
const delay = (ms: number, signal?: AbortSignal) => 
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });

/** Rate limit: wait this many ms between API calls */
const THROTTLE_MS = 1000;

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
    await delay(THROTTLE_MS, signal);
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
    const { jql, startDate, endDate, defaultTime = '8h' } = params;
    const start = parseISO(startDate);
    // End date must include the full day — shift to next midnight so isWithinInterval is inclusive
    const end = addDays(parseISO(endDate), 1);
    
    // Step 1 — Fetch all issue keys + summaries
    // Match activity by accountId: display names are not unique and can change.
    const me = await jiraService.getCurrentUser(config, signal);
    const myAccountId: string = me.accountId;

    onProgress?.(0, 1, 'Searching for matching issues...');
    const issueMap = new Map<string, string>(); // key -> summary
    const collectIssues = async (query: string) => {
      let nextPageToken: string | undefined;
      while (!signal?.aborted) {
        const data = await jiraService.searchIssues(config, query, nextPageToken, signal);
        const issues = data.issues || [];
        for (const issue of issues) {
          const summary = issue.fields?.summary || issue.key;
          issueMap.set(issue.key, summary);
        }
        if (data.isLast || !data.nextPageToken) break;
        nextPageToken = data.nextPageToken;
        await delay(THROTTLE_MS, signal);
      }
    };

    try {
      await collectIssues(jql);
      // The day budget must see every worklog of the user, also on issues the user's JQL does not match.
      await delay(THROTTLE_MS, signal);
      await collectIssues(`worklogAuthor = currentUser() AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err;
    }

    const allIssueKeys = Array.from(issueMap.keys());
    const totalSteps = allIssueKeys.length * 3; // changelog + comments + worklogs per issue
    onProgress?.(0, totalSteps, `Found ${allIssueKeys.length} issues. Scanning history & existing worklogs...`);

    // Collect raw events and track existing worklogs
    const rawEvents: RawEvent[] = [];
    const failedIssues: string[] = [];
    const existingWorklogs = new Map<string, { comment: string; seconds: number }>(); // "issueKey::yyyy-MM-dd" -> own worklogs that day
    
    // For each issue: fetch changelog, then comments, then worklogs
    for (let i = 0; i < allIssueKeys.length; i++) {
      if (signal?.aborted) break;
      const key = allIssueKeys[i];
      const summary = issueMap.get(key) || key;
      
      try {
        // --- Step 2: Fetch changelog ---
        onProgress?.(i * 3 + 1, totalSteps, `[${i + 1}/${allIssueKeys.length}] Changelog: ${key}`);
        
        const statusChangeDates: Array<{ date: string; statusChange: string }> = [];
        let changelogStartAt = 0;
        
        while (!signal?.aborted) {
          const historyData = await jiraService.getIssueChangelog(config, key, changelogStartAt, signal);
          const values = historyData.values || [];
          
          for (const history of values) {
            if (history.author?.accountId !== myAccountId) continue;

            const createdDate = parseISO(history.created);
            if (!isWithinInterval(createdDate, { start, end })) continue;

            for (const item of history.items) {
              if (item.field !== 'status') continue;

              const dateKey = format(createdDate, 'yyyy-MM-dd');
              statusChangeDates.push({
                date: dateKey,
                statusChange: `${item.fromString || 'None'} → ${item.toString || 'None'}`,
              });
            }
          }

          if (changelogStartAt + values.length >= (historyData.total ?? 0) || values.length === 0) break;
          changelogStartAt += values.length;
          await delay(THROTTLE_MS, signal);
        }

        if (signal?.aborted) break;

        // --- Step 3: Fetch latest comment for this issue ---
        onProgress?.(i * 3 + 2, totalSteps, `[${i + 1}/${allIssueKeys.length}] Comments: ${key}`);
        await delay(THROTTLE_MS, signal);

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

        // --- Step 3b: Fetch existing worklogs for this issue ---
        onProgress?.(i * 3 + 3, totalSteps, `[${i + 1}/${allIssueKeys.length}] Checking existing worklogs: ${key}`);
        await delay(THROTTLE_MS, signal);
        
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
          break; // Stop processing issues on abort
        }
      }

      if (i < allIssueKeys.length - 1 && !signal?.aborted) await delay(THROTTLE_MS, signal);
    }

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

    // Sort by date ascending, then by issue key
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.issueKey.localeCompare(b.issueKey));

    onProgress?.(totalSteps, totalSteps, `Done! ${entries.length} worklogs across ${byDate.size} days.`);
    fullDays.sort();
    return { entries, fullDays, failedIssues };
  }
};


