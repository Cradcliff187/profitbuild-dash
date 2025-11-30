import React, { useState, useMemo, useEffect } from "react";
import { Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProjectRevenue } from "@/types/revenue";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CollapsibleFilterSection } from "./ui/collapsible-filter-section";
import { usePagination } from '@/hooks/usePagination';
import { RevenueBulkActions } from "./RevenueBulkActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  defaultVisible?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

const REVENUE_COLUMNS: ColumnDefinition[] = [
  { key: 'checkbox', label: 'Select', required: true, width: 'w-10', defaultVisible: true },
  { key: 'date', label: 'Date', required: false, width: 'w-24', sortable: true, defaultVisible: true },
  { key: 'invoice_number', label: 'Invoice #', required: false, width: 'w-28', sortable: true, defaultVisible: true },
  { key: 'project', label: 'Project', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'client', label: 'Client', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'description', label: 'Description', required: false, sortable: false, defaultVisible: true },
  { key: 'amount', label: 'Amount', required: false, width: 'w-24', align: 'right', sortable: true, defaultVisible: true },
  { key: 'account', label: 'Account', required: false, width: 'w-32', sortable: false, defaultVisible: true },
  { key: 'quickbooks_id', label: 'QB ID', required: false, width: 'w-32', sortable: false, defaultVisible: true },
  { key: 'actions', label: 'Actions', required: true, width: 'w-16', align: 'center', defaultVisible: true },
];

