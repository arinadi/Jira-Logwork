import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { WorklogEntry } from '../types/worklog';
import { Dialog } from './Dialog';

interface CopyToDaysDialogProps {
  entry: WorklogEntry;
  /** Days shown as checkboxes (the workspace range) */
  suggestedDays: string[];
  onCopy: (dates: string[]) => void;
  onClose: () => void;
}

export const CopyToDaysDialog: React.FC<CopyToDaysDialogProps> = ({ entry, suggestedDays, onCopy, onClose }) => {
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [extraDay, setExtraDay] = useState('');
  const days = Array.from(new Set([...suggestedDays, ...extraDays])).filter(d => d !== entry.date).sort();

  const toggle = (day: string) => setChosen(prev => {
    const next = new Set(prev);
    if (next.has(day)) next.delete(day); else next.add(day);
    return next;
  });

  const addExtraDay = () => {
    if (!extraDay) return;
    setExtraDays(prev => [...prev, extraDay]);
    setChosen(prev => new Set(prev).add(extraDay));
    setExtraDay('');
  };

  return (
    <Dialog
      title={`Copy ${entry.issueKey || 'row'} to other days`}
      description={`${entry.timeSpent || 'no time'} · ${entry.comment || 'no comment'}. Days where ${entry.issueKey || 'this issue'} already has a row are skipped.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-subtle" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={chosen.size === 0} onClick={() => onCopy(Array.from(chosen))}>
            Copy to {chosen.size} {chosen.size === 1 ? 'day' : 'days'}
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="field-label">Days</legend>
        {days.length === 0 && <p className="text-sm text-[var(--text-subtle)]">No other days in the workspace yet — add one below.</p>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
          {days.map(day => (
            <li key={day}>
              <label className="flex items-center gap-2 px-1 py-1 rounded-[3px] hover:bg-[var(--bg-hover)] cursor-pointer text-sm">
                <input type="checkbox" checked={chosen.has(day)} onChange={() => toggle(day)} />
                {format(parseISO(day), 'EEE dd MMM yyyy')}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="copy-extra-day" className="field-label">Another day</label>
          <input id="copy-extra-day" type="date" className="field" value={extraDay} onChange={(e) => setExtraDay(e.target.value)} />
        </div>
        <button type="button" className="btn" onClick={addExtraDay} disabled={!extraDay}>Add</button>
      </div>
    </Dialog>
  );
};
