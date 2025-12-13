import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { cn, formatCurrency } from '@/lib/utils';
import { TimeEntryListItem } from '@/types/timeEntry';
import { TimeEntriesTableHeader } from './TimeEntriesTableHeader';
import { TimeEntriesTableRow } from './TimeEntriesTableRow';

interface TimeEntriesTableProps {
  entries: TimeEntryListItem[];
  visibleColumns: string[];
  columnOrder: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  selectedIds: string[];
  onSort: (columnKey: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onApprove: (entryId: string) => void;
  onReject: (entryId: string) => void;
  onEdit: (entry: TimeEntryListItem) => void;
  onViewProject: (projectId: string | null) => void;
  totalCount: number;
  totalHours: number;
  totalAmount: number;
  loading: boolean;
  pageSize: number;
  setPageSize: (size: number) => void;
  pagination: {
    currentPage: number;
    goToPage: (page: number) => void;
  };
  renderSortIcon: (columnKey: string) => React.ReactNode;
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = ({
  entries,
  visibleColumns,
  columnOrder,
  sortColumn,
  sortDirection,
  selectedIds,
  onSort,
  onSelectAll,
  onSelectOne,
  onApprove,
  onReject,
  onEdit,
  onViewProject,
  totalCount,
  totalHours,
  totalAmount,
  loading,
  pageSize,
  setPageSize,
  pagination,
  renderSortIcon,
}) => {
  const allSelected = selectedIds.length === entries.length && entries.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table>
            <TimeEntriesTableHeader
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              onSelectAll={onSelectAll}
              allSelected={allSelected}
              renderSortIcon={renderSortIcon}
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-xs">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="text-center py-4 text-xs text-muted-foreground"
                  >
                    No time entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TimeEntriesTableRow
                    key={entry.id}
                    entry={entry}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    selected={selectedIds.includes(entry.id)}
                    onSelect={(checked) => onSelectOne(entry.id, checked)}
                    onEdit={onEdit}
                    onApprove={onApprove}
                    onReject={onReject}
                    onViewProject={onViewProject}
                  />
                ))
              )}
            </TableBody>
            
            {/* Footer with totals */}
            <TableFooter className="border-t bg-muted/30">
              <TableRow>
                {/* Checkbox column - matches header structure */}
                <TableCell className="p-1.5"></TableCell>
                
                {columnOrder.map((colKey) => {
                  if (!visibleColumns.includes(colKey)) return null;
                  
                  const alignments: Record<string, string> = {
                    start: "text-center",
                    end: "text-center",
                    hours: "text-right",
                    lunch: "text-center",
                    amount: "text-right",
                    receipt: "text-center",
                    actions: "text-right",
                  };
                  
                  const alignmentClass = alignments[colKey] || '';
                  
                  if (colKey === 'project') {
                    return (
                      <TableCell key={colKey} className={cn("p-1.5 font-medium text-xs", alignmentClass)}>
                        Total ({totalCount} {totalCount === 1 ? 'entry' : 'entries'}):
                      </TableCell>
                    );
                  } else if (colKey === 'hours') {
                    return (
                      <TableCell key={colKey} className={cn("p-1.5 font-mono font-medium text-xs", alignmentClass)}>
                        {totalHours.toFixed(2)}
                      </TableCell>
                    );
                  } else if (colKey === 'amount') {
                    return (
                      <TableCell key={colKey} className={cn("p-1.5 font-mono font-medium text-xs", alignmentClass)}>
                        {formatCurrency(totalAmount, { showCents: true })}
                      </TableCell>
                    );
                  } else {
                    return <TableCell key={colKey} className={cn("p-1.5", alignmentClass)}></TableCell>;
                  }
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="p-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  pagination.goToPage(1);
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
            {totalCount > pageSize && (
              <CompletePagination
                currentPage={pagination.currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={pagination.goToPage}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
