import type { AuthConfig } from '../types/auth';
import { toADF } from '../utils/adf';

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
   * Performs a paginated JQL search
   */
  async searchIssues(config: AuthConfig, jql: string, startAt = 0, signal?: AbortSignal) {
    const queryParams = new URLSearchParams({
      jql,
      fields: 'key,summary',
      startAt: String(startAt),
      maxResults: '100',
    });
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
   * Fetches all comments for a specific issue (paginated)
   */
  async getIssueComments(config: AuthConfig, issueKey: string, startAt = 0, signal?: AbortSignal) {
    const response = await this.apiFetch(config, `/rest/api/3/issue/${issueKey}/comment?startAt=${startAt}&maxResults=100&orderBy=-created`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch comments for ${issueKey}`);
    return response.json();
  },

  /**
   * Fetches all worklogs for a specific issue
   */
  async getIssueWorklogs(config: AuthConfig, issueKey: string, signal?: AbortSignal) {
    const response = await this.apiFetch(config, `/rest/api/3/issue/${issueKey}/worklog`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch worklogs for ${issueKey}`);
    return response.json();
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
    const { domain, email, apiToken } = config;
    const url = `/api/jira${path}`;
    const authHeader = btoa(`${email}:${apiToken}`);

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Basic ${authHeader}`);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    headers.set('x-jira-domain', domain);

    return fetch(url, {
      ...options,
      headers,
    });
  }
};
