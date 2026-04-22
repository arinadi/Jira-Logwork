import { parseISO, isValid } from 'date-fns';
import type { WorklogEntry } from '../types/worklog';

const JIRA_KEY_REGEX = /^[A-Z][A-Z0-9]*-[0-9]+$/i;

export interface ValidationError {
  issueKey?: string;
  date?: string;
  timeSpent?: string;
}

export const validateEntry = (entry: WorklogEntry): ValidationError => {
  const errors: ValidationError = {};

  if (!entry.issueKey || !JIRA_KEY_REGEX.test(entry.issueKey)) {
    errors.issueKey = 'Invalid Jira Issue Key (e.g., DESP-123)';
  }

  if (!entry.date || !isValid(parseISO(entry.date))) {
    errors.date = 'Invalid Date format (YYYY-MM-DD)';
  }

  if (!entry.timeSpent || !parseDurationToHours(entry.timeSpent)) {
    errors.timeSpent = 'Invalid duration (e.g., 8h, 30m, 1.5h)';
  }

  return errors;
};

/**
 * Parses duration strings like "8h", "30m", "1.5h", or "2h 40m" into decimal hours.
 */
export const parseDurationToHours = (duration: string): number | null => {
  if (!duration) return null;
  
  const clean = duration.toLowerCase().trim();
  
  // Regex to match hour and minute components
  const hMatch = clean.match(/(\d+(?:\.\d+)?)h/);
  const mMatch = clean.match(/(\d+(?:\.\d+)?)m/);
  
  let totalHours = 0;
  let matched = false;
  
  if (hMatch) {
    totalHours += parseFloat(hMatch[1]);
    matched = true;
  }
  
  if (mMatch) {
    totalHours += parseFloat(mMatch[1]) / 60;
    matched = true;
  }
  
  // If neither h nor m matched, try parsing as a naked number (hours)
  if (!matched) {
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }
  
  return totalHours;
};

/**
 * Calculates total hours per day
 */
export const calculateDailyTotals = (entries: WorklogEntry[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  
  entries.forEach(entry => {
    const hours = parseDurationToHours(entry.timeSpent) || 0;
    if (entry.date) {
      totals[entry.date] = (totals[entry.date] || 0) + hours;
    }
  });
  
  return totals;
};
