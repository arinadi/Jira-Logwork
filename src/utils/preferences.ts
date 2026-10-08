import { parseDurationToHours } from './validation';

export const TARGET_STORAGE_KEY = 'jira_logwork_target';
export const DEFAULT_DAILY_TARGET = '8h';

/** A target must be a real Jira duration within one day; anything else would make every day look wrong. */
export function isValidDailyTarget(target: string): boolean {
  const hours = parseDurationToHours(target);
  return hours !== null && hours > 0 && hours <= 24;
}

export function loadDailyTarget(storage: Storage): string {
  const saved = storage.getItem(TARGET_STORAGE_KEY);
  return saved && isValidDailyTarget(saved) ? saved : DEFAULT_DAILY_TARGET;
}

export function saveDailyTarget(storage: Storage, target: string): boolean {
  const clean = target.trim();
  if (!isValidDailyTarget(clean)) return false;
  storage.setItem(TARGET_STORAGE_KEY, clean);
  return true;
}

export const THEME_STORAGE_KEY = 'jira_logwork_theme';
export type Theme = 'light' | 'dark';

/** The user's own choice wins; without one, follow the operating system setting. */
export function loadTheme(storage: Storage, systemPrefersDark: boolean): Theme {
  const saved = storage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return systemPrefersDark ? 'dark' : 'light';
}

export function saveTheme(storage: Storage, theme: Theme): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}
