import { describe, it, expect } from 'vitest';
import { loadWorkspace, saveWorkspace } from './workspaceStorage';
import type { WorklogEntry } from '../types/worklog';

/** In-memory stand-in for window.localStorage. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; },
    clear: () => items.clear(),
    getItem: k => items.get(k) ?? null,
    key: i => Array.from(items.keys())[i] ?? null,
    removeItem: k => { items.delete(k); },
    setItem: (k, v) => { items.set(k, String(v)); },
  };
}

const row = (id: string, status: WorklogEntry['status']): WorklogEntry =>
  ({ id, issueKey: 'A-1', date: '2026-10-06', timeSpent: '1h', comment: `row ${id}`, status, originalRowIndex: 0 });

describe('workspace storage', () => {
  it('restores saved rows after a reload', () => {
    const storage = memoryStorage();
    const rows = [row('1', 'ready'), row('2', 'synced'), { ...row('3', 'failed'), errorMessage: 'Forbidden' }];

    saveWorkspace(storage, rows);

    expect(loadWorkspace(storage)).toEqual(rows);
  });

  it('brings a row that was syncing back as failed, so it is not posted twice by mistake', () => {
    const storage = memoryStorage();
    saveWorkspace(storage, [row('1', 'syncing')]);

    const [restored] = loadWorkspace(storage);

    expect(restored.status).toBe('failed');
    expect(restored.errorMessage).toMatch(/check Jira before retry/i);
  });
});
