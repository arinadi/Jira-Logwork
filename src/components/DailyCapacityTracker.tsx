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
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-xl">📊</span>
        </div>
        <p className="text-sm italic">
          No data logs available.<br/>Import a CSV to see stats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const hours = totals[date];
        const isTargetMet = hours === 8;
        const isOverCapacity = hours > 8;
        const displayDate = isValid(parseISO(date)) ? format(parseISO(date), 'MMM d, yyyy') : date;

        return (
          <div key={date} className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-atlassian-text-subtle">
              <span>{displayDate}</span>
              <span className={isTargetMet ? "text-emerald-600" : isOverCapacity ? "text-red-500" : "text-amber-600"}>
                {hours.toFixed(1)} / 8h
              </span>
            </div>
            
            <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${
                  isTargetMet ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                  isOverCapacity ? "bg-red-500 animate-pulse" : 
                  "bg-amber-400"
                }`}
                style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
              />
            </div>

            {isOverCapacity && (
              <p className="text-[10px] text-red-500 font-semibold leading-tight animate-in fade-in slide-in-from-top-1">
                ⚠️ Over 8 hours logged. Please split or reduce entries before syncing.
              </p>
            )}
            {!isTargetMet && !isOverCapacity && (
              <p className="text-[10px] text-amber-600 font-medium leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                Missing {(8 - hours).toFixed(1)}h to meet daily target.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
