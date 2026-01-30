import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { timeEntryColumnDefinitions } from '@/config/timeEntryColumns';

interface TimeEntriesTableHeaderProps {
  visibleColumns: string[];
  columnOrder: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: string) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  renderSortIcon: (columnKey: string) => React.ReactNode;
}

export const TimeEntriesTableHeader: React.FC<TimeEntriesTableHeaderProps> = ({
  visibleColumns,
  columnOrder,
  sortColumn,
  sortDirection,
  onSort,
  onSelectAll,
  allSelected,
  renderSortIcon,
}) => {
  const widths: Record<string, string> = {
    worker: "w-32",
    employee_number: "w-28",
    project: "w-48",
    address: "w-40",
    date: "w-28",
    start: "w-20",
    end: "w-20",
    gross_hours: "w-24",
    hours: "w-20",
    lunch: "w-16",
    amount: "w-24",
    receipt: "w-16",
    status: "w-24",
    submitted_at: "w-36",
    actions: "w-20",
  };
  
  const alignments: Record<string, string> = {
    start: "text-center",
    end: "text-center",
    gross_hours: "text-right",
    hours: "text-right",
    lunch: "text-center",
    amount: "text-right",
    receipt: "text-center",
    actions: "text-right",
  };
  
  const labels: Record<string, string> = {
    worker: "Worker",
    employee_number: "Employee #",
    project: "Project",
    address: "Address",
    date: "Date",
    start: "Start",
    end: "End",
    gross_hours: "Gross Hours",
    hours: "Net Hours",
    lunch: "Lunch",
    amount: "Amount",
    receipt: "Receipt",
    status: "Status",
    submitted_at: "Submitted At",
    actions: "Actions",
  };

  return (
    <TableHeader className="sticky top-0 bg-muted z-20 border-b">
      <TableRow className="h-8">
        <TableHead className="w-10 p-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
        </TableHead>
        {columnOrder.map((colKey) => {
          if (!visibleColumns.includes(colKey)) return null;
          
          const column = timeEntryColumnDefinitions.find(col => col.key === colKey);
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
                alignments[colKey] === "text-right" && "justify-end",
                alignments[colKey] === "text-center" && "justify-center"
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
