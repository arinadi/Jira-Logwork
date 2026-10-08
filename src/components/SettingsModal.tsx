import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/preferencesContext';
import { holidayService } from '../services/holidays';
import { isValidDailyTarget } from '../utils/preferences';
import type { AvailableCountry } from '../types/holiday';
import { Dialog } from './Dialog';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { config, user, error, saveConfig, disconnect } = useAuth();
  const { dailyTarget, setDailyTarget, holidayCountry, setHolidayCountry, allowedComponents, setAllowedComponents, workingStatuses, setWorkingStatuses, readHrms, setReadHrms } = usePreferences();
  const [domain, setDomain] = useState(config?.domain || '');
  const [target, setTarget] = useState(dailyTarget);
  const [country, setCountry] = useState(holidayCountry);
  const [components, setComponents] = useState(allowedComponents.join(', '));
  const [statuses, setStatuses] = useState(workingStatuses.join(', '));
  const [hrms, setHrms] = useState(readHrms);
  const [countries, setCountries] = useState<AvailableCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const targetValid = isValidDailyTarget(target.trim());

  useEffect(() => {
    holidayService.getAvailableCountries()
      .then(setCountries)
      .catch(err => console.error('Failed to load countries:', err))
      .finally(() => setCountriesLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValid) return;
    setSaving(true);
    setDailyTarget(target);
    setHolidayCountry(country);
    setAllowedComponents(components);
    setWorkingStatuses(statuses);
    setReadHrms(hrms);
    const connected = await saveConfig({ domain });
    setSaving(false);
    if (connected) onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    setDomain('');
    onClose();
  };

  return (
    <Dialog
      title="Settings"
      description="Jira connection, daily target and holidays."
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-danger mr-auto" onClick={handleDisconnect} disabled={!config || saving}>Disconnect</button>
          <button type="button" className="btn-subtle" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="settings-form" className="btn-primary" disabled={saving || !targetValid}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Connecting…</> : 'Save & connect'}
          </button>
        </>
      }
    >
      <form id="settings-form" onSubmit={handleSave} className="space-y-3">
        {user && (
          <div className="flex items-center gap-3 p-2 rounded-[3px] bg-[var(--bg-input)]">
            <img src={user.avatarUrls['48x48']} alt="" className="w-8 h-8 rounded-full" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-xs text-[var(--text-subtle)] truncate">Connected · {user.emailAddress}</p>
            </div>
          </div>
        )}

        {error && <p role="alert" className="px-2 py-1.5 rounded-[3px] text-sm bg-[var(--danger-bg)] text-[var(--danger)]">{error}</p>}

        <div>
          <label htmlFor="settings-domain" className="field-label">Jira site</label>
          <input
            id="settings-domain"
            type="text"
            required
            className="field"
            placeholder="gameloft.atlassian.net"
            aria-describedby="settings-domain-help"
            value={domain}
            // Accept a pasted URL: keep only the host, the part the extension calls.
            onChange={(e) => setDomain(e.target.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))}
          />
          <p id="settings-domain-help" className="mt-1 text-xs text-[var(--text-subtle)]">
            No token needed: log in to this site in Chrome; the extension uses that login. Only the site name is saved.
          </p>
        </div>

        <div>
          <label htmlFor="settings-target" className="field-label">Daily target</label>
          <input
            id="settings-target"
            type="text"
            className="field w-32"
            value={target}
            aria-invalid={!targetValid || undefined}
            aria-describedby="settings-target-help"
            onChange={(e) => setTarget(e.target.value)}
          />
          <p id="settings-target-help" className={`mt-1 text-xs ${targetValid ? 'text-[var(--text-subtle)]' : 'text-[var(--danger)]'}`}>
            {targetValid ? 'Used by the scan and the day totals, e.g. 8h or 7h 30m.' : 'Enter a duration between 1m and 24h, e.g. 8h or 7h 30m.'}
          </p>
        </div>

        <div>
          <label htmlFor="settings-components" className="field-label">Allowed components</label>
          <input
            id="settings-components"
            type="text"
            className="field"
            placeholder="e.g. DES-Systems, Anoman"
            aria-describedby="settings-components-help"
            value={components}
            onChange={(e) => setComponents(e.target.value)}
          />
          <p id="settings-components-help" className="mt-1 text-xs text-[var(--text-subtle)]">
            Comma list of Jira components you may log on. The scan only suggests these, and Sync refuses any other issue. Empty = all components.
          </p>
        </div>

        <div>
          <label htmlFor="settings-statuses" className="field-label">Working statuses</label>
          <input
            id="settings-statuses"
            type="text"
            className="field"
            placeholder="empty = Jira's In Progress category"
            aria-describedby="settings-statuses-help"
            value={statuses}
            onChange={(e) => setStatuses(e.target.value)}
          />
          <p id="settings-statuses-help" className="mt-1 text-xs text-[var(--text-subtle)]">
            For days without ticket activity: tickets assigned to you in one of these statuses are suggested. Empty = In Progress, Research, QA, Code Review…; waiting statuses like Pending Customer Confirmation are not counted.
          </p>
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={hrms} onChange={(e) => setHrms(e.target.checked)} aria-describedby="settings-hrms-help" />
            <span>Read leave from HRMS</span>
          </label>
          <p id="settings-hrms-help" className="mt-1 ml-6 text-xs text-[var(--text-subtle)]">
            Each scan reads your approved leave from hrms.gameloft.org (stay logged in there). Leave days get no rows; half days lower the target. Only dates, times, type and status are used.
          </p>
        </div>

        <div>
          <label htmlFor="settings-country" className="field-label">Holiday country</label>
          <select id="settings-country" className="field" value={country} onChange={(e) => setCountry(e.target.value)} disabled={countriesLoading}>
            {countriesLoading
              ? <option value={country}>Loading countries…</option>
              : countries.map(c => <option key={c.countryCode} value={c.countryCode}>{c.name} ({c.countryCode})</option>)}
          </select>
        </div>
      </form>
    </Dialog>
  );
};
