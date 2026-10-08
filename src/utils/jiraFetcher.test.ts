import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jiraFetcher } from './jiraFetcher';
import type { AuthConfig } from '../types/auth';
import type { WorklogEntry } from '../types/worklog';

const config: AuthConfig = { domain: 'acme.atlassian.net' };
const ME = { accountId: 'acc-me', displayName: 'Same Name' };
const OTHER = { accountId: 'acc-other', displayName: 'Same Name' };

interface FakeComment { author: typeof ME; created: string; text: string }
interface FakeWorklog { author: typeof ME; started: string; timeSpentSeconds: number; text?: string }
interface FakeHistory { author: typeof ME; created: string; from: string; to: string }
type Account = typeof ME;
interface FakeAssigneeChange { created: string; from: Account | null; to: Account | null }

/** Status name → id + category, like GET /rest/api/3/status */
const STATUSES: Record<string, { id: string; category: 'new' | 'indeterminate' | 'done' }> = {
  'Open': { id: '1', category: 'new' },
  'In Progress': { id: '3', category: 'indeterminate' },
  'QA': { id: '10321', category: 'indeterminate' },
  'Review': { id: '10214', category: 'indeterminate' },
  'Pending Customer Confirmation': { id: '10043', category: 'new' },
  'Done': { id: '10068', category: 'done' },
};
const statusId = (name: string) => STATUSES[name]?.id ?? name;
interface FakeIssue {
  key: string;
  summary?: string;
  histories?: FakeHistory[];
  comments?: FakeComment[];
  worklogs?: FakeWorklog[];
  fail?: boolean;
  /** Component names, as returned in search fields */
  components?: string[];
  /** Status now (search field); default 'Open' */
  currentStatus?: string;
  /** Assignee now (search field); default nobody */
  currentAssignee?: Account | null;
  assigneeChanges?: FakeAssigneeChange[];
  /** The first comments call answers 429 with this Retry-After (seconds); later calls succeed. */
  rateLimitOnceSeconds?: number;
}

interface FakeJiraOptions {
  issues: FakeIssue[];
  /** Which issue keys a JQL string returns. Default: all issues. */
  searchByJql?: (jql: string) => string[];
  /** Real Jira may return fewer items than maxResults; force small pages to exercise paging. */
  pageSize?: number;
  /** Each call takes this long (fake timers), so parallel calls overlap and can be counted. */
  latencyMs?: number;
  /** The live bulkfetch may send dates as epoch milliseconds instead of ISO text. */
  bulkCreatedAsEpochMs?: boolean;
}

