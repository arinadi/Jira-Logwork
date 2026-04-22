import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, AlertCircle, Database, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SettingsModal } from './SettingsModal';

export const AuthPanel: React.FC = () => {
  const { config, user, status, disconnect } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(!config);

  // Auto-open settings if disconnected or empty
  useEffect(() => {
    if (!config) {
      // Use timeout to avoid cascading render warning in linter
      const timer = setTimeout(() => setIsModalOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, [config]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex items-center gap-2">
      {config && user && status === 'connected' ? (
        <div className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all duration-300 group cursor-pointer border border-transparent hover:border-[var(--border-color)]">
          <div className="relative">
            {user.avatarUrls['32x32'] ? (
              <img 
                src={user.avatarUrls['32x32']} 
                alt={user.displayName} 
                className="w-9 h-9 rounded-xl shadow-sm border border-black/5 dark:border-white/10 group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold group-hover:scale-105 transition-transform duration-300">
                {getInitials(user.displayName)}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
          </div>
          
          <div className="flex flex-col justify-center min-w-[140px] pr-2">
            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              {user.displayName}
            </span>
            <span className="text-[10px] font-bold flex items-center gap-1.5 tracking-tight uppercase mt-1" style={{ color: 'var(--text-subtle)' }}>
              <Database className="w-2.5 h-2.5" />
              {config.domain}
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              disconnect();
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100"
            title="Disconnect Workspace"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      ) : config && status !== 'connected' ? (
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[11px] font-bold uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 animate-pulse" />
          Offline
        </div>
      ) : null}

      <div className="w-px h-8 bg-[var(--border-color)] mx-1 opacity-50"></div>

      <button
        onClick={() => setIsModalOpen(true)}
        className={`p-2.5 rounded-2xl transition-all duration-300 active:scale-90 ${
          !config ? 'bg-atlassian-blue text-white shadow-xl shadow-atlassian-blue/20 animate-pulse-soft' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'
        }`}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {createPortal(
        <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />,
        document.body
      )}
    </div>
  );
};
