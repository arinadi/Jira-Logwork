import { describe, it, expect } from 'vitest';
import { loadAllowedComponents, loadDailyTarget, loadLeaveTickets, loadReadHrms, saveLeaveTickets, loadTheme, loadWorkingStatuses, saveReadHrms, parseAllowedComponents, saveAllowedComponents, saveDailyTarget, saveTheme, saveWorkingStatuses } from './preferences';

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

describe('daily target', () => {
  it('defaults to 8h and keeps a saved valid target', () => {
    const storage = memoryStorage();
    expect(loadDailyTarget(storage)).toBe('8h');

    expect(saveDailyTarget(storage, '7h 30m')).toBe(true);
    expect(loadDailyTarget(storage)).toBe('7h 30m');
  });

  it.each(['', 'abc', '0h', '25h'])('rejects an invalid target (%s) and keeps the old one', target => {
    const storage = memoryStorage();
    saveDailyTarget(storage, '6h');

    expect(saveDailyTarget(storage, target)).toBe(false);
    expect(loadDailyTarget(storage)).toBe('6h');
  });
});

describe('theme', () => {
  it('follows the system setting until the user picks a theme, then keeps that choice', () => {
    const storage = memoryStorage();
    expect(loadTheme(storage, true)).toBe('dark');
    expect(loadTheme(storage, false)).toBe('light');

    saveTheme(storage, 'light');

    expect(loadTheme(storage, true)).toBe('light');
  });
});

describe('allowed components', () => {
  it('reads a comma list: trimmed, empty parts dropped, duplicates (any case) removed', () => {
    expect(parseAllowedComponents(' DES-Systems, Anoman ,, des-systems ')).toEqual(['DES-Systems', 'Anoman']);
    expect(parseAllowedComponents('  ')).toEqual([]);
  });

  it('is empty (all allowed) until saved, then keeps the saved list', () => {
    const storage = memoryStorage();
    expect(loadAllowedComponents(storage)).toEqual([]);

    saveAllowedComponents(storage, 'DES-Systems, Anoman');

    expect(loadAllowedComponents(storage)).toEqual(['DES-Systems', 'Anoman']);
  });
});

describe('working statuses', () => {
  it('is empty (Jira In Progress category) until saved, then keeps the cleaned list', () => {
    const storage = memoryStorage();
    expect(loadWorkingStatuses(storage)).toEqual([]);

    saveWorkingStatuses(storage, 'In Progress, Pending Customer Confirmation, in progress');

    expect(loadWorkingStatuses(storage)).toEqual(['In Progress', 'Pending Customer Confirmation']);
  });
});

describe('read leave from HRMS', () => {
  it('is on by default and remembers when it is switched off', () => {
    const storage = memoryStorage();
    expect(loadReadHrms(storage)).toBe(true);

    saveReadHrms(storage, false);

    expect(loadReadHrms(storage)).toBe(false);
  });
});

describe('leave tickets', () => {
  it('are empty (feature off) until set, and are saved trimmed and upper-case', () => {
    const storage = memoryStorage();
    expect(loadLeaveTickets(storage)).toEqual({ annual: '', sick: '' });

    saveLeaveTickets(storage, { annual: ' desp-36823 ', sick: '' });

    expect(loadLeaveTickets(storage)).toEqual({ annual: 'DESP-36823', sick: '' });
  });
});

