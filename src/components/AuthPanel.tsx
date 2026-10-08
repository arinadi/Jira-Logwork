import React, { useState } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SettingsModal } from './SettingsModal';

export const AuthPanel: React.FC = () => {
  const { config, user, status } = useAuth();
  // Without a saved site there is nothing to do but connect, so start with Settings open.
  const [isModalOpen, setIsModalOpen] = useState(!config);

  return (
    <div className="flex items-center gap-2">
      {config && user && status === 'connected' && (
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <img src={user.avatarUrls['24x24']} alt="" className="w-6 h-6 rounded-full" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-medium truncate">{user.displayName}</p>
            <p className="text-xs text-[var(--text-subtle)] truncate">{config.domain}</p>
          </div>
        </div>
      )}
      {config && status !== 'connected' && status !== 'connecting' && (
        <span className="lozenge bg-[var(--danger-bg)] text-[var(--danger)]" role="status">
          <AlertCircle className="w-3 h-3" aria-hidden="true" /> Not connected
        </span>
      )}
      <button type="button" className={config ? 'icon-btn' : 'btn-primary'} onClick={() => setIsModalOpen(true)} aria-label="Settings">
        <Settings className="w-4 h-4" aria-hidden="true" />
        {!config && <span>Connect</span>}
      </button>
      {isModalOpen && <SettingsModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
