import { describe, it, expect } from 'vitest';
import { loadDailyTarget, loadTheme, saveDailyTarget, saveTheme } from './preferences';

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
