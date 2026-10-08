import { useState, useCallback, useEffect } from 'react';
import type { WorklogEntry, FieldMapping } from '../types/worklog';
import { csvParser } from '../utils/csvParser';
import { mergeFetchedEntries } from '../utils/mergeEntries';
import { copyEntryToDays } from '../utils/copyEntry';
import { loadWorkspace, saveWorkspace } from '../utils/workspaceStorage';

export const useCSV = () => {
  const [entries, setEntries] = useState<WorklogEntry[]>(() => loadWorkspace(localStorage));
  const [isMapping, setIsMapping] = useState(false);
  const [pendingData, setPendingData] = useState<{ headers: string[], rows: string[][] } | null>(null);

  // Every change is written through, so a reload or a closed tab never loses unsynced rows.
  useEffect(() => {
    saveWorkspace(localStorage, entries);
  }, [entries]);

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

  // The user reviewed the day's guesses: they become normal rows that a batch sync may post.
  const acceptSuggestions = useCallback((date: string) => {
    setEntries(prev => prev.map(e => (e.date === date && e.suggestion ? { ...e, suggestion: undefined } : e)));
  }, []);

  const copyEntryToDates = useCallback((id: string, dates: string[]) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === id);
      return entry ? [...prev, ...copyEntryToDays(entry, dates, prev)] : prev;
    });
  }, []);

  const clearEntries = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all imported logs?')) {
      setEntries([]);
    }
  }, []);

  const addEntries = useCallback((newEntries: WorklogEntry[]) => {
    setEntries(prev => mergeFetchedEntries(prev, newEntries));
  }, []);

  return {
    entries,
    isMapping,
    pendingData,
    importFile,
    applyMapping,
    updateEntry,
    removeEntry,
    copyEntryToDates,
    acceptSuggestions,
    clearEntries,
    addEntries,
    cancelMapping: () => {
      setPendingData(null);
      setIsMapping(false);
    }
  };
};
