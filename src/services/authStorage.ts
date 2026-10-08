import type { AuthConfig } from '../types/auth';

export const AUTH_STORAGE_KEY = 'jira_logwork_auth';

/**
 * Reads the saved connection settings: only the Jira domain.
 * Older versions also saved email + API token; the token is a secret the extension no longer needs,
 * so it is dropped from storage here, on the first start of this version.
 */
export function loadSavedConfig(storage: Storage): AuthConfig | null {
  const saved = storage.getItem(AUTH_STORAGE_KEY);
  if (!saved) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse saved auth config', e);
    return null;
  }

  const domain = (parsed as { domain?: unknown } | null)?.domain;
  if (typeof domain !== 'string' || !domain) {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
  const config: AuthConfig = { domain };
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(config));
  return config;
}
