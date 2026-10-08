import type { AuthConfig } from '../types/auth';
import { toADF } from '../utils/adf';

const JIRA_CLOUD_DOMAIN = /^[a-z0-9][a-z0-9-]*\.atlassian\.net$/i;

export const jiraService = {
  async testConnection(config: AuthConfig): Promise<boolean> {
    try {
      const response = await this.apiFetch(config, '/rest/api/3/myself');
      return response.ok;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  },

  /**
   * Fetches the current user profile
   */
  async getCurrentUser(config: AuthConfig, signal?: AbortSignal) {
    const response = await this.apiFetch(config, '/rest/api/3/myself', { signal });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  /**
   * Performs a paginated JQL search.
   * /search/jql has no startAt: pass the nextPageToken of the previous page, until isLast.
   */
  async searchIssues(config: AuthConfig, jql: string, nextPageToken?: string, signal?: AbortSignal) {
    const queryParams = new URLSearchParams({
      jql,
      fields: 'key,summary,components,status,assignee',
      maxResults: '100',
    });
    if (nextPageToken) queryParams.set('nextPageToken', nextPageToken);
    const response = await this.apiFetch(config, `/rest/api/3/search/jql?${queryParams.toString()}`, { signal });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JQL search failed (${response.status}): ${errorText}`);
    }
    return response.json();
  },

  /**
   * Fetches paginated changelog for a specific issue
   */
  async getIssueChangelog(config: AuthConfig, issueKey: string, startAt = 0, signal?: AbortSignal) {
    const response = await this.apiFetch(config, `/rest/api/3/issue/${issueKey}/changelog?startAt=${startAt}&maxResults=100`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch changelog for ${issueKey}`);
    return response.json();
  },

  /**
   * Fetches one page of changelogs (only the given fields) for up to 1000 issues at once, oldest first.
   * The response is keyed by issue ID, not key.
   */
  async bulkFetchChangelogs(config: AuthConfig, issueIdsOrKeys: string[], fieldIds: string[], nextPageToken?: string, signal?: AbortSignal) {
    const response = await this.apiFetch(config, '/rest/api/3/changelog/bulkfetch', {
      method: 'POST',
      body: JSON.stringify({ issueIdsOrKeys, fieldIds, maxResults: 1000, ...(nextPageToken ? { nextPageToken } : {}) }),
      signal,
    });
    if (!response.ok) throw new Error(`Bulk changelog fetch failed (${response.status})`);
    return response.json();
  },

  /**
   * Fetches one page of comments for an issue, newest first
   */
  async getIssueComments(config: AuthConfig, issueKey: string, startAt = 0, signal?: AbortSignal) {
    const response = await this.apiFetch(config, `/rest/api/3/issue/${issueKey}/comment?startAt=${startAt}&maxResults=100&orderBy=-created`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch comments for ${issueKey}`);
    return response.json();
  },

  /**
   * Fetches one page of worklogs for an issue, started within [startedAfter, startedBefore] (epoch ms)
   */
  async getIssueWorklogs(
    config: AuthConfig,
    issueKey: string,
    range: { startAt: number; startedAfter: number; startedBefore: number },
    signal?: AbortSignal
  ) {
    const queryParams = new URLSearchParams({
      startAt: String(range.startAt),
      startedAfter: String(range.startedAfter),
      startedBefore: String(range.startedBefore),
    });
    const response = await this.apiFetch(config, `/rest/api/3/issue/${issueKey}/worklog?${queryParams.toString()}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch worklogs for ${issueKey}`);
    return response.json();
  },

  /** Every status of the site with its category key ('new' | 'indeterminate' | 'done') */
  async getStatuses(config: AuthConfig, signal?: AbortSignal): Promise<Array<{ id: string; name: string; category: string }>> {
    const response = await this.apiFetch(config, '/rest/api/3/status', { signal });
    if (!response.ok) throw new Error(`Could not read statuses (${response.status})`);
    const statuses = await response.json();
    return statuses.map((s: { id: string; name: string; statusCategory?: { key?: string } }) => ({
      id: String(s.id), name: s.name, category: s.statusCategory?.key || 'new',
    }));
  },

  /** Component names of one issue */
  async getIssueComponents(config: AuthConfig, issueKey: string): Promise<string[]> {
    const response = await this.apiFetch(config, `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=components`);
    if (!response.ok) throw new Error(`Could not read components of ${issueKey} (${response.status})`);
    const issue = await response.json();
    return (issue.fields?.components || []).map((c: { name?: string }) => c.name || '').filter(Boolean);
  },

  /**
   * Adds a worklog to a specific issue
   */
  async addWorklog(config: AuthConfig, issueKey: string, data: { date: string, timeSpent: string, comment: string }) {
    const started = `${data.date}T09:00:00.000+0000`;
    const body = {
      comment: toADF(data.comment),
      started,
      timeSpent: data.timeSpent,
    };

    return this.apiFetch(config, `/rest/api/3/issue/${issueKey}/worklog`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async apiFetch(config: AuthConfig, path: string, options: RequestInit = {}) {
    // The session cookies go to whatever host is called, and the extension only has permission for
    // *.atlassian.net — so refuse any other host before a request leaves the browser.
    if (!JIRA_CLOUD_DOMAIN.test(config.domain)) {
      throw new Error(`Jira domain must look like <site>.atlassian.net, got "${config.domain}"`);
    }
    const url = `https://${config.domain}${path}`;

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    // Session (cookie) auth on a write needs this opt-out of Jira's XSRF check; it is harmless on reads.
    headers.set('X-Atlassian-Token', 'no-check');

    // The extension's host permission lets this page call Jira directly with the user's Jira login cookies;
    // no token is stored or sent.
    const send = () => fetch(url, { ...options, headers, credentials: 'include' });

    // No fixed delay between calls: wait only when Jira says so (429), as Atlassian's rate-limit guide asks.
    // A 429 means the request was not processed, so retrying is safe even for a POST.
    let response = await send();
    for (let retry = 0; response.status === 429 && retry < MAX_RATE_LIMIT_RETRIES; retry++) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** retry;
      await sleep(waitMs, options.signal ?? undefined);
      response = await send();
    }
    return response;
  }
};

const MAX_RATE_LIMIT_RETRIES = 4;

/** Waits, but stops at once when the scan is cancelled. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
