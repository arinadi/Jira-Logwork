import React, { useCallback, useId, useState } from 'react';
import { Upload } from 'lucide-react';

interface UploaderProps {
  onFileSelect: (file: File) => void;
}

/** CSV drop zone. A real <label> + file input, so it also works by keyboard and screen reader. */
export const Uploader: React.FC<UploaderProps> = ({ onFileSelect }) => {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    // Windows often reports CSV as application/vnd.ms-excel, so trust the extension too.
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      setRejected(null);
      onFileSelect(file);
    } else {
      setRejected(`${file.name} is not a CSV file.`);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
      className={`rounded-[3px] border-2 border-dashed p-6 text-center ${isDragging ? 'border-atlassian-blue bg-[#e9f2ff] dark:bg-[#09326c]' : 'border-[var(--border-color)]'}`}
    >
      <Upload className="w-6 h-6 mx-auto mb-2 text-[var(--text-subtle)]" aria-hidden="true" />
      <p className="text-sm">
        Drop a CSV file here, or{' '}
        <label htmlFor={inputId} className="text-[var(--link)] font-medium underline cursor-pointer">choose a file</label>
      </p>
      <p className="mt-1 text-xs text-[var(--text-subtle)]">Columns: issue key, date, time spent, comment (optional)</p>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          // Reset so choosing the same file again still fires onChange.
          e.target.value = '';
        }}
      />
      {rejected && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{rejected}</p>}
    </div>
  );
};
