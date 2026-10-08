import { describe, it, expect } from 'vitest';
import { defaultScanJql } from './scanDefaults';

describe('defaultScanJql', () => {
  it('limits the activity part to the allowed components but keeps all own worklogs', () => {
    const jql = defaultScanJql('2026-10-01', '2026-10-08', ['DES-Systems', 'Anoman']);

    expect(jql).toBe(
      'worklogAuthor = currentUser() AND worklogDate >= "2026-10-01" AND worklogDate <= "2026-10-08"'
      + ' OR (status CHANGED BY currentUser() DURING ("2026-10-01", "2026-10-09")'
      + ' OR watcher = currentUser() AND updated >= "2026-10-01") AND component in ("DES-Systems", "Anoman")'
    );
  });

  it('has no component clause when every component is allowed', () => {
    expect(defaultScanJql('2026-10-01', '2026-10-08', [])).not.toContain('component');
  });
});
