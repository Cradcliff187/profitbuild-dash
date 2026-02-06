import { useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { TransactionCSVRow } from '@/utils/enhancedTransactionImporter';

export type TransactionStatus = 'new' | 'duplicate' | 'error' | 'unassigned';

export interface CategorizedTransaction {
  row: TransactionCSVRow;
  originalIndex: number;
  status: TransactionStatus;
  matchKey?: string;
  matchInfo?: string;
}

export interface TransactionSelectionTableProps {
  transactions: CategorizedTransaction[];
  selectedRows: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  statusFilter?: 'all' | 'new' | 'duplicate' | 'unassigned';
  searchQuery?: string;
}

const statusBadge = (status: TransactionStatus) => {
  switch (status) {
    case 'new':
      return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-[10px]">New</Badge>;
    case 'duplicate':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Duplicate</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
    case 'unassigned':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">Unassigned</Badge>;
  }
};

const formatAmount = (amountStr: string | undefined): string => {
  if (!amountStr) return '$0.00';
  const num = parseFloat(amountStr.replace(/[,$()]/g, ''));
  if (isNaN(num)) return amountStr;
  return `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const TransactionSelectionTable = ({
  transactions,
  selectedRows,
  onSelectionChange,
  statusFilter = 'all',
  searchQuery = '',
}: TransactionSelectionTableProps) => {
  const isMobile = useIsMobile();

  // Filter transactions by status and search
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(tx => {
        const name = (tx.row['Name'] || '').toLowerCase();
        const date = (tx.row['Date'] || '').toLowerCase();
        const amount = (tx.row['Amount'] || '').toLowerCase();
        const project = (tx.row['Project/WO #'] || '').toLowerCase();
        const account = (tx.row['Account name'] || '').toLowerCase();
        return name.includes(q) || date.includes(q) || amount.includes(q) || project.includes(q) || account.includes(q);
      });
    }

    return filtered;
  }, [transactions, statusFilter, searchQuery]);

  // Selectable filtered transactions (not error)
  const selectableFiltered = useMemo(
    () => filteredTransactions.filter(tx => tx.status !== 'error'),
    [filteredTransactions]
  );

  const allFilteredSelected = selectableFiltered.length > 0 &&
    selectableFiltered.every(tx => selectedRows.has(tx.originalIndex));

  const someFilteredSelected = selectableFiltered.some(tx => selectedRows.has(tx.originalIndex));

  const handleToggleAll = useCallback(() => {
    const next = new Set(selectedRows);
    if (allFilteredSelected) {
      // Deselect all visible
      selectableFiltered.forEach(tx => next.delete(tx.originalIndex));
    } else {
      // Select all visible
      selectableFiltered.forEach(tx => next.add(tx.originalIndex));
    }
    onSelectionChange(next);
  }, [selectedRows, allFilteredSelected, selectableFiltered, onSelectionChange]);

  const handleToggleRow = useCallback((originalIndex: number) => {
    const next = new Set(selectedRows);
    if (next.has(originalIndex)) {
      next.delete(originalIndex);
    } else {
      next.add(originalIndex);
    }
    onSelectionChange(next);
  }, [selectedRows, onSelectionChange]);

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 border rounded-lg bg-gray-50">
        No transactions match the current filter.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {/* Select all header */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border">
          <div className="min-w-[48px] min-h-[48px] flex items-center justify-center">
            <Checkbox
              checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
              onCheckedChange={handleToggleAll}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {allFilteredSelected ? 'Deselect' : 'Select'} all {selectableFiltered.length} visible
          </span>
        </div>

        {filteredTransactions.map((tx) => {
          const isError = tx.status === 'error';
          const isChecked = selectedRows.has(tx.originalIndex);
          const name = tx.row['Name']?.trim() || '(no name)';
          const amount = formatAmount(tx.row['Amount']);
          const date = tx.row['Date'] || '';
          const project = tx.row['Project/WO #']?.trim() || '';
          const isRevenue = tx.row['Transaction type'] === 'Invoice';

          return (
            <Card
              key={tx.originalIndex}
              className={cn(
                'transition-colors',
                isError && 'opacity-50',
                isChecked && !isError && 'border-blue-300 bg-blue-50/30'
              )}
            >
              <CardContent className="p-0">
                <label className="flex items-start gap-3 p-3 cursor-pointer">
                  <div className="min-w-[48px] min-h-[48px] flex items-center justify-center pt-0.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggleRow(tx.originalIndex)}
                      disabled={isError}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{name}</span>
                      <span className={cn('text-sm font-semibold whitespace-nowrap', isRevenue ? 'text-green-700' : 'text-gray-900')}>
                        {amount}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {date}
                      {project && <> &middot; {project}</>}
                      {isRevenue && <> &middot; Revenue</>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {statusBadge(tx.status)}
                      {tx.matchInfo && (
                        <span className="text-[10px] text-gray-400 truncate">{tx.matchInfo}</span>
                      )}
                    </div>
                  </div>
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[48px] text-center">
                <div className="flex items-center justify-center min-h-[48px]">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                    onCheckedChange={handleToggleAll}
                  />
                </div>
              </TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Name / Payee</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Project</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Match Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => {
              const isError = tx.status === 'error';
              const isChecked = selectedRows.has(tx.originalIndex);
              const name = tx.row['Name']?.trim() || '(no name)';
              const amount = formatAmount(tx.row['Amount']);
              const date = tx.row['Date'] || '';
              const project = tx.row['Project/WO #']?.trim() || '';
              const isRevenue = tx.row['Transaction type'] === 'Invoice';
              const txType = tx.row['Transaction type'] || '';

              return (
                <TableRow
                  key={tx.originalIndex}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isError && 'opacity-50 cursor-not-allowed',
                    isChecked && !isError && 'bg-blue-50/50'
                  )}
                  onClick={() => !isError && handleToggleRow(tx.originalIndex)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center min-h-[48px]">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleRow(tx.originalIndex)}
                        disabled={isError}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-2 whitespace-nowrap">{date}</TableCell>
                  <TableCell className="text-xs py-2 max-w-[180px] truncate">{name}</TableCell>
                  <TableCell className={cn('text-xs py-2 text-right font-medium whitespace-nowrap', isRevenue && 'text-green-700')}>
                    {amount}
                  </TableCell>
                  <TableCell className="text-xs py-2">{project || '—'}</TableCell>
                  <TableCell className="text-xs py-2 capitalize">{txType}</TableCell>
                  <TableCell className="text-xs py-2">{statusBadge(tx.status)}</TableCell>
                  <TableCell className="text-xs py-2 text-gray-400 max-w-[160px] truncate">{tx.matchInfo || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </div>
    </div>
  );
};
