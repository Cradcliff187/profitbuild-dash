import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { TimeEntryListItem } from '@/types/timeEntry';
import { timeEntryColumnDefinitions } from '@/config/timeEntryColumns';

/**
 * Hook for managing time entry sorting state and operations
 * 
 * @param entries - Array of time entry items to sort
 * @returns Object containing sorting state, handlers, and sorted entries
 * @returns {string | null} sortColumn - Currently sorted column key, or null if no sorting
 * @returns {'asc' | 'desc'} sortDirection - Current sort direction
 * @returns {Function} handleSort - Handler for sorting by a column key
 * @returns {Function} renderSortIcon - Function to render sort icon for a column
 * @returns {TimeEntryListItem[]} sortedEntries - Sorted array of time entries
 * 
 * @example
 * ```tsx
 * const sorting = useTimeEntrySorting(timeEntries);
 * <TableHeader onClick={() => sorting.handleSort('date')}>
 *   Date {sorting.renderSortIcon('date')}
 * </TableHeader>
 * ```
 */
export const useTimeEntrySorting = (entries: TimeEntryListItem[]) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((columnKey: string) => {
    const column = timeEntryColumnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return;
    
    setSortColumn((prevColumn) => {
      if (prevColumn === columnKey) {
        setSortDirection((prevDir) => prevDir === 'asc' ? 'desc' : 'asc');
        return prevColumn;
      } else {
        setSortDirection('asc');
        return columnKey;
      }
    });
  }, []);

  const renderSortIcon = useCallback((columnKey: string) => {
    const column = timeEntryColumnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return null;
    
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />;
  }, [sortColumn, sortDirection]);

  const sortedEntries = useMemo(() => {
    if (!sortColumn || !entries) return entries;
    
    return [...entries].sort((a, b) => {
      let aValue, bValue;
      switch (sortColumn) {
        case 'worker':
          aValue = a.worker_name || '';
          bValue = b.worker_name || '';
          break;
        case 'employee_number':
          aValue = a.payee?.employee_number || '';
          bValue = b.payee?.employee_number || '';
          break;
        case 'project':
          aValue = a.project_number || '';
          bValue = b.project_number || '';
          break;
        case 'date':
          aValue = a.expense_date;
          bValue = b.expense_date;
          break;
        case 'hours':
          aValue = a.hours;
          bValue = b.hours;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.approval_status || '';
          bValue = b.approval_status || '';
          break;
        case 'submitted_at':
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [entries, sortColumn, sortDirection]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    renderSortIcon,
    sortedEntries,
  };
};
