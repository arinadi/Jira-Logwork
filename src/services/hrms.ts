import type { HrmsLeaveRecord } from '../utils/hrmsLeave';

export const HRMS_LEAVE_URL = 'https://hrms.gameloft.org/ID/leave-record/ajax-get-my-requests';
const HRMS_PAGE_URL = 'https://hrms.gameloft.org/ID/leave-record/my-requests';
const PAGE_SIZE = 100;
const NOT_RECOGNISED = 'HRMS did not recognise your login: open hrms.gameloft.org, log in to HRMS, then scan again.';

/**
 * Runs inside the HRMS tab (injected, so it must not use anything from outside its own body). A request from the
 * extension's own page reaches HRMS without the login (it answers an empty list); from the HRMS page it is the
 * same request the page itself makes.
 */
async function postFromHrmsPage(url: string, body: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  });
  return { status: response.status, text: await response.text() };
}

const isHrmsUrl = (url?: string) => !!url && url.startsWith('https://hrms.gameloft.org/');

/** Waits for a tab to finish loading, using Chrome's own event (no polling, no fixed delay). */
function waitForLoad(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    const onUpdated = (id: number, info: { status?: string }) => {
      if (id !== tabId || info.status !== 'complete') return;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.get(tabId).then(resolve, reject);
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    // It may have finished before the listener was added.
    chrome.tabs.get(tabId).then(tab => {
      if (tab.status !== 'complete') return;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(tab);
    }, reject);
  });
}

/**
 * The user's own leave requests from Gameloft HRMS. A record also carries personal data (birth date, address, …):
 * only the leave fields are kept, so nothing else leaves this function.
 */
export async function fetchHrmsLeave(signal?: AbortSignal): Promise<HrmsLeaveRecord[]> {
  const [openTab] = await chrome.tabs.query({ url: 'https://hrms.gameloft.org/*' });
  let tabId = openTab?.id;
  let openedHere = false;

  try {
    if (tabId === undefined) {
      // A background tab, so the user's current tab stays in front; it is closed again below.
      const created = await chrome.tabs.create({ url: HRMS_PAGE_URL, active: false });
      tabId = created.id;
      openedHere = true;
      if (tabId === undefined) throw new Error('Could not open an HRMS tab');
      const loaded = await waitForLoad(tabId);
      // Without a session HRMS sends the browser to the Microsoft sign-in page.
      if (!isHrmsUrl(loaded.url)) throw new Error(NOT_RECOGNISED);
    }

    const records: HrmsLeaveRecord[] = [];
    for (let page = 1; ; page++) {
      signal?.throwIfAborted();
      const body = new URLSearchParams({
        sort: 'full_name', dir: 'asc', startIndex: String((page - 1) * PAGE_SIZE), page: String(page), rowPerPage: String(PAGE_SIZE),
      }).toString();
      const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: postFromHrmsPage, args: [HRMS_LEAVE_URL, body] });
      const answer = injection?.result;
      if (!answer) throw new Error('HRMS tab gave no answer');
      if (answer.status !== 200) throw new Error(`HRMS answered ${answer.status}`);

      // HRMS sends JSON as text/html; the sign-in page is not JSON, and an unknown session gets a list with no total.
      let data: { totalRecords?: number; result?: Array<Record<string, unknown>> };
      try {
        data = JSON.parse(answer.text);
      } catch {
        throw new Error(NOT_RECOGNISED);
      }
      if (typeof data.totalRecords !== 'number') throw new Error(NOT_RECOGNISED);

      const rows = data.result || [];
      for (const r of rows) {
        records.push({
          from_date: String(r.from_date), to_date: String(r.to_date),
          from_time: String(r.from_time), to_time: String(r.to_time),
          leave_type: String(r.leave_type), status: String(r.status),
          date_of_cancellation: r.date_of_cancellation ? String(r.date_of_cancellation) : null,
        });
      }
      if (rows.length === 0 || records.length >= data.totalRecords) return records;
    }
  } finally {
    if (openedHere && tabId !== undefined) await chrome.tabs.remove(tabId);
  }
}