interface RevenuesListProps {
  revenues: ProjectRevenue[];
  onEdit: (revenue: ProjectRevenue) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  enablePagination?: boolean;
  pageSize?: number;
  visibleColumns?: string[];
  onVisibleColumnsChange?: (columns: string[]) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

export const RevenuesList: React.FC<RevenuesListProps> = ({
  revenues,
  onEdit,
  onDelete,
  onRefresh,
  enablePagination = true,
  pageSize: initialPageSize = 25,
  visibleColumns: externalVisibleColumns,
  onVisibleColumnsChange,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
}) => {
  const { toast } = useToast();
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterClients, setFilterClients] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revenueToDelete, setRevenueToDelete] = useState<ProjectRevenue | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedRevenues, setSelectedRevenues] = useState<string[]>([]);

  // Column visibility state - use external if provided, otherwise internal with localStorage
  const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('revenues-visible-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure checkbox is always included (it's required)
        if (!parsed.includes('checkbox')) {
          return ['checkbox', ...parsed];
        }
        return parsed;
      } catch {
        // Invalid JSON, use defaults
      }
    }
    // Default visible columns
    const defaultColumns = REVENUE_COLUMNS
      .filter(col => col.defaultVisible)
      .map(col => col.key);
    // Ensure checkbox is always included
    if (!defaultColumns.includes('checkbox')) {
      defaultColumns.unshift('checkbox');
    }
    return defaultColumns;
  });

  // Column order state - use external if provided, otherwise internal with localStorage
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('revenues-column-order');
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Add any new columns not in saved order
        const newColumns = REVENUE_COLUMNS
          .map(col => col.key)
          .filter(key => !savedOrder.includes(key));
        return [...savedOrder, ...newColumns];
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return REVENUE_COLUMNS.map(col => col.key);
  });

  // Use external state if provided, otherwise use internal
  const visibleColumns = externalVisibleColumns ?? internalVisibleColumns;
  const columnOrder = externalColumnOrder ?? internalColumnOrder;

  const setVisibleColumns = (columns: string[]) => {
    // Ensure checkbox is always included (it's required)
    const columnsWithCheckbox = columns.includes('checkbox') 
      ? columns 
      : ['checkbox', ...columns];
    
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(columnsWithCheckbox);
    } else {
      setInternalVisibleColumns(columnsWithCheckbox);
      localStorage.setItem('revenues-visible-columns', JSON.stringify(columnsWithCheckbox));
    }
  };

  const setColumnOrder = (order: string[]) => {
    if (onColumnOrderChange) {
      onColumnOrderChange(order);
    } else {
      setInternalColumnOrder(order);
      localStorage.setItem('revenues-column-order', JSON.stringify(order));
    }
  };

  // Helper to check if column is visible
  const isColumnVisible = (key: string) => {
    // Checkbox is always visible if it's required
    if (key === 'checkbox') {
      const checkboxCol = REVENUE_COLUMNS.find(col => col.key === 'checkbox');
      return checkboxCol?.required ? true : visibleColumns.includes(key);
    }
    return visibleColumns.includes(key);
  };

  // Get ordered columns
  const orderedColumns = columnOrder
    .map(key => REVENUE_COLUMNS.find(col => col.key === key))
    .filter((col): col is ColumnDefinition => col !== undefined);

  // Get unique projects and clients for filters
  useEffect(() => {
    const uniqueProjects = new Map<string, { id: string; name: string; number: string }>();
    const uniqueClients = new Set<string>();
    
    revenues.forEach(rev => {
      if (rev.project_id && rev.project_name) {
        uniqueProjects.set(rev.project_id, {
          id: rev.project_id,
          name: rev.project_name,
          number: rev.project_number || ''
        });
      }
      if (rev.client_name) {
        uniqueClients.add(rev.client_name);
      }
    });
    
    setProjects(Array.from(uniqueProjects.values()));
    setClients(Array.from(uniqueClients).map(name => ({ name })));
  }, [revenues]);

  // Filter revenues
  const filteredRevenues = useMemo(() => {
    let filtered = revenues;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(rev => {
        return (
          rev.invoice_number?.toLowerCase().includes(searchLower) ||
          rev.description?.toLowerCase().includes(searchLower) ||
          rev.project_name?.toLowerCase().includes(searchLower) ||
          rev.project_number?.toLowerCase().includes(searchLower) ||
          rev.client_name?.toLowerCase().includes(searchLower) ||
          rev.account_name?.toLowerCase().includes(searchLower) ||
          rev.account_full_name?.toLowerCase().includes(searchLower) ||
          rev.quickbooks_transaction_id?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Project filter
    if (filterProjects.length > 0) {
      filtered = filtered.filter(rev => filterProjects.includes(rev.project_id));
    }

    // Client filter
    if (filterClients.length > 0) {
      filtered = filtered.filter(rev => rev.client_name && filterClients.includes(rev.client_name));
    }

    return filtered;
  }, [revenues, searchTerm, filterProjects, filterClients]);

  // Sort revenues
  const sortedRevenues = useMemo(() => {
    if (!sortColumn) return filteredRevenues;

    const sorted = [...filteredRevenues].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case 'date':
        case 'invoice_date':
          aVal = new Date(a.invoice_date).getTime();
          bVal = new Date(b.invoice_date).getTime();
          break;
        case 'invoice_number':
          aVal = a.invoice_number || '';
          bVal = b.invoice_number || '';
          break;
        case 'project':
        case 'project_name':
          aVal = a.project_name || '';
          bVal = b.project_name || '';
          break;
        case 'client':
        case 'client_name':
          aVal = a.client_name || '';
          bVal = b.client_name || '';
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredRevenues, sortColumn, sortDirection]);

  // Pagination
  const pagination = usePagination({
    totalItems: sortedRevenues.length,
    pageSize: pageSize,
    initialPage: 1,
  });

  const paginatedRevenues = enablePagination
    ? sortedRevenues.slice(pagination.startIndex, pagination.endIndex)
    : sortedRevenues;

  const handleSort = (columnKey: string) => {
    const column = REVENUE_COLUMNS.find(col => col.key === columnKey);
    if (!column?.sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    pagination.goToPage(1);
  };

  const handleDeleteClick = (revenue: ProjectRevenue) => {
    setRevenueToDelete(revenue);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!revenueToDelete) return;

    try {
      const { error } = await supabase
        .from('project_revenues')
        .delete()
        .eq('id', revenueToDelete.id);

      if (error) throw error;

      onDelete(revenueToDelete.id);
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted.",
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting revenue:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setRevenueToDelete(null);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    const column = REVENUE_COLUMNS.find(col => col.key === columnKey);
    if (!column?.sortable) return null;
    
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (searchTerm) count++;
    if (filterProjects.length > 0) count++;
    if (filterClients.length > 0) count++;
    return count;
  };

  const hasActiveFilters = (): boolean => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterProjects([]);
    setFilterClients([]);
    setSelectedRevenues([]); // Clear selection when filters change
    pagination.goToPage(1);
  };

  const toggleProject = (projectId: string) => {
    setFilterProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
    pagination.goToPage(1);
  };

  const toggleClient = (clientName: string) => {
    setFilterClients(prev =>
      prev.includes(clientName)
        ? prev.filter(name => name !== clientName)
        : [...prev, clientName]
    );
    pagination.goToPage(1);
  };

  const handleSelectAll = () => {
    if (selectedRevenues.length === sortedRevenues.length) {
      setSelectedRevenues([]);
    } else {
      setSelectedRevenues(sortedRevenues.map((r) => r.id));
    }
  };

  const handleSelectRevenue = (revenueId: string) => {
    if (selectedRevenues.includes(revenueId)) {
      setSelectedRevenues(selectedRevenues.filter((id) => id !== revenueId));
    } else {
      setSelectedRevenues([...selectedRevenues, revenueId]);
    }
  };

  // Calculate totals
  const totalAmount = sortedRevenues.reduce((sum, rev) => sum + rev.amount, 0);

  // Render cell content based on column key
  const renderCell = (revenue: ProjectRevenue, columnKey: string) => {
    switch (columnKey) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedRevenues.includes(revenue.id)}
            onCheckedChange={() => handleSelectRevenue(revenue.id)}
          />
        );
      
      case 'date':
        return (
          <span className="font-mono text-muted-foreground text-xs">
            {format(new Date(revenue.invoice_date), 'M/d/yy')}
          </span>
        );
      
      case 'invoice_number':
        return (
          <span className="font-mono text-xs">
            {revenue.invoice_number || '-'}
          </span>
        );
      
      case 'project':
        return (
          <div className="text-xs leading-tight">
            <div className="font-medium">{revenue.project_number || '-'}</div>
            <div className="text-muted-foreground text-[10px]">{revenue.project_name || ''}</div>
          </div>
        );
      
      case 'client':
        return (
          <span className="text-xs">
            {revenue.client_name || '-'}
          </span>
        );
      
      case 'description':
        return (
          <span className="text-xs text-muted-foreground truncate max-w-xs">
            {revenue.description || '-'}
          </span>
        );
      
      case 'amount':
        return (
          <span className="font-mono font-medium text-green-600">
            {formatCurrency(revenue.amount, { showCents: true })}
          </span>
        );
      
      case 'account':
        return (
          <span className="text-xs text-muted-foreground">
            {revenue.account_full_name || revenue.account_name || '-'}
          </span>
        );
      
      case 'quickbooks_id':
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {revenue.quickbooks_transaction_id || '-'}
          </span>
        );
      
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-input-compact w-8 p-0" aria-label="Actions menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onEdit(revenue)}>
                <Edit className="h-3 w-3 mr-2" />
                Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(revenue)} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="dense-spacing">
      {/* Filters - Compact */}
      <CollapsibleFilterSection
        title="Filter Invoices"
        hasActiveFilters={hasActiveFilters()}
        activeFilterCount={getActiveFilterCount()}
        onClearFilters={handleClearFilters}
        resultCount={filteredRevenues.length}
        defaultExpanded={false}
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-4">
            <Input
              placeholder="Search invoices by number, description, project, client, account, amount..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                pagination.goToPage(1);
              }}
              className="h-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 w-full justify-between text-xs"
              >
                <span className="truncate">
                  {filterProjects.length === 0 
                    ? "All Projects" 
                    : `${filterProjects.length} selected`
                  }
                </span>
                <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects..." className="h-9" />
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterProjects(projects.map(p => p.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterProjects([])}
                    >
                      Clear
                    </Button>
                  </div>
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.number} ${project.name}`}
                      onSelect={() => toggleProject(project.id)}
                      className="text-sm"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox
                          checked={filterProjects.includes(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm truncate">
                          {project.number} - {project.name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 w-full justify-between text-xs"
              >
                <span className="truncate">
                  {filterClients.length === 0 
                    ? "All Clients" 
                    : `${filterClients.length} selected`
                  }
                </span>
                <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search clients..." className="h-9" />
                <CommandEmpty>No client found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterClients(clients.map(c => c.name))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterClients([])}
                    >
                      Clear
                    </Button>
                  </div>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.name}
                      value={client.name}
                      onSelect={() => toggleClient(client.name)}
                      className="text-sm"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox
                          checked={filterClients.includes(client.name)}
                          onCheckedChange={() => toggleClient(client.name)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm truncate">
                          {client.name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CollapsibleFilterSection>

      {/* Bulk Actions */}
      {selectedRevenues.length > 0 && (
        <div className="mb-3">
          <RevenueBulkActions
            selectedRevenueIds={selectedRevenues}
            onSelectionChange={(newSet) => setSelectedRevenues(Array.from(newSet))}
            onComplete={() => {
              setSelectedRevenues([]);
              onRefresh();
            }}
          />
        </div>
      )}

      {/* Revenues Table */}
      {sortedRevenues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {filteredRevenues.length === 0 
            ? "No invoices found. Add your first invoice to get started."
            : "No invoices match your current filters."}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-auto -mx-2 px-2 sm:mx-0 sm:px-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <Table className="min-w-[1200px]">
                <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                  <TableRow className="h-8">
                    {isColumnVisible('checkbox') && (
                      <TableHead className="w-10 p-2 text-xs">
                        <Checkbox
                          checked={selectedRevenues.length === sortedRevenues.length && sortedRevenues.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    {orderedColumns.map(column => {
                      if (!isColumnVisible(column.key)) return null;
                      if (column.key === 'checkbox') return null; // Skip checkbox column in loop
                      
                      return (
                        <TableHead 
                          key={column.key}
                          className={cn(
                            "h-8 p-2 text-xs font-medium",
                            column.width,
                            column.align === 'right' && "text-right",
                            column.align === 'center' && "text-center",
                            column.align !== 'right' && column.align !== 'center' && "text-left",
                            column.sortable && "cursor-pointer hover:text-foreground select-none"
                          )}
                          onClick={() => column.sortable && handleSort(column.key)}
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
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRevenues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(isColumnVisible('checkbox') ? 1 : 0) + orderedColumns.filter(col => isColumnVisible(col.key) && col.key !== 'checkbox').length} className="text-center text-muted-foreground py-8">
                        {searchTerm || filterProjects.length > 0 || filterClients.length > 0
                          ? "No invoices match your filters"
                          : "No invoices found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRevenues.map((revenue, index) => {
                      const isEvenRow = index % 2 === 0;
                      return (
                        <TableRow 
                          key={revenue.id}
                          className={cn(
                            "h-9 hover:bg-muted/50",
                            isEvenRow && "bg-muted/20"
                          )}
                        >
                          {/* Selection Checkbox - always visible */}
                          {isColumnVisible('checkbox') && (
                            <TableCell className="p-1.5">
                              <Checkbox
                                checked={selectedRevenues.includes(revenue.id)}
                                onCheckedChange={() => handleSelectRevenue(revenue.id)}
                              />
                            </TableCell>
                          )}
                          {orderedColumns.map(column => {
                            if (!isColumnVisible(column.key)) return null;
                            if (column.key === 'checkbox') return null; // Skip checkbox column in loop
                            
                            return (
                              <TableCell 
                                key={column.key}
                                className={cn(
                                  "p-1.5 text-xs",
                                  column.align === 'right' && "text-right font-mono font-medium",
                                  column.align === 'center' && "text-center"
                                )}
                              >
                                {renderCell(revenue, column.key)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                
                {/* Footer with totals */}
                <TableFooter className="border-t bg-muted/30">
                  <TableRow>
                    {isColumnVisible('checkbox') && (
                      <TableCell className="p-2"></TableCell>
                    )}
                    {orderedColumns.map((column) => {
                      if (!isColumnVisible(column.key)) return null;
                      if (column.key === 'checkbox') return null;
                      
                      if (column.key === 'project') {
                        return (
                          <TableCell key={column.key} className="p-2 font-medium text-xs">
                            Total ({sortedRevenues.length} invoice{sortedRevenues.length !== 1 ? 's' : ''}):
                          </TableCell>
                        );
                      } else if (column.key === 'amount') {
                        return (
                          <TableCell key={column.key} className={cn("p-2 text-right font-mono font-medium text-xs", "text-green-600")}>
                            {formatCurrency(totalAmount, { showCents: true })}
                          </TableCell>
                        );
                      } else {
                        return <TableCell key={column.key}></TableCell>;
                      }
                    })}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Pagination */}
            {enablePagination && sortedRevenues.length > 0 && (
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
                {sortedRevenues.length > pageSize && (
                  <CompletePagination
                    currentPage={pagination.currentPage}
                    totalPages={Math.ceil(sortedRevenues.length / pageSize)}
                    onPageChange={pagination.goToPage}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
              {revenueToDelete && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <div className="text-sm font-medium">
                    {revenueToDelete.invoice_number || 'No Invoice #'} - {formatCurrency(revenueToDelete.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {revenueToDelete.project_name} • {format(new Date(revenueToDelete.invoice_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
