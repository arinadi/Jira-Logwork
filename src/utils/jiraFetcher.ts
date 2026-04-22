import type { AuthConfig } from '../types/auth';
import type { WorklogEntry } from '../types/worklog';
import { jiraService } from '../services/jira';
import { format, parseISO, isWithinInterval } from 'date-fns';

export interface FetchParams {
  jql: string;
  startDate: string;
  endDate: string;
  authorName: string;
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
const THROTTLE_MS = 3000;

/** Convert decimal hours to Jira time notation (e.g., 2.6667 -> "2h 40m") */
function hoursToJiraTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0 && m === 0) return '1h'; // minimum 1h
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Extract plain text from Atlassian Document Format (ADF) — first 2 lines only */
function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return '';
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
   * Orchestrates the fetching and filtering of status change events.
   * 
   * Step 1: GET /rest/api/3/search/jql  → issue keys + summaries
   * Step 2: GET /rest/api/3/issue/{key}/changelog  → status changes
   * Step 3: GET /rest/api/3/issue/{key}/comment  → latest comment
   * 
   * Smart Report:
   *   - Deduplicates by issue+date
   *   - Groups by date, distributes 8h equally across tickets on same day
   *   - Uses the latest comment as the worklog text (fallback: issue summary)
   */
  async fetchEvents(
    config: AuthConfig, 
    params: FetchParams, 
    onProgress?: (current: number, total: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<WorklogEntry[]> {
    const { jql, startDate, endDate, authorName, defaultTime = '8h' } = params;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // Step 1 — Fetch all issue keys + summaries
    onProgress?.(0, 1, 'Searching for matching issues...');
    const issueMap = new Map<string, string>(); // key -> summary
    let searchStartAt = 0;
    
    try {
      while (!signal?.aborted) {
        const data = await jiraService.searchIssues(config, jql, searchStartAt, signal);
        const issues = data.issues || [];
        for (const issue of issues) {
          const summary = issue.fields?.summary || issue.key;
          issueMap.set(issue.key, summary);
        }
        if (data.isLast || issues.length === 0) break;
        searchStartAt += issues.length;
        await delay(THROTTLE_MS, signal);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err;
    }

    const allIssueKeys = Array.from(issueMap.keys());
    const totalSteps = allIssueKeys.length * 2; // changelog + comments per issue
    onProgress?.(0, totalSteps, `Found ${allIssueKeys.length} issues. Scanning changelogs & comments...`);

    // Collect raw events
    const rawEvents: RawEvent[] = [];
    
    // For each issue: fetch changelog, then fetch comments
    for (let i = 0; i < allIssueKeys.length; i++) {
      if (signal?.aborted) break;
      const key = allIssueKeys[i];
      const summary = issueMap.get(key) || key;
      
      try {
        // --- Step 2: Fetch changelog ---
        onProgress?.(i * 2 + 1, totalSteps, `[${i + 1}/${allIssueKeys.length}] Changelog: ${key}`);
        
        const statusChangeDates: Array<{ date: string; statusChange: string }> = [];
        let changelogStartAt = 0;
        
        while (!signal?.aborted) {
          const historyData = await jiraService.getIssueChangelog(config, key, changelogStartAt, signal);
          const values = historyData.values || [];
          
          for (const history of values) {
            const author = (history.author || {}).displayName || '';
            if (author !== authorName) continue;

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

        // Skip comment fetch if no status changes found or aborted
        if (statusChangeDates.length === 0 || signal?.aborted) {
          if (i < allIssueKeys.length - 1 && !signal?.aborted) await delay(THROTTLE_MS, signal);
          continue;
        }

        // --- Step 3: Fetch latest comment for this issue ---
        onProgress?.(i * 2 + 2, totalSteps, `[${i + 1}/${allIssueKeys.length}] Comments: ${key}`);
        await delay(THROTTLE_MS, signal);

        // Build a map: date -> latest comment text (by author, on that date)
        const commentsByDate = new Map<string, string>();
        let globalLatestComment = '';
        const commentsData = await jiraService.getIssueComments(config, key, 0, signal);
        const comments = commentsData.comments || []; // ordered -created (newest first)
        
        for (const c of comments) {
          const cAuthor = (c.author || {}).displayName || '';
          const cDate = parseISO(c.created);
          const cDateKey = format(cDate, 'yyyy-MM-dd');
          const text = adfToPlainText(c.body);
          if (!text) continue;

          // Track the globally latest comment by the author
          if (cAuthor === authorName && !globalLatestComment) {
            globalLatestComment = text;
          }

          // For each date, keep the latest comment (first encountered = newest due to -created order)
          if (cAuthor === authorName && !commentsByDate.has(cDateKey)) {
            commentsByDate.set(cDateKey, text);
          }
        }

        // Fallback: use the latest comment by anyone
        if (!globalLatestComment && comments.length > 0) {
          globalLatestComment = adfToPlainText(comments[0].body);
        }

        // Build raw events — match comment to the specific date of each status change
        for (const sc of statusChangeDates) {
          const dateComment = commentsByDate.get(sc.date) || globalLatestComment || summary;
          rawEvents.push({
            issueKey: key,
            date: sc.date,
            summary,
            comment: dateComment,
            statusChange: sc.statusChange,
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn(`Error processing ${key}, skipping:`, err);
        } else {
          break; // Stop processing issues on abort
        }
      }

      if (i < allIssueKeys.length - 1 && !signal?.aborted) await delay(THROTTLE_MS, signal);
    }

    // Step 4 — Smart Report: merge transitions + distribute time
    const finalMsg = signal?.aborted ? 'Scan stopped. Processing partial results...' : 'Building smart report...';
    onProgress?.(totalSteps, totalSteps, finalMsg);

    const dailyHours = parseTimeToHours(defaultTime);

    // 4a. Group by issueKey+date → merge all transitions into one entry
    const merged = new Map<string, { issueKey: string; date: string; comment: string; transitions: string[] }>();
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
          comment: ev.comment,
          transitions: [ev.statusChange],
        });
      }
    }

    // 4b. Group merged entries by date for time distribution
    const byDate = new Map<string, Array<{ issueKey: string; date: string; comment: string; transitions: string[] }>>();
    for (const entry of merged.values()) {
      const list = byDate.get(entry.date) || [];
      list.push(entry);
      byDate.set(entry.date, list);
    }

    // 4c. Build final entries with distributed time + combined comment
    const entries: WorklogEntry[] = [];
    for (const [date, ticketsOnDay] of byDate) {
      const hoursPerTicket = dailyHours / ticketsOnDay.length;
      const timeSpent = hoursToJiraTime(hoursPerTicket);

      for (const ticket of ticketsOnDay) {
        // Build comment: [comment text] | Status: A → B, B → C
        const transitionText = ticket.transitions.join(', ');
        const commentParts = [];
        if (ticket.comment) commentParts.push(ticket.comment);
        commentParts.push(`Status: ${transitionText}`);
        const finalComment = commentParts.join(' | ');

        entries.push({
          id: crypto.randomUUID(),
          issueKey: ticket.issueKey,
          date,
          timeSpent,
          comment: finalComment,
          status: 'ready',
          originalRowIndex: entries.length,
        });
      }
    }

    // Sort by date ascending, then by issue key
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.issueKey.localeCompare(b.issueKey));

    onProgress?.(totalSteps, totalSteps, `Done! ${entries.length} worklogs across ${byDate.size} days.`);
    return entries;
  }
};

/** Parse Jira time notation to decimal hours */
function parseTimeToHours(time: string): number {
  const hMatch = time.match(/(\d+)h/);
  const mMatch = time.match(/(\d+)m/);
  const hours = hMatch ? parseInt(hMatch[1]) : 0;
  const minutes = mMatch ? parseInt(mMatch[1]) : 0;
  return hours + minutes / 60 || 8;
}
