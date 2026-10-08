/** Only the site: the extension authenticates with the browser's Jira login session. */
export interface AuthConfig {
  domain: string;
}

export type AuthStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface JiraUser {
  accountId: string;
  accountType: string;
  emailAddress: string;
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
  avatarUrls: {
    '48x48': string;
    '32x32': string;
    '24x24': string;
    '16x16': string;
  };
}

export interface AuthContextType {
  config: AuthConfig | null;
  user: JiraUser | null;
  status: AuthStatus;
  error: string | null;
  saveConfig: (config: AuthConfig) => Promise<boolean>;
  disconnect: () => void;
  testConnection: (config: AuthConfig) => Promise<boolean>;
}
