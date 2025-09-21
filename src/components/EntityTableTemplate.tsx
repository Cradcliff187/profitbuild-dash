import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePagination } from '@/hooks/usePagination';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
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
  pageSize = 10,
  currentPage,
  onPageChange
}) => {
  // Pagination logic
  const pagination = usePagination({
    totalItems: data.length,
    pageSize: pageSize,
    initialPage: currentPage || 1,
  });

  // Use external pagination if provided, otherwise use internal pagination
  const paginationState = enablePagination && !onPageChange ? pagination : null;
  const currentPageValue = onPageChange ? (currentPage || 1) : (paginationState?.currentPage || 1);
  const handlePageChange = onPageChange || paginationState?.goToPage || (() => {});

  // Calculate displayed data based on pagination
  const displayedData = enablePagination 
    ? data.slice(
        (currentPageValue - 1) * pageSize,
        currentPageValue * pageSize
      )
    : data;

  const totalPages = Math.ceil(data.length / pageSize);

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={onSelectAll}
                      aria-label="Select all items"
                    />
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => onSelectItem(item.id)}
                        aria-label={`Select ${item.name || item.client_name || item.payee_name}`}
                      />
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render ? column.render(item) : item[column.key] || '-'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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