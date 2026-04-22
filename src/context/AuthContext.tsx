import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthConfig, AuthContextType, AuthStatus, JiraUser } from '../types/auth';
import { jiraService } from '../services/jira';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'jira_logwork_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AuthConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved auth config', e);
      }
    }
    return null;
  });
  
  const [user, setUser] = useState<JiraUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(config ? 'connected' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (authConfig: AuthConfig) => {
    try {
      const userData = await jiraService.getCurrentUser(authConfig);
      setUser(userData);
      return true;
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
      return false;
    }
  }, []);

  // testConnection definition
  const testConnection = useCallback(async (testConfig: AuthConfig) => {
    setStatus('connecting');
    setError(null);
    try {
      const response = await jiraService.apiFetch(testConfig, '/rest/api/3/myself');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setStatus('connected');
        return true;
      }
    } catch (e) {
      console.error('Connection test failed:', e);
    }
    
    setStatus('error');
    setError('Failed to connect to Jira. Please check your Domain, Email, and PAT.');
    return false;
  }, []);

  // Sync to localStorage and fetch profile on init
  useEffect(() => {
    if (config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // Re-fetch profile if we have a config but no user data yet
      if (!user && status === 'connected') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProfile(config);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, user, status]);

  const saveConfig = useCallback(async (newConfig: AuthConfig) => {
    const isWorking = await testConnection(newConfig);
    if (isWorking) {
      setConfig(newConfig);
      return true;
    }
    return false;
  }, [testConnection]);

  const disconnect = useCallback(() => {
    setConfig(null);
    setUser(null);
    setStatus('idle');
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ config, user, status, error, saveConfig, disconnect, testConnection }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
