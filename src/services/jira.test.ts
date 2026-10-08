import { describe, it, expect, vi, afterEach } from 'vitest';
import { jiraService } from './jira';

afterEach(() => { vi.unstubAllGlobals(); });

describe('jiraService.apiFetch', () => {
  it('calls the Jira site directly with the browser session and no Authorization header', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await jiraService.apiFetch({ domain: 'acme.atlassian.net' }, '/rest/api/3/myself');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://acme.atlassian.net/rest/api/3/myself');
    expect(init.credentials).toBe('include');
    const headers = new Headers(init.headers);
    expect(headers.get('X-Atlassian-Token')).toBe('no-check');
    expect(headers.has('Authorization')).toBe(false);
  });

  it.each(['evil.example.com', 'acme.atlassian.net.evil.com', 'acme.atlassian.net/../x', ''])(
    'rejects a non-atlassian.net domain (%s) before any network call',
    async domain => {
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(jiraService.apiFetch({ domain }, '/rest/api/3/myself')).rejects.toThrow(/atlassian\.net/);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
});
