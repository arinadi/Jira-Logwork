import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchHrmsLeave, HRMS_LEAVE_URL } from './hrms';

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
});
