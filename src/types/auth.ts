export interface AuthConfig {
  domain: string;
  email: string;
  apiToken: string;
}

export type AuthStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface AuthContextType {
  config: AuthConfig | null;
  status: AuthStatus;
  error: string | null;
  saveConfig: (config: AuthConfig) => Promise<boolean>;
  disconnect: () => void;
  testConnection: (config: AuthConfig) => Promise<boolean>;
}
