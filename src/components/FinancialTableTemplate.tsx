import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Eye, Edit, Trash2, ChevronsUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface FinancialTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  getSortValue?: (item: T) => string | number;
}

export interface FinancialTableGroup<T> {
  groupKey: string;
  groupLabel: string;
  groupLabelCollapsed?: string;
  items: T[];
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

interface FinancialTableTemplateProps<T> {
  data: T[] | FinancialTableGroup<T>[];
  columns: FinancialTableColumn<T>[];
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  getItemId: (item: T) => string;
  isGrouped?: boolean;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  showActions?: boolean;
  sortable?: boolean;
  collapseAllButton?: React.ReactNode;
  collapsedGroups?: Set<string>;
  onCollapsedGroupsChange?: (groups: Set<string>) => void;
}

export function FinancialTableTemplate<T>({
  data,
  columns,
  onView,
  onEdit,
  onDelete,
  getItemId,
  isGrouped = false,
  className,
  emptyMessage = "No data available",
  emptyIcon,
  showActions = true,
  sortable = true,
  collapseAllButton,
  collapsedGroups: externalCollapsedGroups,
  onCollapsedGroupsChange,
}: FinancialTableTemplateProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [internalCollapsedGroups, setInternalCollapsedGroups] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const collapsedGroups = externalCollapsedGroups ?? internalCollapsedGroups;
  const setCollapsedGroups = onCollapsedGroupsChange ?? setInternalCollapsedGroups;

  const handleSort = (columnKey: string) => {
    if (!sortable) return; // Table-level check
    
    // Column-level check
    const column = columns.find(col => col.key === columnKey);
    if (!column || column.sortable === false) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data when sortColumn or sortDirection changes
  const sortedData = useMemo(() => {
    if (!sortColumn) {
      return data;
    }

    const sortedColumn = columns.find(col => col.key === sortColumn);
    if (!sortedColumn) return data;

    // Handle grouped data
    if (isGrouped) {
      const groups = data as FinancialTableGroup<T>[];
      
      const sortedGroups = groups.map(group => {
        const sortedItems = [...group.items].sort((a, b) => {
          let aValue: any;
          let bValue: any;

          if (sortedColumn.getSortValue) {
            aValue = sortedColumn.getSortValue(a);
            bValue = sortedColumn.getSortValue(b);
          } else {
            aValue = (a as any)[sortColumn];
            bValue = (b as any)[sortColumn];
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

        return { ...group, items: sortedItems };
      });

      return sortedGroups;
    }

    // Handle ungrouped data
    const items = data as T[];
    const sortedItems = [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortedColumn.getSortValue) {
        aValue = sortedColumn.getSortValue(a);
        bValue = sortedColumn.getSortValue(b);
      } else {
        aValue = (a as any)[sortColumn];
        bValue = (b as any)[sortColumn];
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

    return sortedItems;
  }, [data, isGrouped, sortColumn, sortDirection, columns]);

  const toggleGroupCollapse = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortable || sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1" /> : 
      <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const renderTableHeader = () => (
    <TableHeader className="sticky top-0 bg-card z-10 border-b">
      <TableRow className="border-b border-border/50 hover:bg-transparent">
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={cn(
              "text-xs font-semibold text-foreground/80 px-2 py-2 h-9",
              column.align === 'right' && "text-right",
              column.align === 'center' && "text-center",
              column.className,
              sortable && column.sortable !== false && "cursor-pointer hover:text-foreground transition-colors select-none",
              column.width && `w-[${column.width}]`
            )}
            style={column.width ? { width: column.width } : undefined}
            onClick={() => column.sortable !== false && handleSort(column.key)}
          >
            <div className={cn(
              "flex items-center",
              column.align === 'right' && "justify-end",
              column.align === 'center' && "justify-center"
            )}>
              {column.label}
              {renderSortIcon(column.key)}
            </div>
          </TableHead>
        ))}
        {showActions && (
          <TableHead className="text-xs font-semibold text-foreground/80 px-2 py-2 h-9 w-[100px] text-center">
            Actions
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );

  const renderTableRow = (item: T, index: number, isGroupHeader = false) => (
    <TableRow
      key={getItemId(item)}
      className={cn(
        "border-b border-border/30 hover:bg-muted/30 transition-colors",
        isGroupHeader && "bg-muted/20 font-medium",
        index % 2 === 0 && "bg-background/50"
      )}
    >
      {columns.map((column) => (
        <TableCell
          key={column.key}
          className={cn(
            "text-xs px-2 py-1",
            column.align === 'right' && "text-right tabular-nums",
            column.align === 'center' && "text-center",
            column.className
          )}
        >
          {column.render ? column.render(item) : (item as any)[column.key]}
        </TableCell>
      ))}
      {showActions && (
        <TableCell className="px-2 py-1 w-[100px]">
          <div className="flex items-center justify-center gap-1">
            {onView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary/10"
                onClick={() => onView(item)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary/10"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteClick(getItemId(item))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  const renderGroupedData = () => {
    const groups = sortedData as FinancialTableGroup<T>[];
    
    return groups.map((group) => {
      const isCollapsed = collapsedGroups.has(group.groupKey);
      
      return (
        <React.Fragment key={group.groupKey}>
          {/* Group Header */}
          <TableRow className="bg-muted/50 border-b-2 border-primary/20 hover:bg-muted/70">
            <TableCell
              colSpan={columns.length + (showActions ? 1 : 0)}
              className="px-3 py-2 font-semibold text-xs text-foreground"
            >
              <div className="flex items-center gap-2">
                {group.isCollapsible !== false && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupCollapse(group.groupKey);
                    }}
                  >
                    {isCollapsed ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronUp className="h-3 w-3" />
                    }
                  </Button>
              )}
              <span>{group.groupLabel}</span>
              {group.items.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  {group.items.length}
                </Badge>
              )}
              </div>
            </TableCell>
          </TableRow>
          
          {/* Group Items */}
          {!isCollapsed && group.items.map((item, index) => renderTableRow(item, index))}
        </React.Fragment>
      );
    });
  };

  const renderSimpleData = () => {
    const items = sortedData as T[];
    return items.map((item, index) => renderTableRow(item, index));
  };

  if ((isGrouped ? (sortedData as FinancialTableGroup<T>[]).length === 0 : (sortedData as T[]).length === 0)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyIcon && <div className="mb-4 flex justify-center">{emptyIcon}</div>}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("border border-border/50 rounded-lg bg-card overflow-hidden", className)}>
        {collapseAllButton && isGrouped && (
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-end">
            {collapseAllButton}
          </div>
        )}
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[600px] w-full">
          <div className="mobile-table-wrapper">
            <Table className="min-w-[800px] w-full">
              {renderTableHeader()}
              <TableBody>
                {isGrouped ? renderGroupedData() : renderSimpleData()}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}