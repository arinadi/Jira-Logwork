import React, { useState } from 'react';
import { Settings, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SettingsModal } from './SettingsModal';

export const AuthPanel: React.FC = () => {
  const { config, status } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {config && (
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            status === 'connected' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status === 'connected' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 opacity-60" />
            {config.domain || 'Not configured'}
          </span>
        </div>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-atlassian-text-subtle"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
