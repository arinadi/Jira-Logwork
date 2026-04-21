import Papa from 'papaparse';
import type { FieldMapping } from '../types/worklog';

export const csvParser = {
  /**
   * Parses a file using PapaParse
   */
  parseFile(file: File): Promise<Papa.ParseResult<string[]>> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false, // We'll handle mapping ourselves
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });
  },

  /**
   * Smart auto-mapping logic
   */
  autoMapHeaders(headers: string[]): FieldMapping {
    const mapping: FieldMapping = {
      issueKey: '',
      date: '',
      timeSpent: '',
      comment: '',
    };

    const normalize = (s: string) => s.toLowerCase().trim();

    headers.forEach((header) => {
      const h = normalize(header);
      
      // Issue Key mapping
      if (h.includes('issue id') || h.includes('issue key') || h.includes('key')) {
        mapping.issueKey = header;
      }
      // Date mapping
      else if (h.includes('date') || h.includes('day')) {
        mapping.date = header;
      }
      // Time mapping
      else if (h.includes('hour') || h.includes('time') || h.includes('duration') || h.includes('spent')) {
        mapping.timeSpent = header;
      }
      // Comment mapping
      else if (h.includes('comment') || h.includes('description') || h.includes('summary')) {
        mapping.comment = header;
      }
    });

    return mapping;
  }
};
