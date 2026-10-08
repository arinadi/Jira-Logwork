import { describe, it, expect } from 'vitest';
import { AUTH_STORAGE_KEY, loadSavedConfig } from './authStorage';

/** In-memory stand-in for window.localStorage. */
function memoryStorage(initial: Record<string, string>): Storage {
  const items = new Map(Object.entries(initial));
  return {
    get length() { return items.size; },
    clear: () => items.clear(),
    getItem: k => items.get(k) ?? null,
    key: i => Array.from(items.keys())[i] ?? null,
    removeItem: k => { items.delete(k); },
    setItem: (k, v) => { items.set(k, String(v)); },
  };
}

describe('loadSavedConfig', () => {
  it('keeps only the domain from an older saved config and deletes the stored token', () => {
    const storage = memoryStorage({
      [AUTH_STORAGE_KEY]: JSON.stringify({ domain: 'acme.atlassian.net', email: 'me@acme.test', apiToken: 'secret-token' }),
    });

    const config = loadSavedConfig(storage);

    expect(config).toEqual({ domain: 'acme.atlassian.net' });
    expect(storage.getItem(AUTH_STORAGE_KEY)).not.toContain('secret-token');
    expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY) || '{}')).toEqual({ domain: 'acme.atlassian.net' });
  });
});
