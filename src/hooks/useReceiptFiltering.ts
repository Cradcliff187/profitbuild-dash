import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ReceiptFilters } from '@/components/ReceiptSearchFilters';
import { UnifiedReceipt } from './useReceiptsData';

/**
 * Hook for filtering receipts based on various criteria
 * 
 * Applies filters for date range, status, amount, payee, and project.
 * Uses memoization to avoid unnecessary recalculations.
 * 
 * @param allReceipts - Array of all receipts to filter
 * @param filters - Filter criteria object
 * @param filters.dateFrom - Start date for date range filter (optional)
 * @param filters.dateTo - End date for date range filter (optional)
 * @param filters.status - Array of status values to include (optional)
 * @param filters.payeeIds - Array of payee IDs to include (optional)
 * @param filters.projectIds - Array of project IDs to include (optional)
 * @param filters.amount - Amount filter string (optional)
 * @returns Object containing filtered receipts
 * @returns {UnifiedReceipt[]} filteredReceipts - Array of receipts matching the filters
 * 
 * @example
 * ```tsx
 * const { filteredReceipts } = useReceiptFiltering(allReceipts, {
 *   status: ['pending'],
 *   dateFrom: '2024-01-01'
 * });
 * ```
 */
export const useReceiptFiltering = (
  allReceipts: UnifiedReceipt[],
  filters: ReceiptFilters
) => {
  const filteredReceipts = useMemo(() => {
    return allReceipts.filter(r => {
      // Date range filter
      if (filters.dateFrom && new Date(r.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(r.date) > new Date(filters.dateTo)) return false;
      
      // Status filter
      const receiptStatus = r.approval_status || 'pending';
      if (filters.status.length > 0 && !filters.status.includes(receiptStatus)) return false;
      
      // Amount filter - matches formatted currency string or numeric value
      if (filters.amount) {
        const amountStr = filters.amount.toLowerCase();
        const formattedAmount = formatCurrency(r.amount).toLowerCase();
        const numericAmount = r.amount.toString();
        const numericSearch = amountStr.replace(/[^0-9.]/g, '');
        
        if (!formattedAmount.includes(amountStr) && 
            !numericAmount.includes(numericSearch)) {
          return false;
        }
      }
      
      // Payee filter
      if (filters.payeeIds.length > 0 && !filters.payeeIds.includes(r.payee_id)) return false;
      
      // Project filter
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(r.project_id)) return false;
      
      return true;
    });
  }, [allReceipts, filters]);

  return { filteredReceipts };
};
