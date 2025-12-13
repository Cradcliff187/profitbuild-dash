import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { receiptColumnDefinitions } from '@/config/receiptColumns';
import { UnifiedReceipt } from './useReceiptsData';

/**
 * Hook for managing receipt sorting state and operations
 * 
 * @param filteredReceipts - Array of filtered receipts to sort
 * @returns Object containing sorting state, handlers, and sorted receipts
 * @returns {string | null} sortColumn - Currently sorted column key, or null if no sorting
 * @returns {'asc' | 'desc'} sortDirection - Current sort direction
 * @returns {Function} handleSort - Handler for sorting by a column key
 * @returns {Function} renderSortIcon - Function to render sort icon for a column
 * @returns {UnifiedReceipt[]} sortedReceipts - Sorted array of receipts
 * 
 * @example
 * ```tsx
 * const sorting = useReceiptSorting(filteredReceipts);
 * <TableHeader onClick={() => sorting.handleSort('amount')}>
 *   Amount {sorting.renderSortIcon('amount')}
 * </TableHeader>
 * ```
 */
export const useReceiptSorting = (filteredReceipts: UnifiedReceipt[]) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((columnKey: string) => {
    const column = receiptColumnDefinitions.find(col => col.key === columnKey);
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
    const column = receiptColumnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return null;
    
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />;
  }, [sortColumn, sortDirection]);

  const sortedReceipts = useMemo(() => {
    if (!sortColumn) return filteredReceipts;
    
    return [...filteredReceipts].sort((a, b) => {
      let aValue, bValue;
      switch (sortColumn) {
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'payee':
          aValue = a.payee_name || '';
          bValue = b.payee_name || '';
          break;
        case 'project':
          aValue = a.project_number || '';
          bValue = b.project_number || '';
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.approval_status || 'pending';
          bValue = b.approval_status || 'pending';
          break;
        case 'submitted_at':
          aValue = a.submitted_for_approval_at ? new Date(a.submitted_for_approval_at).getTime() : 0;
          bValue = b.submitted_for_approval_at ? new Date(b.submitted_for_approval_at).getTime() : 0;
          break;
        case 'submitted_by':
          aValue = a.submitted_by_name || '';
          bValue = b.submitted_by_name || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        default:
          return 0;
      }
      
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredReceipts, sortColumn, sortDirection]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    renderSortIcon,
    sortedReceipts,
  };
};
