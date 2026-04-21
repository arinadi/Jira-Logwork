import React, { useState, useEffect } from 'react';
import { X, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AuthConfig } from '../types/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, saveConfig, disconnect } = useAuth();
  const [formData, setFormData] = useState<AuthConfig>({
    domain: '',
    email: '',
    apiToken: '',
  });
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (config) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(config);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    const success = await saveConfig(formData);
    setLocalLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setFormData({ domain: '', email: '', apiToken: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-atlassian-text">Connection Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-atlassian-blue-light/30 border border-atlassian-blue/10 p-4 rounded-lg flex gap-3">
            <div className="p-1 bg-atlassian-blue rounded-md h-fit">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-atlassian-blue">Zero-Trust Architecture.</p>
              <p className="text-sm text-atlassian-blue/80">
                Your tokens and data are stored securely in your browser's local storage and never sent to our servers.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-atlassian-text-subtle mb-1">Jira Domain</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="gameloft.atlassian.net"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-atlassian-text-subtle mb-1">Jira Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="consultant@gameloft.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-atlassian-text-subtle mb-1">Personal Access Token (PAT)</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••••••••••"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
              />
              <p className="mt-1 text-xs text-atlassian-text-subtle">
                Create a token in Jira &gt; Settings &gt; Personal Access Tokens.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 gap-3">
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-red-600 hover:text-red-700 font-medium transition-colors"
              disabled={!config}
            >
              Disconnect
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md font-medium text-atlassian-text hover:bg-gray-50 transition-colors"
                disabled={localLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center gap-2 min-w-[120px] justify-center"
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Save & Connect'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
