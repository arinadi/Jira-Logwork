import { describe, it, expect, vi, afterEach } from 'vitest';
import { createComponentGuard } from './componentGuard';

const config = { domain: 'acme.atlassian.net' };
afterEach(() => { vi.unstubAllGlobals(); });

/** Jira answering GET /issue/{key}?fields=components */
function fakeIssues(components: Record<string, string[]>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const key = url.pathname.split('/').pop() || '';
    return new Response(JSON.stringify({ key, fields: { components: (components[key] || []).map(name => ({ name })) } }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createComponentGuard', () => {
  it('allows an issue with an allowed component (any case) and refuses one without', async () => {
    fakeIssues({ 'A-1': ['DES-Systems', 'Saiweb'], 'B-1': ['Other'] });
    const check = createComponentGuard(config, ['des-systems', 'Anoman']);

    expect(await check('A-1')).toEqual({ allowed: true, components: ['DES-Systems', 'Saiweb'] });
    expect(await check('B-1')).toEqual({ allowed: false, components: ['Other'] });
  });

  it('asks Jira once per issue, and not at all when every component is allowed', async () => {
    const fetchMock = fakeIssues({ 'A-1': ['Anoman'] });

    const check = createComponentGuard(config, ['Anoman']);
    await check('A-1');
    await check('A-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(await createComponentGuard(config, [])('A-1')).toEqual({ allowed: true, components: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lets leave tickets through without asking Jira, whatever their component', async () => {
    const fetchMock = fakeIssues({ 'HR-1': ['HR'] });

    const check = createComponentGuard(config, ['DES-Systems'], ['HR-1']);

    expect((await check('HR-1')).allowed).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

