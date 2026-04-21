# Module 6: Jira Event Fetcher (Auto-Log Generator)

- **Estimated Complexity**: M (~5 files)
- **Estimated Files**: `src/services/jira.ts`, `src/components/JiraFetchDialog.tsx`, `src/hooks/useJiraFetch.ts`
- **Key Risks**: Jira API rate limits, large changelog performance, mapping complexity.

## Requirements
Automatically generate worklog entries by scanning Jira issue changelogs for status changes within a date range.

## UI Structure
- **FetchButton**: Located near the "Import CSV" button.
- **JiraFetchDialog**: 
    - Start Date & End Date inputs.
    - Custom JQL field (pre-filled with Arinadi's signature query).
    - User display name filter.
    - "Fetch & Map" button.

## Technical Implementation
1. **Search**: Use `/rest/api/3/search` with JQL to find relevant issues.
2. **Changelog**: Use `/rest/api/3/issue/{key}/changelog` to fetch events.
3. **Filter**: Logic to iterate through `values` and `items`, filtering by:
    - Author (matched exactly or via account ID).
    - Created date (within selected range).
    - Field = "status".
4. **Transform**: Convert these events into `WorklogEntry` objects:
    - `issueKey`: {key}
    - `date`: {created_date}
    - `timeSpent`: "8h" (default per user script)
    - `comment`: "Status: {fromString} -> {toString}"
5. **Ingest**: Append these entries to the `useCSV` store.

## Testing
- [ ] Returns correct entries for a known issue with status changes.
- [ ] Filters out changes made by other users.
- [ ] Handles pagination for large search results and long changelogs.
- [ ] Success/Error notifications for the fetch process.
