import { useEffect, useMemo, useState } from 'react';
import { holidayService } from '../services/holidays';

/**
 * Public holidays (yyyy-MM-dd → name) for the given years in the given country.
 * A failed lookup leaves the map empty: days then just show as normal working days.
 */
export function useHolidays(years: number[], country: string): Map<string, string> {
  const [byYear, setByYear] = useState<Record<string, Array<{ date: string; name: string }>>>({});
  const yearsKey = years.join(',');

  useEffect(() => {
    if (!yearsKey) return;
    let cancelled = false;
    Promise.all(yearsKey.split(',').map(async year => {
      const holidays = await holidayService.getPublicHolidays(Number(year), country);
      return [year, holidays.map(h => ({ date: h.date, name: h.localName || h.name }))] as const;
    }))
      .then(results => {
        if (!cancelled) setByYear(Object.fromEntries(results));
      })
      .catch(err => console.error('Failed to fetch public holidays:', err));
    return () => { cancelled = true; };
  }, [yearsKey, country]);

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const list of Object.values(byYear)) for (const h of list) map.set(h.date, h.name);
    return map;
  }, [byYear]);
}
