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

export const COMPONENTS_STORAGE_KEY = 'jira_logwork_components';

/** "DES-Systems, Anoman" → ['DES-Systems', 'Anoman']. Jira compares component names case-insensitively, so do we. */
export function parseAllowedComponents(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of text.split(',')) {
    const name = part.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

/** Empty list = every component is allowed (no rule set). */
export function loadAllowedComponents(storage: Storage): string[] {
  return parseAllowedComponents(storage.getItem(COMPONENTS_STORAGE_KEY) || '');
}

export function saveAllowedComponents(storage: Storage, text: string): void {
  storage.setItem(COMPONENTS_STORAGE_KEY, parseAllowedComponents(text).join(', '));
}

export const WORKING_STATUSES_STORAGE_KEY = 'jira_logwork_working_statuses';

/** Status names meaning "I am working on it"; empty = Jira's In Progress category. Same comma-list rules. */
export function loadWorkingStatuses(storage: Storage): string[] {
  return parseAllowedComponents(storage.getItem(WORKING_STATUSES_STORAGE_KEY) || '');
}

export function saveWorkingStatuses(storage: Storage, text: string): void {
  storage.setItem(WORKING_STATUSES_STORAGE_KEY, parseAllowedComponents(text).join(', '));
}

export const READ_HRMS_STORAGE_KEY = 'jira_logwork_read_hrms';

/** On unless switched off: without leave data, empty-day suggestions would also fill leave days. */
export function loadReadHrms(storage: Storage): boolean {
  return storage.getItem(READ_HRMS_STORAGE_KEY) !== 'off';
}

export function saveReadHrms(storage: Storage, on: boolean): void {
  storage.setItem(READ_HRMS_STORAGE_KEY, on ? 'on' : 'off');
}
