import React, { useCallback, useMemo, useState } from 'react';
import { loadDailyTarget, saveDailyTarget } from '../utils/preferences';
import { parseDurationToHours } from '../utils/validation';
import { getSavedCountry, saveCountry } from '../services/holidays';
import { PreferencesContext } from './preferencesContext';

/** One daily target shared by the scan, the day headers and the summary, so they never disagree. */
export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dailyTarget, setTarget] = useState(() => loadDailyTarget(localStorage));
  // Held in state (not only storage) so the day headers refetch holidays as soon as the country changes.
  const [holidayCountry, setCountry] = useState(getSavedCountry);

  const setHolidayCountry = useCallback((countryCode: string) => {
    saveCountry(countryCode);
    setCountry(countryCode);
  }, []);

  const setDailyTarget = useCallback((target: string) => {
    if (!saveDailyTarget(localStorage, target)) return false;
    setTarget(loadDailyTarget(localStorage));
    return true;
  }, []);

  const value = useMemo(() => ({
    dailyTarget,
    dailyTargetMinutes: Math.round((parseDurationToHours(dailyTarget) || 0) * 60),
    setDailyTarget,
    holidayCountry,
    setHolidayCountry,
  }), [dailyTarget, setDailyTarget, holidayCountry, setHolidayCountry]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
