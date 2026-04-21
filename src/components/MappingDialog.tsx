import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ChevronRight } from 'lucide-react';
import type { FieldMapping } from '../types/worklog';
import { csvParser } from '../utils/csvParser';

interface MappingDialogProps {
  isOpen: boolean;
  headers: string[];
  initialMapping: FieldMapping;
  onConfirm: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

export const MappingDialog: React.FC<MappingDialogProps> = ({ 
  isOpen, 
  headers, 
  onConfirm, 
  onCancel 
}) => {
  const [mapping, setMapping] = useState<FieldMapping>({
    issueKey: '',
    date: '',
    timeSpent: '',
    comment: '',
  });

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapping(csvParser.autoMapHeaders(headers));
    }
  }, [isOpen, headers]);

  if (!isOpen) return null;

  const fields = [
    { key: 'issueKey', label: 'Issue Key', description: 'e.g., DESP-38705', required: true },
    { key: 'date', label: 'Date', description: 'e.g., 2026-04-17', required: true },
    { key: 'timeSpent', label: 'Time Spent', description: 'e.g., 1h 30m or 8h', required: true },
    { key: 'comment', label: 'Comment', description: 'Optional description of work', required: false },
  ] as const;

  const isComplete = mapping.issueKey && mapping.date && mapping.timeSpent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-semibold text-atlassian-text">Map CSV Columns</h2>
            <p className="text-sm text-atlassian-text-subtle">Match your file columns to Jira fields.</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {fields.map((field) => (
              <div key={field.key} className="flex items-center gap-4 p-4 rounded-lg bg-white border border-gray-100 shadow-sm hover:border-atlassian-blue/30 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-atlassian-text">{field.label}</span>
                    {field.required && <span className="text-red-500 font-bold text-xs uppercase">Required</span>}
                  </div>
                  <p className="text-xs text-atlassian-text-subtle">{field.description}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-300" />

                <div className="w-64">
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-atlassian-blue focus:border-transparent outline-none transition-all"
                    value={mapping[field.key]}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-atlassian-text-subtle font-medium hover:text-atlassian-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            disabled={!isComplete}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
              isComplete 
                ? 'bg-atlassian-blue text-white shadow-md hover:bg-atlassian-blue-dark active:scale-95' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Mapping
          </button>
        </div>
      </div>
    </div>
  );
};
