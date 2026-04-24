import React, { useState, useEffect } from 'react';
import { X, Loader2, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { holidayService, getSavedCountry, saveCountry } from '../services/holidays';
import type { AuthConfig } from '../types/auth';
import type { AvailableCountry } from '../types/holiday';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, user, saveConfig, disconnect } = useAuth();
  const [formData, setFormData] = useState<AuthConfig>({
    domain: '',
    email: '',
    apiToken: '',
  });
  const [localLoading, setLocalLoading] = useState(false);

  // Country state
  const [countries, setCountries] = useState<AvailableCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(getSavedCountry());
  const [countriesLoading, setCountriesLoading] = useState(false);

  useEffect(() => {
    if (config) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(config);
    }
  }, [config, isOpen]);

  // Fetch available countries when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountriesLoading(true);
    holidayService.getAvailableCountries()
      .then(data => setCountries(data))
      .catch(err => console.error('Failed to load countries:', err))
      .finally(() => setCountriesLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);

    // Save country preference
    saveCountry(selectedCountry);

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
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md p-4 pt-10 md:pt-20 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative mx-auto bg-[var(--bg-surface)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-[var(--border-color)] mb-10 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)]">Connection Settings</h2>
            <p className="text-[10px] text-[var(--text-subtle)] font-bold uppercase tracking-widest opacity-60">Jira API Configuration</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-[var(--text-subtle)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Active Profile Section */}
          {user && (
            <div className="p-4 rounded-2xl flex items-center gap-4 animate-in fade-in duration-500 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
              <img 
                src={user.avatarUrls['48x48']} 
                alt={user.displayName} 
                className="w-12 h-12 rounded-2xl shadow-sm border-2 border-white dark:border-slate-700"
              />
              <div className="flex-1">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Active Profile</p>
                <h3 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{user.displayName}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-subtle)' }}>{user.emailAddress}</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-full border border-emerald-500/20">
                  {user.accountType}
                </div>
                <p className="text-[8px] mt-1 font-bold" style={{ color: 'var(--text-subtle)' }}>{user.timeZone}</p>
              </div>
            </div>
          )}

          {/* Security Banner */}
          <div className="bg-atlassian-blue/5 border border-atlassian-blue/10 p-4 rounded-2xl flex gap-4">
            <div className="p-2 bg-atlassian-blue rounded-xl h-fit shadow-md shadow-atlassian-blue/20 shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-atlassian-blue uppercase tracking-tight">Zero-Trust Secured</p>
              <p className="text-xs text-[var(--text-subtle)] font-medium leading-relaxed opacity-80">
                Credentials are stored locally in your browser and never sent to our servers.
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Jira Domain</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-main)] focus:ring-2 focus:ring-atlassian-blue outline-none transition-all placeholder:opacity-30"
                placeholder="company.atlassian.net"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Jira Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-main)] focus:ring-2 focus:ring-atlassian-blue outline-none transition-all placeholder:opacity-30"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1">Personal Access Token (PAT)</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-main)] focus:ring-2 focus:ring-atlassian-blue outline-none transition-all placeholder:opacity-30"
                placeholder="••••••••••••••••"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
              />
              <p className="px-1 text-[10px] text-[var(--text-subtle)] opacity-60 font-medium">
                Settings &gt; Personal Access Tokens &gt; Create
              </p>
            </div>

            {/* Country Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-subtle)] uppercase tracking-widest pl-1 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Holiday Country
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-main)] focus:ring-2 focus:ring-atlassian-blue outline-none transition-all appearance-none cursor-pointer pr-10"
                  disabled={countriesLoading}
                >
                  {countriesLoading ? (
                    <option>Loading countries...</option>
                  ) : (
                    countries.map(c => (
                      <option key={c.countryCode} value={c.countryCode}>
                        {c.name} ({c.countryCode})
                      </option>
                    ))
                  )}
                </select>
                {/* Custom dropdown chevron */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-subtle)]">
                  {countriesLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="px-1 text-[10px] text-[var(--text-subtle)] opacity-60 font-medium">
                Public holidays for the Performance tracker sidebar
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 text-xs font-black text-red-600 dark:text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-30"
              disabled={!config}
            >
              Disconnect
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors"
                disabled={localLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-atlassian-blue text-white rounded-xl text-sm font-black shadow-lg shadow-atlassian-blue/20 hover:bg-atlassian-blue-dark transition-all active:scale-95 flex items-center gap-2"
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white/60" />
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
