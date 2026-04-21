# Module 1: Auth Bridge

- **Estimated Complexity**: M (~6 files)
- **Estimated Files**: `src/hooks/useAuth.ts`, `src/services/jira.ts`, `src/components/AuthPanel.tsx`
- **Key Risks**: OAuth 1.0 vs 2.0 confusion, CORS issues with Jira API.

## Requirements
Implementation of authentication mechanisms to connect with `gameloft.atlassian.net`.

## UI Structure
- **AuthPanel**: Persistent status indicator in header.
- **SettingsModal**: 
    - Domain input (e.g., `gameloft.atlassian.net`).
    - **[UPDATED] User Email input** (Required for API Token mode).
    - Toggle between OAuth 2.0 and API Token.
    - Token/Secret fields (obscured).
    - "Test Connection" button with success/fail status.

## Technical Implementation
- Store credentials in `localStorage`.
- Implement `useAuth` hook to provide headers to the rest of the app.
- Handle OAuth 2.0 redirect flow (capture `code` from URL).

## Testing
- [ ] Connect button triggers Jira login or validates token.
- [ ] Connectivity status correctly reflects "Connected" or "Error".
- [ ] Credentials persist across page refreshes.
