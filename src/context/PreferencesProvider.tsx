import React, { useCallback, useMemo, useState } from 'react';
import { loadAllowedComponents, loadDailyTarget, loadReadHrms, loadWorkingStatuses, saveAllowedComponents, saveDailyTarget, saveReadHrms, saveWorkingStatuses } from '../utils/preferences';
import { parseDurationToHours } from '../utils/validation';
import { getSavedCountry, saveCountry } from '../services/holidays';
import { PreferencesContext } from './preferencesContext';

/** One daily target shared by the scan, the day headers and the summary, so they never disagree. */
export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dailyTarget, setTarget] = useState(() => loadDailyTarget(localStorage));
  // Held in state (not only storage) so the day headers refetch holidays as soon as the country changes.
  const [holidayCountry, setCountry] = useState(getSavedCountry);

  const [allowedComponents, setComponents] = useState(() => loadAllowedComponents(localStorage));

  const setAllowedComponents = useCallback((text: string) => {
    saveAllowedComponents(localStorage, text);
    setComponents(loadAllowedComponents(localStorage));
  }, []);

  const [workingStatuses, setStatuses] = useState(() => loadWorkingStatuses(localStorage));

  const setWorkingStatuses = useCallback((text: string) => {
    saveWorkingStatuses(localStorage, text);
    setStatuses(loadWorkingStatuses(localStorage));
  }, []);

  const [readHrms, setReadHrmsState] = useState(() => loadReadHrms(localStorage));

  const setReadHrms = useCallback((on: boolean) => {
    saveReadHrms(localStorage, on);
    setReadHrmsState(on);
  }, []);

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
    allowedComponents,
    setAllowedComponents,
    workingStatuses,
    setWorkingStatuses,
    readHrms,
    setReadHrms,
  }), [dailyTarget, setDailyTarget, holidayCountry, setHolidayCountry, allowedComponents, setAllowedComponents, workingStatuses, setWorkingStatuses, readHrms, setReadHrms]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
