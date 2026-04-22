import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { calculateDailyTotals } from '../utils/validation';
import type { WorklogEntry } from '../types/worklog';

interface DailyCapacityTrackerProps {
  entries: WorklogEntry[];
}

export const DailyCapacityTracker: React.FC<DailyCapacityTrackerProps> = ({ entries }) => {
  const totals = calculateDailyTotals(entries);
  const dates = Object.keys(totals).sort().reverse();

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

  return (
    <div className="space-y-6">
      {dates.map((date) => {
        const hours = totals[date];
        const isTargetMet = hours === 8;
        const isOverCapacity = hours > 8;
        const displayDate = isValid(parseISO(date)) ? format(parseISO(date), 'MMMM d, yyyy') : date;

        return (
          <div key={date} className="space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{displayDate}</span>
              <span className={`text-sm font-bold tracking-tight ${
                isTargetMet ? "text-emerald-500" : isOverCapacity ? "text-red-500" : "text-amber-500"
              }`}>
                {hours.toFixed(1)} <span className="opacity-40 font-medium">/ 8h</span>
              </span>
            </div>
            
            <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) rounded-full ${
                  isTargetMet ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : 
                  isOverCapacity ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse" : 
                  "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                }`}
                style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
              />
            </div>

            {isOverCapacity && (
              <div className="flex gap-2 items-center text-[10px] text-red-500 font-bold uppercase tracking-wider animate-in slide-in-from-top-1 duration-500">
                <div className="w-1 h-1 rounded-full bg-red-500"></div>
                Over-capacity detected
              </div>
            )}
            {!isTargetMet && !isOverCapacity && (
              <div className="flex gap-2 items-center text-[10px] text-amber-500 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-500">
                 <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                 {(8 - hours).toFixed(1)}h remaining
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
