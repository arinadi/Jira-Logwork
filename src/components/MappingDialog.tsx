import React, { useState } from 'react';
import type { FieldMapping } from '../types/worklog';
import { csvParser } from '../utils/csvParser';
import { Dialog } from './Dialog';

interface MappingDialogProps {
  headers: string[];
  onConfirm: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

const FIELDS = [
  { key: 'issueKey', label: 'Issue key', example: 'e.g. DESP-38705', required: true },
  { key: 'date', label: 'Date', example: 'e.g. 2026-04-17', required: true },
  { key: 'timeSpent', label: 'Time spent', example: 'e.g. 1h 30m or 8h', required: true },
  { key: 'comment', label: 'Comment', example: 'optional', required: false },
] as const;

export const MappingDialog: React.FC<MappingDialogProps> = ({ headers, onConfirm, onCancel }) => {
  // Mounted per import, so the guess is made once from this file's headers.
  const [mapping, setMapping] = useState<FieldMapping>(() => csvParser.autoMapHeaders(headers));
  const isComplete = !!(mapping.issueKey && mapping.date && mapping.timeSpent);

  return (
    <Dialog
      title="Map CSV columns"
      description="Match the columns of your file to worklog fields."
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-subtle" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!isComplete} onClick={() => onConfirm(mapping)}>Add rows</button>
        </>
      }
    >
      <div className="space-y-3">
        {FIELDS.map(field => (
          <div key={field.key} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] sm:items-center gap-1 sm:gap-3">
            <label htmlFor={`map-${field.key}`} className="text-sm font-medium">
              {field.label}{field.required && <span className="text-[var(--danger)]"> *</span>}
              <span className="block text-xs font-normal text-[var(--text-subtle)]">{field.example}</span>
            </label>
            <select
              id={`map-${field.key}`}
              className="field"
              required={field.required}
              value={mapping[field.key]}
              onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
            >
              <option value="">— Select column —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
        <p className="text-xs text-[var(--text-subtle)]"><span className="text-[var(--danger)]">*</span> required</p>
      </div>
    </Dialog>
  );
};
