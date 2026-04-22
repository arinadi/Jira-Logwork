import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface UploaderProps {
  onFileSelect: (file: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer
        flex flex-col items-center justify-center
        p-16 rounded-[3rem] border-2 border-dashed
        transition-all duration-700 ease-out
        ${isDragging 
          ? 'border-atlassian-blue bg-atlassian-blue/[0.04] scale-[1.02] shadow-2xl shadow-atlassian-blue/10' 
          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-atlassian-blue/30 hover:bg-slate-50 dark:hover:bg-slate-800/20'
        }
      `}
    >
      <input
        type="file"
        accept=".csv"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      
      <div className={`
        w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8
        transition-all duration-700
        ${isDragging 
          ? 'bg-atlassian-blue text-white rotate-12 scale-110 shadow-2xl shadow-atlassian-blue/30' 
          : 'bg-slate-50 dark:bg-slate-800 text-slate-300 group-hover:bg-atlassian-blue/5 group-hover:text-atlassian-blue group-hover:-rotate-6 group-hover:scale-110 shadow-lg'
        }
      `}>
        <Upload className="w-10 h-10" />
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-semibold text-[var(--text-main)] tracking-tight">
          Bulk Logwork, Simplified.
        </h2>
        <p className="text-[var(--text-subtle)] font-medium text-base max-w-sm mx-auto leading-relaxed">
          Drag & Drop your CSV file here, or click to browse. We'll handle the rest.
        </p>
      </div>

      <div className="mt-12 flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-atlassian-blue"></div>
            Issue ID
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            Date
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            Hour
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 rounded-tl-lg transition-all group-hover:border-atlassian-blue/30 group-hover:-translate-x-2 group-hover:-translate-y-2"></div>
      <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-slate-200 dark:border-slate-800 rounded-tr-lg transition-all group-hover:border-atlassian-blue/30 group-hover:translate-x-2 group-hover:-translate-y-2"></div>
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-slate-200 dark:border-slate-800 rounded-bl-lg transition-all group-hover:border-atlassian-blue/30 group-hover:-translate-x-2 group-hover:translate-y-2"></div>
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 rounded-br-lg transition-all group-hover:border-atlassian-blue/30 group-hover:translate-x-2 group-hover:translate-y-2"></div>
    </div>
  );
};
