import React from 'react';
import { format } from 'date-fns';
import { Edit, CheckCircle, XCircle, Eye, MoreHorizontal, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TimeEntryListItem } from '@/types/timeEntry';
import { parseDateOnly } from '@/utils/dateUtils';

interface TimeEntriesTableRowProps {
  entry: TimeEntryListItem;
  visibleColumns: string[];
  columnOrder: string[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: (entry: TimeEntryListItem) => void;
  onApprove: (entryId: string) => void;
  onReject: (entryId: string) => void;
  onViewProject: (projectId: string | null) => void;
}

const getStatusBadge = (status: string | null) => {
  if (!status || status === "pending") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300">
        Rejected
      </Badge>
    );
  }
  return null;
};

const TimeEntriesTableRowComponent: React.FC<TimeEntriesTableRowProps> = ({
  entry,
  visibleColumns,
  columnOrder,
  selected,
  onSelect,
  onEdit,
  onApprove,
  onReject,
  onViewProject,
}) => {
  return (
    <TableRow className="h-9 hover:bg-muted/50 even:bg-muted/20">
      <TableCell className="p-1.5">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
        />
      </TableCell>
      {columnOrder.map((colKey) => {
        if (!visibleColumns.includes(colKey)) return null;

        switch (colKey) {
          case "worker":
            return (
              <TableCell key={colKey} className="p-1.5 text-xs font-medium">
                {entry.worker_name}
              </TableCell>
            );
          case "employee_number":
            return (
              <TableCell key={colKey} className="p-1.5 text-xs text-muted-foreground">
                {entry.payee?.employee_number || "-"}
              </TableCell>
            );
          case "project":
            return (
              <TableCell key={colKey} className="p-1.5">
                <div className="text-xs leading-tight">
                  <div className="font-medium">{entry.project_number}</div>
                  <div className="text-muted-foreground text-[10px]">{entry.project_name}</div>
                  <div className="text-muted-foreground text-[10px]">{entry.client_name}</div>
                </div>
              </TableCell>
            );
          case "address":
            return (
              <TableCell key={colKey} className="p-1.5 text-xs text-muted-foreground">
                {entry.project_address || "-"}
              </TableCell>
            );
          case "date":
            return (
              <TableCell key={colKey} className="p-1.5 text-xs">
                {format(parseDateOnly(entry.expense_date), "MMM dd, yyyy")}
              </TableCell>
            );
          case "start":
            return (
              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-center">
                {entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "-"}
              </TableCell>
            );
          case "end":
            return (
              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-center">
                {entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "-"}
              </TableCell>
            );
          case "gross_hours":
            return (
              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right text-muted-foreground">
                {entry.gross_hours?.toFixed(2) || entry.hours.toFixed(2)}
              </TableCell>
            );
          case "hours":
            return (
              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                {entry.hours.toFixed(2)}
              </TableCell>
            );
          case "lunch":
            const isPTO = ['006-SICK', '007-VAC', '008-HOL'].includes(entry.project_number);
            
            if (isPTO) {
              return <TableCell key={colKey} className="p-1.5 text-center">-</TableCell>;
            }
            
            return (
              <TableCell key={colKey} className="p-1.5">
                <div className="flex justify-center">
                  {entry.lunch_taken && entry.lunch_duration_minutes ? (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px]">
                      <span>✓ {entry.lunch_duration_minutes}m</span>
                    </div>
                  ) : (entry.gross_hours && entry.gross_hours > 6) ? (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px]">
                      <span>⚠ No lunch</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>No lunch</span>
                    </div>
                  )}
                </div>
              </TableCell>
            );
          case "amount":
            return (
              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right font-semibold">
                ${entry.amount.toFixed(2)}
              </TableCell>
            );
          case "receipt":
            return (
              <TableCell key={colKey} className="p-1.5 text-center">
                {entry.attachment_url ? (
                  <Paperclip className="h-3 w-3 text-blue-600 inline-block" />
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
            );
          case "status":
            return (
              <TableCell key={colKey} className="p-1.5">
                {getStatusBadge(entry.approval_status)}
              </TableCell>
            );
          case "submitted_at":
            return (
              <TableCell key={colKey} className="p-1.5 text-xs">
                {format(new Date(entry.created_at), "MMM dd, yyyy HH:mm")}
              </TableCell>
            );
          case "actions":
            return (
              <TableCell key={colKey} className="p-1.5 text-right">
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(entry)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Time Entry
                      </DropdownMenuItem>
                      {(!entry.approval_status || entry.approval_status === "pending") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onApprove(entry.id)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReject(entry.id)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onViewProject(entry.project_id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            );
          default:
            return null;
        }
      })}
    </TableRow>
  );
};

export const TimeEntriesTableRow = React.memo(TimeEntriesTableRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.visibleColumns.length === nextProps.visibleColumns.length &&
    prevProps.columnOrder.length === nextProps.columnOrder.length &&
    JSON.stringify(prevProps.visibleColumns) === JSON.stringify(nextProps.visibleColumns) &&
    JSON.stringify(prevProps.columnOrder) === JSON.stringify(nextProps.columnOrder)
  );
});
