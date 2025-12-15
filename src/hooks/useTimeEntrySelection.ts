import { useState, useCallback } from 'react';
import { TimeEntryListItem } from '@/types/timeEntry';

/**
 * Hook for managing time entry selection state and operations
 * 
 * @param entries - Array of time entry items to manage selection for
 * @returns Object containing selection state and handlers
 * @returns {string[]} selectedIds - Array of selected time entry IDs
 * @returns {Function} setSelectedIds - Function to set selected IDs directly
 * @returns {Function} handleSelectAll - Handler for selecting/deselecting all entries
 * @returns {Function} handleSelectOne - Handler for selecting/deselecting a single entry
 * @returns {Function} clearSelection - Handler to clear all selections
 * 
 * @example
 * ```tsx
 * const selection = useTimeEntrySelection(timeEntries);
 * <Checkbox onCheckedChange={selection.handleSelectAll} />
 * ```
 */
export const useTimeEntrySelection = (entries: TimeEntryListItem[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(entries.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  }, [entries]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
  };
};

