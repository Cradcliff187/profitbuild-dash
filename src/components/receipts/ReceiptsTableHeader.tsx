import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { receiptColumnDefinitions } from '@/config/receiptColumns';

interface ReceiptsTableHeaderProps {
  visibleColumns: string[];
  displayColumns: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: string) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  renderSortIcon: (columnKey: string) => React.ReactNode;
}

export const ReceiptsTableHeader: React.FC<ReceiptsTableHeaderProps> = ({
  visibleColumns,
  displayColumns,
  sortColumn,
  sortDirection,
  onSort,
  onSelectAll,
  allSelected,
  renderSortIcon,
}) => {
  const widths: Record<string, string> = {
    preview: 'w-12',
    type: 'w-24',
    payee: 'w-40',
    project: 'w-48',
    date: 'w-28',
    amount: 'w-24',
    status: 'w-24',
    submitted_at: 'w-36',
    submitted_by: 'w-32',
    description: 'max-w-xs',
    actions: 'w-20'
  };
  
  const alignments: Record<string, string> = {
    amount: 'text-right',
    actions: 'text-right'
  };
  
  const labels: Record<string, string> = {
    preview: 'Preview',
    type: 'Type',
    payee: 'Vendor',
    project: 'Project',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    submitted_at: 'Submitted At',
    submitted_by: 'Submitted By',
    description: 'Description',
    actions: 'Actions'
  };

  return (
    <TableHeader className="sticky top-0 bg-muted z-20 border-b">
      <TableRow className="h-8">
        <TableHead className="w-10 p-2 text-xs">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
        </TableHead>
        {displayColumns.map(colKey => {
          if (!visibleColumns.includes(colKey)) return null;
          
          const column = receiptColumnDefinitions.find(c => c.key === colKey);
          const isSortable = column?.sortable;
      
          return (
            <TableHead 
              key={colKey} 
              className={cn(
                `p-2 text-xs font-medium h-8 ${widths[colKey]} ${alignments[colKey] || ''}`,
                isSortable && "cursor-pointer hover:text-foreground select-none"
              )}
              onClick={() => isSortable && onSort(colKey)}
            >
              <div className={cn(
                "flex items-center",
                alignments[colKey] === 'text-right' && "justify-end"
              )}>
                {labels[colKey]}
                {renderSortIcon(colKey)}
              </div>
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
};

