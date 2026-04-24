import React, { useEffect, useState, useMemo } from 'react';
import { format, parseISO, isValid, isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';
import { calculateDailyTotals } from '../utils/validation';
import { holidayService, getSavedCountry } from '../services/holidays';
import type { WorklogEntry } from '../types/worklog';
import type { PublicHoliday } from '../types/holiday';
import { Loader2 } from 'lucide-react';

interface DailyCapacityTrackerProps {
  entries: WorklogEntry[];
}

export const DailyCapacityTracker: React.FC<DailyCapacityTrackerProps> = ({ entries }) => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(false);

  // Compute the date range from entries
  const dateRange = useMemo(() => {
    const validDates = entries
      .map(e => e.date)
      .filter(d => d && isValid(parseISO(d)))
      .sort();

    if (validDates.length === 0) return null;

    const first = parseISO(validDates[0]);
    const last = parseISO(validDates[validDates.length - 1]);
    return { first, last };
  }, [entries]);

  // Get unique years from entries to fetch holidays
  const years = useMemo(() => {
    if (!dateRange) return [];
    const ySet = new Set<number>();
    const allDays = eachDayOfInterval({ start: dateRange.first, end: dateRange.last });
    allDays.forEach(d => ySet.add(d.getFullYear()));
    return Array.from(ySet);
  }, [dateRange]);

  // Fetch holidays for all relevant years
  useEffect(() => {
    if (years.length === 0) return;
    const country = getSavedCountry();
    let cancelled = false;

    setLoading(true);
    Promise.all(years.map(y => holidayService.getPublicHolidays(y, country)))
      .then(results => {
        if (!cancelled) {
          setHolidays(results.flat());
        }
      })
      .catch(err => {
        console.error('Failed to fetch public holidays:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [years]);

  // Build a lookup map for holidays by date string
  const holidayMap = useMemo(() => {
    const map = new Map<string, PublicHoliday>();
    holidays.forEach(h => map.set(h.date, h));
    return map;
  }, [holidays]);

  // Build daily totals
  const totals = calculateDailyTotals(entries);

  // Build the complete list of dates
  const allDates = useMemo(() => {
    if (!dateRange) return [];
    return eachDayOfInterval({ start: dateRange.first, end: dateRange.last })
      .map(d => format(d, 'yyyy-MM-dd'))
      .sort();
  }, [dateRange]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <span className="text-3xl grayscale opacity-50">📊</span>
        </div>
        <p className="text-sm font-medium leading-relaxed italic max-w-[200px]">
          No worklogs registered.<br/>Start by importing a CSV or fetching history.
        </p>
      </div>
    );
  }

  // Today's date for "today" indicator
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-1.5">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-subtle)] py-2 px-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading holidays...
        </div>
      )}

      {allDates.map((date) => {
        const hours = totals[date] || 0;
        const dateObj = parseISO(date);
        const weekend = isWeekend(dateObj);
        const holiday = holidayMap.get(date);
        const isOff = weekend || !!holiday;
        const isToday = date === todayStr;

        // For working days
        const isTargetMet = !isOff && hours === 8;
        const isOverCapacity = !isOff && hours > 8;
        const hasWork = hours > 0;

        // Day name abbreviation
        const dayAbbr = format(dateObj, 'EEE');
        const displayDate = isValid(dateObj) ? format(dateObj, 'MMM d') : date;

        return (
          <div
            key={date}
            className={`group rounded-xl px-3 py-2 transition-all duration-300 ${
              isToday
                ? 'bg-atlassian-blue/5 border border-atlassian-blue/20 shadow-sm'
                : isOff
                  ? 'opacity-60 hover:opacity-90'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            {/* Row header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                {/* Day badge */}
                <span className={`text-[9px] font-black uppercase tracking-wider w-8 shrink-0 ${
                  weekend
                    ? 'text-rose-500'
                    : holiday
                      ? 'text-amber-500'
                      : isToday
                        ? 'text-atlassian-blue'
                        : 'text-[var(--text-subtle)] opacity-60'
                }`}>
                  {dayAbbr}
                </span>

                {/* Date */}
                <span className={`text-xs font-semibold tracking-tight ${
                  isToday
                    ? 'text-atlassian-blue'
                    : 'text-[var(--text-main)] opacity-70 group-hover:opacity-100'
                } transition-opacity`}>
                  {displayDate}
                </span>

                {/* Today chip */}
                {isToday && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest bg-atlassian-blue text-white rounded-md animate-pulse-soft">
                    Today
                  </span>
                )}

                {/* Holiday badge */}
                {holiday && (
                  <span
                    className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20 truncate max-w-[120px]"
                    title={`${holiday.localName} — ${holiday.name}`}
                  >
                    🏛 {holiday.localName}
                  </span>
                )}

                {/* Weekend badge (only if no holiday badge) */}
                {weekend && !holiday && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 rounded-md border border-rose-500/20">
                    Weekend
                  </span>
                )}
              </div>

              {/* Hours */}
              <span className={`text-sm font-bold tracking-tight shrink-0 ${
                isOff && !hasWork
                  ? 'text-[var(--text-subtle)] opacity-30'
                  : isOff && hasWork
                    ? 'text-violet-500'
                    : isTargetMet
                      ? 'text-emerald-500'
                      : isOverCapacity
                        ? 'text-red-500'
                        : hours === 0
                          ? 'text-[var(--text-subtle)] opacity-30'
                          : 'text-amber-500'
              }`}>
                {hours > 0 ? hours.toFixed(1) : '—'}
                {!isOff && <span className="opacity-30 font-medium text-xs ml-0.5">/ 8h</span>}
              </span>
            </div>

            {/* Progress bar */}
            {!isOff ? (
              <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                {hours > 0 && (
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-1000 rounded-full ${
                      isTargetMet
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : isOverCapacity
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse'
                          : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                    }`}
                    style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
                  />
                )}
              </div>
            ) : hasWork ? (
              /* Off-day but has worklogs — show a subtle violet bar */
              <div className="relative h-2 w-full bg-violet-100 dark:bg-violet-900/20 rounded-full overflow-hidden shadow-inner">
                <div
                  className="absolute left-0 top-0 h-full bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-1000"
                  style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
                />
              </div>
            ) : (
              /* Off-day, no work — thin dashed line */
              <div className="h-2 w-full border-b border-dashed border-slate-200 dark:border-slate-700/50" />
            )}

            {/* Status hints (show on hover for working days) */}
            {isOverCapacity && (
              <div className="flex gap-2 items-center text-[9px] text-red-500 font-bold uppercase tracking-wider mt-1 animate-in slide-in-from-top-1 duration-500">
                <div className="w-1 h-1 rounded-full bg-red-500" />
                Over-capacity detected
              </div>
            )}
            {!isOff && !isTargetMet && !isOverCapacity && hours > 0 && (
              <div className="flex gap-2 items-center text-[9px] text-amber-500 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-500 mt-1">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                {(8 - hours).toFixed(1)}h remaining
              </div>
            )}
            {isOff && hasWork && (
              <div className="flex gap-2 items-center text-[9px] text-violet-500 font-bold uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="w-1 h-1 rounded-full bg-violet-500" />
                Overtime on {holiday ? 'holiday' : 'weekend'}
              </div>
            )}
            {!isOff && hours === 0 && !isSameDay(dateObj, new Date()) && (
              <div className="flex gap-2 items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                No worklogs
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
