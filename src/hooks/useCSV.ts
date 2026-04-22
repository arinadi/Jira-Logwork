import { useState, useCallback } from 'react';
import { parseISO, addDays, format } from 'date-fns';
import type { WorklogEntry, FieldMapping } from '../types/worklog';
import { csvParser } from '../utils/csvParser';

export const useCSV = () => {
  const [entries, setEntries] = useState<WorklogEntry[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [pendingData, setPendingData] = useState<{ headers: string[], rows: string[][] } | null>(null);

  const importFile = useCallback(async (file: File) => {
    const result = await csvParser.parseFile(file);
    if (result.data.length < 2) return;

    const headers = result.data[0];
    const rows = result.data.slice(1);

    setPendingData({ headers, rows });
    setIsMapping(true);
  }, []);

  const applyMapping = useCallback((mapping: FieldMapping) => {
    if (!pendingData) return;

    const { headers, rows } = pendingData;
    const headerIndices = {
      issueKey: headers.indexOf(mapping.issueKey),
      date: headers.indexOf(mapping.date),
      timeSpent: headers.indexOf(mapping.timeSpent),
      comment: headers.indexOf(mapping.comment),
    };

    const newEntries: WorklogEntry[] = rows.map((row, index) => ({
      id: crypto.randomUUID(),
      issueKey: row[headerIndices.issueKey] || '',
      date: row[headerIndices.date] || '',
      timeSpent: row[headerIndices.timeSpent] || '',
      comment: headerIndices.comment !== -1 ? row[headerIndices.comment] || '' : '',
      status: 'ready',
      originalRowIndex: index,
    }));

    setEntries(prev => [...prev, ...newEntries]);
    setPendingData(null);
    setIsMapping(false);
  }, [pendingData]);

  const updateEntry = useCallback((id: string, updates: Partial<WorklogEntry>) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const cloneEntry = useCallback((id: string) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;

      let nextDateStr = entry.date;
      try {
        const date = parseISO(entry.date);
        const nextDate = addDays(date, 1);
        nextDateStr = format(nextDate, 'yyyy-MM-dd');
      } catch (e) {
        console.warn('Failed to parse date for cloning:', entry.date);
      }
      
      const newEntry: WorklogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        date: nextDateStr,
        timeSpent: '8h',
        comment: entry.comment,
        status: 'ready',
        originalRowIndex: prev.length,
      };

      const index = prev.findIndex(e => e.id === id);
      const nextEntries = [...prev];
      nextEntries.splice(index + 1, 0, newEntry);
      return nextEntries;
    });
  }, []);

  const clearEntries = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all imported logs?')) {
      setEntries([]);
    }
  }, []);

  const addEntries = useCallback((newEntries: WorklogEntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
  }, []);

  return {
    entries,
    isMapping,
    pendingData,
    importFile,
    applyMapping,
    updateEntry,
    removeEntry,
    cloneEntry,
    clearEntries,
    addEntries,
    cancelMapping: () => {
      setPendingData(null);
      setIsMapping(false);
    }
  };
};
