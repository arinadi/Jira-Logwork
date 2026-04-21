import Papa from 'papaparse';
import type { WorklogEntry } from '../types/worklog';

export const csvExporter = {
  /**
   * Generates a CSV of only rows that failed to sync
   */
  exportFailedRows(entries: WorklogEntry[]) {
    const failedRows = entries
      .filter((e) => e.status === 'failed' || e.status === 'error')
      .map((e) => ({
        'issue id': e.issueKey,
        date: e.date,
        hour: e.timeSpent,
        comment: e.comment,
        error: e.errorMessage || 'Unknown error',
      }));

    if (failedRows.length === 0) return;

    const csv = Papa.unparse(failedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `failed_worklogs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Generates a sample CSV for the user
   */
  downloadSampleCSV() {
    const sampleData = [
      { 'issue id': 'DESP-123', date: '2026-04-17', hour: '8h', comment: 'Morning standup and task execution' },
      { 'issue id': 'DESP-456', date: '2026-04-17', hour: '2h', comment: 'Reviewing PRs' },
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_logwork_jira.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Generic export for raw data objects
   */
  exportRawData(data: Record<string, unknown>[]) {
    if (data.length === 0) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jira_history_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