const adf = (text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

/** Stands in for the Jira Cloud REST API v3 at https://acme.atlassian.net. */
function fakeJira({ issues, searchByJql = () => issues.map(i => i.key), pageSize = 2, latencyMs = 0, bulkCreatedAsEpochMs = false }: FakeJiraOptions) {
  const calls: string[] = [];
  const byKey = new Map(issues.map(i => [i.key, i]));
  const idOf = (key: string) => `10${issues.findIndex(i => i.key === key)}`;
  const byId = new Map(issues.map(i => [idOf(i.key), i]));
  const rateLimited = new Set<string>();
  const load = { inFlight: 0, maxInFlight: 0 };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const handler = async (input: string | URL | Request, init?: RequestInit) => {
    load.inFlight++;
    load.maxInFlight = Math.max(load.maxInFlight, load.inFlight);
    try {
      if (latencyMs > 0) await new Promise(resolve => setTimeout(resolve, latencyMs));
      return route(input, init);
    } finally {
      load.inFlight--;
    }
  };

  const route = (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    if (url.origin !== 'https://acme.atlassian.net') throw new Error(`fakeJira: unexpected host ${url.origin}`);
    const path = url.pathname;
    calls.push(path + url.search);
    if (calls.length > 500) throw new Error('fakeJira: too many calls (endless paging?)');

    if (path === '/rest/api/3/myself') return json(ME);

    if (path === '/rest/api/3/search/jql') {
      // The enhanced search pages only by nextPageToken; startAt is not a parameter of this endpoint.
      const keys = searchByJql(url.searchParams.get('jql') || '');
      const offset = Number(url.searchParams.get('nextPageToken') || '0');
      const page = keys.slice(offset, offset + pageSize);
      const next = offset + pageSize;
      const isLast = next >= keys.length;
      return json({
        issues: page.map(k => ({ id: idOf(k), key: k, fields: {
          summary: byKey.get(k)?.summary || `Summary ${k}`,
          components: (byKey.get(k)?.components || []).map((name, n) => ({ id: String(n), name })),
          status: (() => {
            const name = byKey.get(k)?.currentStatus || 'Open';
            return { id: statusId(name), name, statusCategory: { key: STATUSES[name]?.category ?? 'new' } };
          })(),
          assignee: byKey.get(k)?.currentAssignee ?? null,
        } })),
        isLast,
        ...(isLast ? {} : { nextPageToken: String(next) }),
      });
    }

    if (path === '/rest/api/3/status') {
      return json(Object.entries(STATUSES).map(([name, st]) => ({ id: st.id, name, statusCategory: { key: st.category } })));
    }

    if (path === '/rest/api/3/changelog/bulkfetch' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { issueIdsOrKeys: string[]; fieldIds?: string[]; nextPageToken?: string };
      // Oldest first across issues, as the real endpoint; paged by an opaque cursor.
      const all = body.issueIdsOrKeys
        .map(ref => byKey.get(ref) || byId.get(ref))
        .filter((i): i is FakeIssue => !!i)
        .flatMap(i => [
          ...(i.histories || []).map((h, n) => ({ issueId: idOf(i.key), created: h.created, history: {
            id: `${i.key}-${n}`, author: h.author, created: bulkCreatedAsEpochMs ? Date.parse(h.created) : h.created,
            items: [{ field: 'status', fieldId: 'status', from: statusId(h.from), fromString: h.from, to: statusId(h.to), toString: h.to }],
          } })),
          ...(i.assigneeChanges || []).map((a, n) => ({ issueId: idOf(i.key), created: a.created, history: {
            id: `${i.key}-a${n}`, author: OTHER, created: bulkCreatedAsEpochMs ? Date.parse(a.created) : a.created,
            items: [{ field: 'assignee', fieldId: 'assignee', from: a.from?.accountId ?? null, to: a.to?.accountId ?? null }],
          } })),
        ])
        .filter(h => (body.fieldIds || []).length === 0 || h.history.items.some(it => body.fieldIds!.includes(it.fieldId)))
        .sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
      const offset = Number(body.nextPageToken || '0');
      const page = all.slice(offset, offset + pageSize);
      const byIssue = new Map<string, unknown[]>();
      for (const { issueId, history } of page) byIssue.set(issueId, [...(byIssue.get(issueId) || []), history]);
      const next = offset + pageSize;
      return json({
        issueChangeLogs: Array.from(byIssue, ([issueId, changeHistories]) => ({ issueId, changeHistories })),
        ...(next < all.length ? { nextPageToken: String(next) } : {}),
      });
    }

    const m = path.match(/^\/rest\/api\/3\/issue\/([^/]+)\/(changelog|comment|worklog)$/);
    if (m) {
      const issue = byKey.get(m[1]);
      if (!issue) return json({ errorMessages: ['Issue does not exist'] }, 404);
      if (issue.fail) return json({ errorMessages: ['Rate limited'] }, 429);
      if (m[2] === 'comment' && issue.rateLimitOnceSeconds && !rateLimited.has(issue.key)) {
        rateLimited.add(issue.key);
        return new Response('{}', { status: 429, headers: { 'Retry-After': String(issue.rateLimitOnceSeconds) } });
      }
      const startAt = Number(url.searchParams.get('startAt') || '0');

      if (m[2] === 'changelog') {
        const all = (issue.histories || []).map((h, i) => ({
          id: String(i), author: h.author, created: h.created,
          items: [{ field: 'status', fromString: h.from, toString: h.to }],
        }));
        const values = all.slice(startAt, startAt + pageSize);
        return json({ values, startAt, maxResults: pageSize, total: all.length, isLast: startAt + pageSize >= all.length });
      }

      if (m[2] === 'comment') {
        const all = [...(issue.comments || [])]
          .sort((a, b) => b.created.localeCompare(a.created))
          .map((c, i) => ({ id: String(i), author: c.author, created: c.created, body: adf(c.text) }));
        const comments = all.slice(startAt, startAt + pageSize);
        return json({ comments, startAt, maxResults: pageSize, total: all.length });
      }

      const after = url.searchParams.get('startedAfter');
      const before = url.searchParams.get('startedBefore');
      const all = (issue.worklogs || [])
        .filter(w => (!after || Date.parse(w.started) >= Number(after)) && (!before || Date.parse(w.started) <= Number(before)))
        .map((w, i) => ({
          id: String(i), author: w.author, started: w.started, timeSpentSeconds: w.timeSpentSeconds,
          comment: w.text ? adf(w.text) : undefined,
        }));
      const worklogs = all.slice(startAt, startAt + pageSize);
      return json({ worklogs, startAt, maxResults: pageSize, total: all.length });
    }

    return json({ errorMessages: [`fakeJira: no route for ${path}`] }, 404);
  };

  vi.stubGlobal('fetch', vi.fn(handler));
  return { calls, load };
}

/** Runs a scan to the end while fake timers skip the throttle delays. */
async function scan(params: { jql?: string; startDate: string; endDate: string; defaultTime?: string; allowedComponents?: string[]; nonWorkingDays?: string[]; workingStatuses?: string[]; leaveMinutesByDay?: Record<string, number> }) {
  const pending = jiraFetcher.fetchEvents(config, { jql: params.jql ?? 'project = A', ...params });
  await vi.runAllTimersAsync();
  return pending;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('jiraFetcher.fetchEvents', () => {
  it('reads every search page by nextPageToken until isLast', async () => {
    const keys = ['A-1', 'A-2', 'A-3', 'A-4', 'A-5'];
    fakeJira({
      issues: keys.map(key => ({
        key,
        comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: `work on ${key}` }],
      })),
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries.map(e => e.issueKey).sort()).toEqual(keys);
  });

  it('ignores activity of another user with the same display name', async () => {
    fakeJira({
      issues: [{
        key: 'A-1',
        histories: [{ author: OTHER, created: '2026-10-06T10:00:00.000+0700', from: 'Open', to: 'Done' }],
        comments: [{ author: OTHER, created: '2026-10-06T11:00:00.000+0700', text: 'not mine' }],
        worklogs: [{ author: OTHER, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 3600 }],
      }],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries).toEqual([]);
  });

  it('shows the real logged time on synced rows, also for worklogs on issues outside the JQL', async () => {
    fakeJira({
      issues: [
        { key: 'A-1', worklogs: [{ author: ME, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 2 * 3600 }] },
        { key: 'B-9', worklogs: [{ author: ME, started: '2026-10-06T13:00:00.000+0700', timeSpentSeconds: 5 * 3600 + 30 * 60 }] },
      ],
      searchByJql: jql => (jql.includes('worklogAuthor = currentUser()') ? ['B-9'] : ['A-1']),
    });

    const result = await scan({ jql: 'project = A', startDate: '2026-10-06', endDate: '2026-10-06' });

    const rows = result.entries.map(e => ({ issueKey: e.issueKey, timeSpent: e.timeSpent, status: e.status }));
    expect(rows).toEqual([
      { issueKey: 'A-1', timeSpent: '2h', status: 'synced' },
      { issueKey: 'B-9', timeSpent: '5h 30m', status: 'synced' },
    ]);
  });

  it('splits only the free time of the day over new tickets, and reports full days', async () => {
    fakeJira({
      issues: [
        { key: 'A-1', worklogs: [
          { author: ME, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 6 * 3600 },
          { author: ME, started: '2026-10-07T09:00:00.000+0700', timeSpentSeconds: 8 * 3600 },
        ] },
        { key: 'A-2', comments: [
          { author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'review' },
          { author: ME, created: '2026-10-07T10:00:00.000+0700', text: 'more review' },
        ] },
        { key: 'A-3', comments: [{ author: ME, created: '2026-10-06T11:00:00.000+0700', text: 'fix' }] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-07', defaultTime: '8h' });

    const ready = result.entries.filter(e => e.status === 'ready').map(e => [e.date, e.issueKey, e.timeSpent]);
    expect(ready).toEqual([
      ['2026-10-06', 'A-2', '1h'],
      ['2026-10-06', 'A-3', '1h'],
    ]);
    expect(result.fullDays).toEqual(['2026-10-07']);
  });

  it('makes the new rows of a day add up exactly to the free minutes', async () => {
    const keys = ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7'];
    fakeJira({
      issues: [
        ...keys.map(key => ({ key, comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: key }] })),
        // 5h 0m 30s already logged on the 7th leaves 2h 59m 30s free.
        { key: 'B-1', worklogs: [{ author: ME, started: '2026-10-07T09:00:00.000+0700', timeSpentSeconds: 5 * 3600 + 30 }] },
        { key: 'B-2', comments: [{ author: ME, created: '2026-10-07T10:00:00.000+0700', text: 'b2' }] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-07', defaultTime: '8h' });

    const minutes = (t: string) => {
      const m = t.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
      if (!m || Number(m[2] || 0) >= 60) throw new Error(`not a Jira duration: ${t}`);
      return Number(m[1] || 0) * 60 + Number(m[2] || 0);
    };
    const ready = result.entries.filter(e => e.status === 'ready');
    const day6 = ready.filter(e => e.date === '2026-10-06').map(e => minutes(e.timeSpent));
    expect(day6).toHaveLength(7);
    expect(day6.reduce((a, b) => a + b, 0)).toBe(8 * 60);
    expect(Math.max(...day6) - Math.min(...day6)).toBeLessThanOrEqual(1);
    expect(ready.filter(e => e.date === '2026-10-07').map(e => e.timeSpent)).toEqual(['2h 59m']);
  });

  it('writes the row text from own comment that day, then own transitions, then the summary', async () => {
    fakeJira({
      issues: [
        { key: 'A-1', comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'did X' }] },
        { key: 'A-2',
          histories: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', from: 'Open', to: 'In Progress' }],
          comments: [
            { author: OTHER, created: '2026-10-06T12:00:00.000+0700', text: 'someone else' },
            { author: ME, created: '2026-10-01T12:00:00.000+0700', text: 'old own comment' },
          ] },
        { key: 'A-3', summary: 'Fix login',
          worklogs: [{ author: ME, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 3600 }],
          comments: [{ author: OTHER, created: '2026-10-06T12:00:00.000+0700', text: 'someone else' }] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries.map(e => [e.issueKey, e.comment])).toEqual([
      ['A-1', 'did X'],
      ['A-2', 'Status: Open → In Progress'],
      ['A-3', 'Fix login'],
    ]);
  });

  it('reads every page of comments and worklogs, asking only for worklogs in the range', async () => {
    const othersLater = [1, 2, 3, 4].map(h => ({ author: OTHER, created: `2026-10-07T0${h}:00:00.000+0700`, text: 'later' }));
    const { calls } = fakeJira({
      issues: [
        { key: 'A-1', comments: [...othersLater, { author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'mine' }] },
        { key: 'A-2', worklogs: [
          { author: OTHER, started: '2026-10-06T08:00:00.000+0700', timeSpentSeconds: 600 },
          { author: OTHER, started: '2026-10-06T08:10:00.000+0700', timeSpentSeconds: 600 },
          { author: OTHER, started: '2026-10-06T08:20:00.000+0700', timeSpentSeconds: 600 },
          { author: ME, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 3600 },
        ] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries.map(e => [e.issueKey, e.status, e.comment])).toEqual([
      ['A-1', 'ready', 'mine'],
      ['A-2', 'synced', 'Summary A-2'],
    ]);
    const worklogCalls = calls.filter(c => c.includes('/worklog'));
    expect(worklogCalls.length).toBeGreaterThan(0);
    for (const c of worklogCalls) {
      const q = new URLSearchParams(c.split('?')[1]);
      expect(Number(q.get('startedAfter'))).toBe(Date.parse('2026-10-06T00:00:00+07:00'));
      expect(Number(q.get('startedBefore'))).toBe(Date.parse('2026-10-07T00:00:00+07:00'));
    }
  });

  it('lists issues that failed to load and still returns the rest', async () => {
    fakeJira({
      issues: [
        { key: 'A-1', fail: true },
        { key: 'A-2', comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'ok' }] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.failedIssues).toEqual(['A-1']);
    expect(result.entries.map(e => e.issueKey)).toEqual(['A-2']);
  });

  it('reads status changes of all issues with the bulk changelog call, not one call per issue', async () => {
    const keys = ['A-1', 'A-2', 'A-3'];
    const { calls } = fakeJira({
      issues: keys.map(key => ({
        key,
        histories: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', from: 'Open', to: 'Done' }],
      })),
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries.map(e => [e.issueKey, e.comment])).toEqual(keys.map(k => [k, 'Status: Open → Done']));
    expect(calls.filter(c => c.startsWith('/rest/api/3/changelog/bulkfetch')).length).toBeGreaterThan(0);
    expect(calls.filter(c => /\/issue\/[^/]+\/changelog/.test(c))).toEqual([]);
  });

  it('does not wait between calls when Jira does not ask it to', async () => {
    fakeJira({
      issues: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5'].map(key => ({
        key,
        comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: key }],
      })),
    });
    const before = Date.now();

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries).toHaveLength(5);
    expect(Date.now() - before).toBe(0);
  });

  it('waits Retry-After seconds and retries when Jira answers 429', async () => {
    fakeJira({
      issues: [{
        key: 'A-1',
        rateLimitOnceSeconds: 3,
        comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'after retry' }],
      }],
    });
    const before = Date.now();

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.failedIssues).toEqual([]);
    expect(result.entries.map(e => e.comment)).toEqual(['after retry']);
    expect(Date.now() - before).toBe(3000);
  });

  it('gives up after repeated 429 and lists the issue as failed', async () => {
    fakeJira({ issues: [{ key: 'A-1', fail: true }, { key: 'A-2', comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'ok' }] }] });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.failedIssues).toEqual(['A-1']);
    expect(result.entries.map(e => e.issueKey)).toEqual(['A-2']);
  });

  it('fetches comments and worklogs for several issues at once, at most 5 calls in flight', async () => {
    const keys = Array.from({ length: 12 }, (_, i) => `A-${i + 1}`);
    const { load } = fakeJira({
      latencyMs: 100,
      issues: keys.map(key => ({ key, comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: key }] })),
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries).toHaveLength(12);
    expect(load.maxInFlight).toBeGreaterThan(1);
    expect(load.maxInFlight).toBeLessThanOrEqual(5);
  });

  it('reads bulk changelog dates sent as epoch milliseconds', async () => {
    fakeJira({
      bulkCreatedAsEpochMs: true,
      issues: [{ key: 'A-1', histories: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', from: 'Open', to: 'Done' }] }],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06' });

    expect(result.entries.map(e => [e.issueKey, e.date, e.comment])).toEqual([['A-1', '2026-10-06', 'Status: Open → Done']]);
  });

  it('makes new rows only on issues with an allowed component, but still counts and shows time logged elsewhere', async () => {
    fakeJira({
      issues: [
        { key: 'A-1', components: ['DES-Systems'], comments: [{ author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'allowed work' }] },
        { key: 'B-1', components: ['Other'], worklogs: [{ author: ME, started: '2026-10-06T09:00:00.000+0700', timeSpentSeconds: 3 * 3600 }] },
        { key: 'C-1', components: [], comments: [{ author: ME, created: '2026-10-06T11:00:00.000+0700', text: 'not allowed' }] },
      ],
    });

    const result = await scan({ startDate: '2026-10-06', endDate: '2026-10-06', allowedComponents: ['des-systems', 'Anoman'] });

    expect(result.entries.map(e => [e.issueKey, e.status, e.timeSpent])).toEqual([
      ['A-1', 'ready', '5h'],
      ['B-1', 'synced', '3h'],
    ]);
    expect(result.outsideComponents).toEqual(['C-1']);
  });

  describe('empty working days', () => {
    /** Active on Mon 05 and Thu 08 Oct, nothing on Tue 06 / Wed 07. */
    const activeMonThu = (key = 'A-1'): FakeIssue => ({
      key,
      comments: [
        { author: ME, created: '2026-10-05T10:00:00.000+0700', text: 'monday work' },
        { author: ME, created: '2026-10-08T10:00:00.000+0700', text: 'thursday work' },
      ],
    });
    const rowsOn = (entries: WorklogEntry[], date: string) =>
      entries.filter(e => e.date === date).map(e => [e.issueKey, e.timeSpent, e.suggestion, e.comment]);

    it('fills an empty working day with tickets assigned to me and in a working status that day', async () => {
      fakeJira({
        issues: [
          activeMonThu(),
          {
            key: 'X-1', summary: 'Build exporter', currentStatus: 'In Progress', currentAssignee: ME,
            assigneeChanges: [{ created: '2026-10-01T09:00:00.000+0700', from: null, to: ME }],
            histories: [{ author: OTHER, created: '2026-10-02T09:00:00.000+0700', from: 'Open', to: 'In Progress' }],
          },
        ],
      });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-08' });

      expect(rowsOn(result.entries, '2026-10-06')).toEqual([['X-1', '8h', 'in-progress', 'In progress: Build exporter']]);
      expect(rowsOn(result.entries, '2026-10-07')).toEqual([['X-1', '8h', 'in-progress', 'In progress: Build exporter']]);
      expect(result.entries.filter(e => e.date === '2026-10-05').every(e => e.suggestion === undefined)).toBe(true);
    });

    it('does not count a ticket that was only waiting (To Do category) that day', async () => {
      fakeJira({
        issues: [
          activeMonThu(),
          {
            key: 'X-1', currentStatus: 'Pending Customer Confirmation', currentAssignee: ME,
            assigneeChanges: [{ created: '2026-10-01T09:00:00.000+0700', from: null, to: ME }],
            histories: [{ author: OTHER, created: '2026-10-02T09:00:00.000+0700', from: 'In Progress', to: 'Pending Customer Confirmation' }],
          },
        ],
      });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-08' });

      expect(result.entries.filter(e => e.suggestion === 'in-progress')).toEqual([]);
    });

    it('does not count a ticket that someone else had that day, but counts it from the day it came to me', async () => {
      fakeJira({
        issues: [
          activeMonThu(),
          {
            key: 'X-1', summary: 'Shared ticket', currentStatus: 'In Progress', currentAssignee: ME,
            // Someone else's until Wed 07 14:00, then mine.
            assigneeChanges: [
              { created: '2026-10-01T09:00:00.000+0700', from: null, to: OTHER },
              { created: '2026-10-07T14:00:00.000+0700', from: OTHER, to: ME },
            ],
            histories: [{ author: OTHER, created: '2026-10-02T09:00:00.000+0700', from: 'Open', to: 'In Progress' }],
          },
        ],
      });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-08' });

      expect(result.entries.filter(e => e.suggestion === 'in-progress').map(e => e.date)).toEqual(['2026-10-07']);
    });

    /** Only Mon 05 Oct is active: A-1 and A-2 have own comments that day. */
    const activeMondayOnly = (): FakeIssue[] => [
      { key: 'A-1', comments: [{ author: ME, created: '2026-10-05T10:00:00.000+0700', text: 'monday one' }] },
      { key: 'A-2', comments: [{ author: ME, created: '2026-10-05T11:00:00.000+0700', text: 'monday two' }] },
    ];

    it('carries the tickets of the last active day over to following empty working days', async () => {
      fakeJira({ issues: activeMondayOnly() });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-07' });

      for (const date of ['2026-10-06', '2026-10-07']) {
        expect(rowsOn(result.entries, date)).toEqual([
          ['A-1', '4h', 'carry-over', 'Continued: monday one'],
          ['A-2', '4h', 'carry-over', 'Continued: monday two'],
        ]);
      }
    });

    it('carries over for at most 5 working days, skipping weekends and holidays', async () => {
      fakeJira({ issues: activeMondayOnly() });

      // Mon 05 active; Wed 07 holiday; Sat 10 / Sun 11 weekend.
      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-14', nonWorkingDays: ['2026-10-07'] });

      const carried = Array.from(new Set(result.entries.filter(e => e.suggestion === 'carry-over').map(e => e.date)));
      expect(carried).toEqual(['2026-10-06', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13']);
    });

    it('uses the configured working statuses instead of the In Progress category', async () => {
      fakeJira({
        issues: [
          activeMonThu(),
          {
            key: 'X-1', summary: 'Waiting on customer', currentStatus: 'Pending Customer Confirmation', currentAssignee: ME,
            assigneeChanges: [{ created: '2026-10-01T09:00:00.000+0700', from: null, to: ME }],
          },
          {
            key: 'X-2', currentStatus: 'In Progress', currentAssignee: ME,
            assigneeChanges: [{ created: '2026-10-01T09:00:00.000+0700', from: null, to: ME }],
          },
        ],
      });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-08', workingStatuses: ['pending customer confirmation'] });

      expect(rowsOn(result.entries, '2026-10-06')).toEqual([['X-1', '8h', 'in-progress', 'In progress: Waiting on customer']]);
    });
  });

  describe('leave', () => {
    it('lowers the target on a half leave day and makes no rows or suggestions on a full leave day', async () => {
      fakeJira({
        issues: [{ key: 'A-1', comments: [
          { author: ME, created: '2026-10-05T10:00:00.000+0700', text: 'monday' },
          { author: ME, created: '2026-10-06T10:00:00.000+0700', text: 'tuesday' },
          { author: ME, created: '2026-10-07T10:00:00.000+0700', text: 'answered a question while on leave' },
        ] }],
      });

      const result = await scan({
        startDate: '2026-10-05', endDate: '2026-10-08',
        leaveMinutesByDay: { '2026-10-05': 240, '2026-10-07': 480, '2026-10-08': 480, '2026-09-01': 480 },
      });

      expect(result.entries.map(e => [e.date, e.issueKey, e.timeSpent, e.suggestion])).toEqual([
        ['2026-10-05', 'A-1', '4h', undefined],
        ['2026-10-06', 'A-1', '8h', undefined],
      ]);
      expect(result.fullDays).toEqual([]);
      expect(result.leaveByDay).toEqual({ '2026-10-05': 240, '2026-10-07': 480, '2026-10-08': 480 });
    });

    it('suggests only the hours left after a half day of leave', async () => {
      fakeJira({
        issues: [
          { key: 'A-1', comments: [{ author: ME, created: '2026-10-05T10:00:00.000+0700', text: 'monday' }] },
          {
            key: 'X-1', currentStatus: 'In Progress', currentAssignee: ME,
            assigneeChanges: [{ created: '2026-10-01T09:00:00.000+0700', from: null, to: ME }],
          },
        ],
      });

      const result = await scan({ startDate: '2026-10-05', endDate: '2026-10-06', leaveMinutesByDay: { '2026-10-06': 240 } });

      expect(result.entries.filter(e => e.date === '2026-10-06').map(e => [e.issueKey, e.timeSpent, e.suggestion]))
        .toEqual([['X-1', '4h', 'in-progress']]);
    });
  });
});

