import type { HrmsLeaveRecord } from '../utils/hrmsLeave';

export const HRMS_LEAVE_URL = 'https://hrms.gameloft.org/ID/leave-record/ajax-get-my-requests';
const PAGE_SIZE = 100;

/**
 * The user's own leave requests from Gameloft HRMS, read with the browser's HRMS login (the extension has host
 * permission for hrms.gameloft.org). A record also carries personal data (birth date, address, …): only the
 * leave fields are kept, so nothing else leaves this function.
 */
export async function fetchHrmsLeave(signal?: AbortSignal): Promise<HrmsLeaveRecord[]> {
  const records: HrmsLeaveRecord[] = [];
  for (let page = 1; ; page++) {
    const body = new URLSearchParams({
      sort: 'full_name', dir: 'asc', startIndex: String((page - 1) * PAGE_SIZE), page: String(page), rowPerPage: String(PAGE_SIZE),
    });
    const response = await fetch(HRMS_LEAVE_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: body.toString(),
      signal,
    });
    if (!response.ok) throw new Error(`HRMS answered ${response.status}`);

    // HRMS sends JSON as text/html; without a session it sends its sign-in page instead.
    const text = await response.text();
    let data: { totalRecords?: number; result?: Array<Record<string, unknown>> };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('HRMS sent no data: log in to HRMS (hrms.gameloft.org) in this browser, then scan again.');
    }

    const rows = data.result || [];
    for (const r of rows) {
      records.push({
        from_date: String(r.from_date), to_date: String(r.to_date),
        from_time: String(r.from_time), to_time: String(r.to_time),
        leave_type: String(r.leave_type), status: String(r.status),
        date_of_cancellation: r.date_of_cancellation ? String(r.date_of_cancellation) : null,
      });
    }
    if (rows.length === 0 || records.length >= (data.totalRecords ?? 0)) return records;
  }
}
