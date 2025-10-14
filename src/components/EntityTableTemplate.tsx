import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
}

interface EntityTableTemplateProps {
  title: string;
  description?: string;
  data: any[];
  columns: Column[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onView?: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete?: (id: string) => void;
  bulkActions?: React.ReactNode;
  filters?: React.ReactNode;
  emptyMessage?: string;
  noResultsMessage?: string;
  // Pagination props
  enablePagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  // Sorting props
  enableSorting?: boolean;
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

export const EntityTableTemplate: React.FC<EntityTableTemplateProps> = ({
  title,
  description,
  data,
  columns,
  isLoading,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  bulkActions,
  filters,
  emptyMessage = "No items found.",
  noResultsMessage = "No items match your current filters.",
  enablePagination = false,
  pageSize = 25,
  currentPage,
  onPageChange,
  enableSorting = false,
  defaultSortColumn,
  defaultSortDirection = 'asc',
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortColumn || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const handleSort = (columnKey: string) => {
    if (!enableSorting) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!enableSorting || !sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortColumn, sortDirection, enableSorting]);

  const renderSortIcon = (columnKey: string) => {
    if (!enableSorting || sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1 inline" /> : 
      <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };
  // Pagination logic
  const pagination = usePagination({
    totalItems: sortedData.length,
    pageSize: pageSize,
    initialPage: currentPage || 1,
  });

  // Use external pagination if provided, otherwise use internal pagination
  const paginationState = enablePagination && !onPageChange ? pagination : null;
  const currentPageValue = onPageChange ? (currentPage || 1) : (paginationState?.currentPage || 1);
  const handlePageChange = onPageChange || paginationState?.goToPage || (() => {});

  // Calculate displayed data based on pagination
  const displayedData = enablePagination 
    ? sortedData.slice(
        (currentPageValue - 1) * pageSize,
        currentPageValue * pageSize
      )
    : sortedData;

  const totalPages = Math.ceil(sortedData.length / pageSize);

  if (isLoading) {
    return (
      <LoadingSpinner 
        variant="spinner" 
        size="md" 
        message="Loading..." 
        className="py-8" 
      />
    );
  }

  const allSelected = displayedData.length > 0 && selectedItems.length === displayedData.length;
  const someSelected = selectedItems.length > 0;

  return (
    <div className="space-y-6">
      {filters && (
        <div className="space-y-4">
          {filters}
        </div>
      )}

      {bulkActions && someSelected && (
        <div className="flex items-center gap-4">
          {bulkActions}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </div>
          ) : displayedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {noResultsMessage}
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)] min-h-[600px] w-full">
              <div className="mobile-table-wrapper">
                <Table className="min-w-[800px] w-full">
                  <TableHeader className="sticky top-0 bg-card z-10 border-b">
                    <TableRow className="h-table-header">
                      <TableHead className="w-8 p-compact">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={onSelectAll}
                          aria-label="Select all items"
                        />
                      </TableHead>
                      {columns.map((column) => (
                        <TableHead 
                          key={column.key} 
                          className={cn(
                            "p-compact text-label font-medium",
                            enableSorting && column.sortable !== false && "cursor-pointer hover:text-foreground select-none"
                          )}
                          onClick={() => column.sortable !== false && handleSort(column.key)}
                        >
                          <div className="flex items-center">
                            {column.label}
                            {renderSortIcon(column.key)}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 p-compact text-label">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedData.map((item, index) => (
                      <TableRow key={item.id} className="h-table-row-dense data-table-row">
                        <TableCell className="p-compact">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => onSelectItem(item.id)}
                            aria-label={`Select ${item.name || item.client_name || item.payee_name}`}
                          />
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell key={column.key} className="p-compact text-data">
                            {column.render ? column.render(item) : item[column.key] || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="p-compact">
                          <div className="flex items-center gap-1">
                            {onView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(item)}
                                className="h-input-compact w-input-compact p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(item)}
                              className="h-input-compact w-input-compact p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {onDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-input-compact w-input-compact p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this item? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDelete(item.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          )}
          
          {enablePagination && data.length > 0 && totalPages > 1 && (
            <div className="mt-4">
              <CompletePagination
                currentPage={currentPageValue}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};