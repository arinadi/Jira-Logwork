import type { AuthConfig } from '../types/auth';
import { jiraService } from './jira';

export interface ComponentCheck {
  allowed: boolean;
  components: string[];
}

/**
 * Checks an issue's components right before a worklog is posted. Rows can come from a CSV or a typed key,
 * so the scan's filter alone cannot keep worklogs off other components. One lookup per issue per guard.
 */
export function createComponentGuard(config: AuthConfig, allowedComponents: string[]) {
  const allowed = new Set(allowedComponents.map(c => c.toLowerCase()));
  const cache = new Map<string, Promise<ComponentCheck>>();

  return (issueKey: string): Promise<ComponentCheck> => {
    if (allowed.size === 0) return Promise.resolve({ allowed: true, components: [] });
    let check = cache.get(issueKey);
    if (!check) {
      check = jiraService.getIssueComponents(config, issueKey).then(components => ({
        allowed: components.some(c => allowed.has(c.toLowerCase())),
        components,
      }));
      // A failed lookup must not stay cached as an answer; the next sync asks again.
      check.catch(() => cache.delete(issueKey));
      cache.set(issueKey, check);
    }
    return check;
  };
}
