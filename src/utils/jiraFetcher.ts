import type { AuthConfig } from '../types/auth';
import type { WorklogEntry } from '../types/worklog';
import { jiraService } from '../services/jira';
import { format, parseISO, isWithinInterval } from 'date-fns';

export interface FetchParams {
  jql: string;
  startDate: string;
  endDate: string;
  authorName: string;
  defaultTime?: string;
}

export const jiraFetcher = {
  /**
   * Orchestrates the fetching and filtering of status change events
   */
  async fetchEvents(
    config: AuthConfig, 
    params: FetchParams, 
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<WorklogEntry[]> {
    const { jql, startDate, endDate, authorName, defaultTime = '8h' } = params;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // 1. Search for issues
    onProgress?.(0, 1, 'Searching for matching issues...');
    const allIssueKeys: string[] = [];
    let startAt = 0;
    
    while (true) {
      const data = await jiraService.searchIssues(config, jql, startAt);
      const issues = data.issues || [];
      allIssueKeys.push(...issues.map((i: { key: string }) => i.key));
      
      if (startAt + issues.length >= data.total) break;
      startAt += issues.length;
    }

    const entries: WorklogEntry[] = [];
    
    // 2. Iterate through issues and fetch changelogs
    for (let i = 0; i < allIssueKeys.length; i++) {
      const key = allIssueKeys[i];
      onProgress?.(i + 1, allIssueKeys.length, `Fetching history for ${key}...`);
      
      let changelogStartAt = 0;
      while (true) {
        const historyData = await jiraService.getIssueChangelog(config, key, changelogStartAt);
        const values = historyData.values || [];
        
        for (const history of values) {
          const author = (history.author || {}).displayName || '';
          const createdStr = history.created;
          const createdDate = parseISO(createdStr);

          // Filter by Author and Date Range
          if (author !== authorName) continue;
          if (!isWithinInterval(createdDate, { start, end })) continue;

          for (const item of history.items) {
            // Filter by "status" field
            if (item.field !== 'status') continue;

            const fromStr = item.fromString || 'None';
            const toString = item.toString || 'None';

            entries.push({
              id: crypto.randomUUID(),
              issueKey: key,
              date: format(createdDate, 'yyyy-MM-dd'),
              timeSpent: defaultTime,
              comment: `Status: ${fromStr} -> ${toString}`,
              status: 'ready',
              originalRowIndex: entries.length,
            });
          }
        }

        if (changelogStartAt + values.length >= historyData.total) break;
        changelogStartAt += values.length;
      }
    }

    return entries;
  }
};
