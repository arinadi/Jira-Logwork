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
 * Parses duration strings like "8h", "30m", "1.5h" into decimal hours.
 */
export const parseDurationToHours = (duration: string): number | null => {
  if (!duration) return null;
  
  const clean = duration.toLowerCase().trim();
  
  // Simple "8h" or "1.5h"
  if (clean.endsWith('h')) {
    const val = parseFloat(clean.replace('h', ''));
    return isNaN(val) ? null : val;
  }
  
  // Simple "30m"
  if (clean.endsWith('m')) {
    const val = parseFloat(clean.replace('m', ''));
    return isNaN(val) ? null : val / 60;
  }
  
  // Naked number (assume hours)
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
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
