import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Download, BookOpen } from 'lucide-react';
import { csvExporter } from '../utils/csvExporter';

interface UploaderProps {
  onFileSelect: (file: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    } else {
      setError('Please drop a valid CSV file.');
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed rounded-3xl p-16 transition-all duration-300 flex flex-col items-center justify-center text-center ${
          isDragging 
            ? 'border-atlassian-blue bg-atlassian-blue/5 scale-[1.01] shadow-2xl shadow-atlassian-blue/10' 
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50'
        }`}
      >
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 ${
          isDragging 
            ? 'bg-atlassian-blue text-white rotate-12 scale-110 shadow-lg' 
            : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-atlassian-blue group-hover:-rotate-3'
        }`}>
          {isDragging ? <Upload className="w-12 h-12 animate-bounce" /> : <FileSpreadsheet className="w-12 h-12" />}
        </div>

        <h3 className="text-3xl font-black text-atlassian-text mb-3">Bulk Logwork, Simplified.</h3>
        <p className="text-atlassian-text-subtle max-w-sm mx-auto mb-10 text-lg">
          Drag & Drop your CSV file here, or click to browse. We'll handle the rest.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm mb-8 bg-red-50 px-6 py-3 rounded-2xl border border-red-100 animate-in shake duration-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <label className={`cursor-pointer px-10 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${
          isDragging 
            ? 'bg-atlassian-blue-dark text-white' 
            : 'bg-atlassian-blue text-white hover:bg-atlassian-blue-dark hover:translate-y-[-2px]'
        }`}>
          Browse My Computer
          <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </label>
        
        <div className="mt-12 flex items-center gap-6 text-xs font-bold text-atlassian-text-subtle uppercase tracking-widest opacity-60">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-atlassian-blue"></div> Issue ID</span>
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-atlassian-blue"></div> Date</span>
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-atlassian-blue"></div> Hour</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => csvExporter.downloadSampleCSV()}
          className="flex items-center justify-between p-6 rounded-2xl bg-white border border-slate-100 hover:border-atlassian-blue/30 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-atlassian-text">Download Sample</p>
              <p className="text-xs text-atlassian-text-subtle">Get the CSV template</p>
            </div>
          </div>
        </button>

        <a 
          href="https://atlassian.design/content/atlassian-document-format" 
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between p-6 rounded-2xl bg-white border border-slate-100 hover:border-atlassian-blue/30 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-atlassian-text">Jira API Docs</p>
              <p className="text-xs text-atlassian-text-subtle">Learn about ADF format</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};
