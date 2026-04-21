import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthConfig, AuthContextType, AuthStatus } from '../types/auth';
import { jiraService } from '../services/jira';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'jira_logwork_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AuthConfig | null>(() => {
    const saved = localStorage.getItem('jira_auth_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved auth config', e);
      }
    }
    return null;
  });
  
  const [status, setStatus] = useState<AuthStatus>(config ? 'connected' : 'idle');
  const [error, setError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    if (config) {
      localStorage.setItem('jira_auth_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('jira_auth_config');
    }
  }, [config]);

  const testConnection = useCallback(async (testConfig: AuthConfig) => {
    setStatus('connecting');
    setError(null);
    const success = await jiraService.testConnection(testConfig);
    if (success) {
      setStatus('connected');
      return true;
    } else {
      setStatus('error');
      setError('Failed to connect to Jira. Please check your Domain, Email, and PAT.');
      return false;
    }
  }, []);

  const saveConfig = useCallback(async (newConfig: AuthConfig) => {
    const isWorking = await testConnection(newConfig);
    if (isWorking) {
      setConfig(newConfig);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      return true;
    }
    return false;
  }, [testConnection]);

  const disconnect = useCallback(() => {
    setConfig(null);
    setStatus('idle');
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ config, status, error, saveConfig, disconnect, testConnection }}>
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
