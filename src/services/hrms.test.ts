import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fetchHrmsLeave, HRMS_LEAVE_URL } from './hrms';

const HRMS_PAGE = 'https://hrms.gameloft.org/ID/leave-record/my-requests';

/**
 * Stands in for the Chrome tabs + scripting APIs (they exist only inside the extension). executeScript runs the
 * injected function right here, so its fetch goes to the stubbed global fetch like it would in the HRMS tab.
 */
function stubChrome({ hrmsTabOpen = true, backgroundTabUrl = HRMS_PAGE } = {}) {
  const created: { url?: string; active?: boolean }[] = [];
  const removed: number[] = [];
  const injectedInto: number[] = [];
  const listeners: Array<(tabId: number, info: { status?: string }) => void> = [];
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn(async () => (hrmsTabOpen ? [{ id: 7, status: 'complete', url: HRMS_PAGE }] : [])),
      create: vi.fn(async (props: { url?: string; active?: boolean }) => {
        created.push(props);
        setTimeout(() => listeners.forEach(l => l(9, { status: 'complete' })), 0);
        return { id: 9, status: 'loading', url: '' };
      }),
      get: vi.fn(async (id: number) => ({ id, status: id === 9 && created.length > 0 ? 'complete' : 'loading', url: id === 9 ? backgroundTabUrl : HRMS_PAGE })),
      remove: vi.fn(async (id: number) => { removed.push(id); }),
      onUpdated: {
        addListener: (l: (tabId: number, info: { status?: string }) => void) => listeners.push(l),
        removeListener: (l: (tabId: number, info: { status?: string }) => void) => listeners.splice(listeners.indexOf(l), 1),
      },
    },
    scripting: {
      executeScript: vi.fn(async ({ target, func, args }: { target: { tabId: number }; func: (...a: unknown[]) => unknown; args: unknown[] }) => {
        injectedInto.push(target.tabId);
        return [{ result: await func(...args) }];
      }),
    },
  });
  return { created, removed, injectedInto };
}

beforeEach(() => { stubChrome(); });
afterEach(() => { vi.unstubAllGlobals(); });

const record = (n: number) => ({
  data_id: n, full_name: 'xxx', birth_date: 'xxx',
  from_date: '2026-09-07', to_date: '2026-09-07', from_time: '08:00:00', to_time: '12:00:00',
  leave_type: 'Annual leave', status: 'Approved', date_of_cancellation: null,
});

describe('fetchHrmsLeave', () => {
  it('reads every page of my leave requests with the HRMS login and keeps only the leave fields', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const page = Number(new URLSearchParams(String(init.body)).get('page'));
      const rows = page === 1 ? Array.from({ length: 100 }, (_, i) => record(i)) : Array.from({ length: 50 }, (_, i) => record(100 + i));
      // HRMS answers JSON with a text/html content type.
      return new Response(JSON.stringify({ recordsReturned: rows.length, totalRecords: 150, result: rows }), { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
    }));

    const records = await fetchHrmsLeave();

    expect(records).toHaveLength(150);
    expect(Object.keys(records[0]).sort()).toEqual(['date_of_cancellation', 'from_date', 'from_time', 'leave_type', 'status', 'to_date', 'to_time']);
    expect(calls.map(c => c.url)).toEqual([HRMS_LEAVE_URL, HRMS_LEAVE_URL]);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.credentials).toBe('include');
    expect(new URLSearchParams(String(calls[1].init.body)).get('startIndex')).toBe('100');
  });

  it('says to log in when HRMS answers with its login page instead of data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><title>Sign in to your account</title></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })));

    await expect(fetchHrmsLeave()).rejects.toThrow(/log in to HRMS/i);
  });

  it('says HRMS did not recognise the login when the answer has no totalRecords', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ result: [], message: 'xxx' }), { status: 200 })));

    await expect(fetchHrmsLeave()).rejects.toThrow(/did not recognise your login/i);
  });

  const oneRecordPage = () => vi.fn(async () => new Response(JSON.stringify({ totalRecords: 1, result: [record(1)] }), { status: 200 }));

  it('runs the request inside an open HRMS tab and leaves that tab alone', async () => {
    const chromeApi = stubChrome({ hrmsTabOpen: true });
    vi.stubGlobal('fetch', oneRecordPage());

    expect(await fetchHrmsLeave()).toHaveLength(1);
    expect(chromeApi.injectedInto).toEqual([7]);
    expect(chromeApi.created).toEqual([]);
    expect(chromeApi.removed).toEqual([]);
  });

  it('opens a background HRMS tab when none is open, runs there, then closes it', async () => {
    const chromeApi = stubChrome({ hrmsTabOpen: false });
    vi.stubGlobal('fetch', oneRecordPage());

    expect(await fetchHrmsLeave()).toHaveLength(1);
    expect(chromeApi.created).toEqual([{ url: HRMS_PAGE, active: false }]);
    expect(chromeApi.injectedInto).toEqual([9]);
    expect(chromeApi.removed).toEqual([9]);
  });

  it('asks to log in when the background tab ends on the sign-in page, and still closes it', async () => {
    const chromeApi = stubChrome({ hrmsTabOpen: false, backgroundTabUrl: 'https://login.microsoftonline.com/common/oauth2' });
    vi.stubGlobal('fetch', oneRecordPage());

    await expect(fetchHrmsLeave()).rejects.toThrow(/log in to HRMS/i);
    expect(chromeApi.injectedInto).toEqual([]);
    expect(chromeApi.removed).toEqual([9]);
  });
});

