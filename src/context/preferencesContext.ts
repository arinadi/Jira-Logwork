import { createContext, useContext } from 'react';

export interface PreferencesContextType {
  /** Jira duration text, e.g. "8h" */
  dailyTarget: string;
  dailyTargetMinutes: number;
  /** Returns false (and keeps the old target) when the text is not a valid target. */
  setDailyTarget: (target: string) => boolean;
  /** ISO country code used for public holidays */
  holidayCountry: string;
  setHolidayCountry: (countryCode: string) => void;
  /** Components worklogs may go to; empty = all */
  allowedComponents: string[];
  /** Takes the comma list as typed */
  setAllowedComponents: (text: string) => void;
}

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};
