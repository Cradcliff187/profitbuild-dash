import { useState, useEffect, useMemo } from "react";
import { Plus, Download, ClipboardCheck, Clock, CheckCircle, XCircle, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnSelector } from "@/components/ui/column-selector";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { usePagination } from "@/hooks/usePagination";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { WorkOrdersTableView } from "@/components/WorkOrdersTableView";
import CreateWorkOrderModal from "@/components/CreateWorkOrderModal";
import { WorkOrderFilters, WorkOrderSearchFilters } from "@/components/WorkOrderFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Project, ProjectStatus, PROJECT_STATUSES } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { ExpenseFormSheet } from "@/components/ExpenseFormSheet";
import { Expense } from "@/types/expense";
import { WorkOrderEditSheet } from "@/components/WorkOrderEditSheet";
import { WorkOrderBulkActions } from "@/components/WorkOrderBulkActions";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkOrderWithDetails extends Project {
  has_estimate: boolean;
  is_auto_generated_estimate: boolean;
  total_expenses: number;
  expense_count: number;
  estimate_amount: number | null;
}

// Define column metadata for selector
const columnDefinitions = [
  { key: "project_number", label: "Project #", required: true, sortable: true },
  { key: "project_name", label: "Project Name", required: true, sortable: true },
  { key: "client_name", label: "Client", required: false, sortable: true },
  { key: "status", label: "Status", required: false, sortable: true },
  { key: "customer_po_number", label: "Customer PO #", required: false, sortable: true },
  { key: "contracted_amount", label: "Contract Value", required: false, sortable: true },
  { key: "do_not_exceed", label: "Do Not Exceed", required: false, sortable: true },
  { key: "original_est_costs", label: "Original Est. Costs", required: false, sortable: true },
  { key: "adjusted_est_costs", label: "Adjusted Est. Costs", required: false, sortable: true },
  { key: "projected_margin", label: "Projected Margin ($)", required: false, sortable: true },
  { key: "current_margin", label: "Current Margin ($)", required: false, sortable: true },
  { key: "margin_percentage", label: "Projected Margin %", required: false, sortable: true },
  { key: "has_estimate", label: "Has Estimate", required: false, sortable: true },
  { key: "total_expenses", label: "Actual Expenses", required: false, sortable: true },
  { key: "start_date", label: "Start Date", required: false, sortable: true },
  { key: "end_date", label: "Target/End Date", required: false, sortable: true },
  { key: "actions", label: "Actions", required: true },
];

const WorkOrders = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string; }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [selectedWorkOrderForExpense, setSelectedWorkOrderForExpense] = useState<WorkOrderWithDetails | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedWorkOrderForEdit, setSelectedWorkOrderForEdit] = useState<WorkOrderWithDetails | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("work-orders-visible-columns");
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return [
      "project_number",
      "project_name",
      "client_name",
      "status",
      "contracted_amount",
      "do_not_exceed",
      "adjusted_est_costs",
      "projected_margin",
      "current_margin",
      "margin_percentage",
      "has_estimate",
      "total_expenses",
      "start_date",
      "end_date",
      "actions",
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("work-orders-column-order");
    if (saved) {
      const savedOrder = JSON.parse(saved);
      // Filter out any invalid column keys
      const validOrder = savedOrder.filter((key: string) => columnDefinitions.some((col) => col.key === key));
      // Add any new columns that aren't in saved order
      const newColumns = columnDefinitions.map((col) => col.key).filter((key) => !validOrder.includes(key));
      return [...validOrder, ...newColumns];
    }
    // Default: use order from columnDefinitions
    return columnDefinitions.map((col) => col.key);
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem("work-orders-visible-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem("work-orders-column-order", JSON.stringify(columnOrder));
  }, [columnOrder]);

  const handleExport = () => {
    toast({
      title: "Export",
      description: "Work order export functionality coming soon.",
    });
    setShowExportModal(false);
  };
  const [filters, setFilters] = useState<WorkOrderSearchFilters>({
    searchText: "",
    status: [],
    jobType: [],
    clientName: [],
    hasEstimate: null,
    dateRange: { start: null, end: null },
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Load work orders and clients from Supabase
  useEffect(() => {
    loadWorkOrders();
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name')
      .eq('is_active', true)
      .order('client_name', { ascending: true });
    
    if (error) {
      console.error('Error loading clients:', error);
      return;
    }
    
    setClients(data || []);
  };

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      
      // First, try to fetch with is_auto_generated field
      let query = supabase
        .from('projects')
        .select(`
          *,
          estimates!left (
            id,
            total_amount,
            is_auto_generated,
            status
          ),
          expenses!left (
            id,
            amount
          )
        `)
        .eq('project_type', 'work_order')
        .eq('category', 'construction')
        .order('created_at', { ascending: false });

      let { data, error } = await query;

      // If error is due to missing column, retry without is_auto_generated
      if (error && error.message?.includes('is_auto_generated')) {
        console.warn('is_auto_generated column not found, falling back to query without it');
        const fallbackQuery = supabase
          .from('projects')
          .select(`
            *,
            estimates!left (
              id,
              total_amount,
              status,
              is_auto_generated
            ),
            expenses!left (
              id,
              amount
            )
          `)
          .eq('project_type', 'work_order')
          .eq('category', 'construction')
          .order('created_at', { ascending: false });
        
        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error fetching work orders:', error);
        toast({
          title: "Error",
          description: "Failed to load work orders.",
          variant: "destructive"
        });
        return;
      }

      // Fetch line item counts for all estimates to detect auto-generated ones
      const estimateIds: string[] = [];
      data?.forEach((project: any) => {
        (project.estimates || []).forEach((est: any) => {
          if (est.id) estimateIds.push(est.id);
        });
      });

      const lineItemsByEstimate = new Map<string, number>();
      if (estimateIds.length > 0) {
        const { data: lineItemData } = await supabase
          .from('estimate_line_items')
          .select('estimate_id')
          .in('estimate_id', estimateIds);
        
        (lineItemData || []).forEach((item: any) => {
          lineItemsByEstimate.set(item.estimate_id, (lineItemsByEstimate.get(item.estimate_id) || 0) + 1);
        });
      }

      // Process the data to calculate totals and estimates
      const processedData = data?.map(project => {
        const estimates = project.estimates || [];
        const expenses = project.expenses || [];
        
        // Check if any estimate is auto-generated
        // 1. First check the is_auto_generated flag (if migration has been run)
        // 2. Fallback: If flag is not set, infer from status='approved' and no line items
        const hasAutoGeneratedEstimate = estimates.some((est: any) => {
          // If flag is explicitly set to true, it's auto-generated
          if (est.is_auto_generated === true) return true;
          // If flag is explicitly false, it's user-created
          if (est.is_auto_generated === false) return false;
          // Fallback: infer from status and line items (for estimates created before migration)
          // Auto-generated estimates typically have status='approved' and no line items
          const lineItemCount = lineItemsByEstimate.get(est.id) || 0;
          return est.status === 'approved' && lineItemCount === 0;
        });
        
        return {
          ...project,
          // Convert date strings to Date objects
          start_date: project.start_date ? new Date(project.start_date) : null,
          end_date: project.end_date ? new Date(project.end_date) : null,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
          has_estimate: estimates.length > 0,
          is_auto_generated_estimate: hasAutoGeneratedEstimate,
          total_expenses: expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
          expense_count: expenses.length,
          estimate_amount: estimates.length > 0 ? estimates[0].total_amount : null
        };
      }) || [];

      setWorkOrders(processedData);
    } catch (error) {
      console.error('Error loading work orders:', error);
      toast({
        title: "Error",
        description: "Failed to load work orders.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleWorkOrderUpdate = () => {
    loadWorkOrders();
  };

  const handleEdit = (workOrder: Project) => {
    const fullWorkOrder = workOrders.find(wo => wo.id === workOrder.id);
    if (fullWorkOrder) {
      setSelectedWorkOrderForEdit(fullWorkOrder);
      setEditSheetOpen(true);
    }
  };

  const handleSaveWorkOrder = (project: Project) => {
    loadWorkOrders();
    toast({
      title: "Success",
      description: "Work order updated successfully",
    });
  };

  const handleDelete = async (workOrderId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', workOrderId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });
      loadWorkOrders();
    } catch (error: any) {
      console.error('Failed to delete work order:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete work order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddExpense = (workOrder: WorkOrderWithDetails) => {
    setSelectedWorkOrderForExpense(workOrder);
    setExpenseFormOpen(true);
  };

  const handleSaveExpense = (expense: Expense) => {
    loadWorkOrders();
    toast({
      title: "Success",
      description: "Expense added successfully",
    });
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const pendingInProgress = workOrders.filter(wo => 
      wo.status === 'in_progress' || wo.status === 'estimating' || wo.status === 'quoted'
    ).length;

    const completedThisWeek = workOrders.filter(wo => {
      if (wo.status !== 'complete' || !wo.end_date) return false;
      const endDate = new Date(wo.end_date);
      return endDate >= weekStart;
    }).length;

    const completedThisMonth = workOrders.filter(wo => {
      if (wo.status !== 'complete' || !wo.end_date) return false;
      const endDate = new Date(wo.end_date);
      return endDate >= monthStart;
    }).length;

    const totalWithEstimates = workOrders.filter(wo => wo.has_estimate).length;

    return {
      pendingInProgress,
      completedThisWeek,
      completedThisMonth,
      totalWithEstimates,
    };
  }, [workOrders]);

  const handleSort = (columnKey: string) => {
    const column = columnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleBulkStatusUpdate = async (status: ProjectStatus) => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'work order' : 'work orders'} updated to ${PROJECT_STATUSES.find(s => s.value === status)?.label || status}`,
      });

      setSelectedIds([]);
      loadWorkOrders();
    } catch (error: any) {
      console.error('Error updating work order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update work order status",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'work order' : 'work orders'} deleted successfully`,
      });

      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      loadWorkOrders();
    } catch (error: any) {
      console.error('Error deleting work orders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete work orders",
        variant: "destructive",
      });
    }
  };

  const renderSortIcon = (columnKey: string) => {
    const column = columnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return null;
    
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedWorkOrders.map((wo) => wo.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  // Filter work orders based on search criteria
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(workOrder => {
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          workOrder.project_name.toLowerCase().includes(searchLower) ||
          workOrder.client_name.toLowerCase().includes(searchLower) ||
          (workOrder.address && workOrder.address.toLowerCase().includes(searchLower)) ||
          workOrder.project_number.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(workOrder.status)) {
        return false;
      }

      // Job type filter
      if (filters.jobType.length > 0 && !filters.jobType.includes(workOrder.job_type || '')) {
        return false;
      }

      // Client name filter
      if (filters.clientName.length > 0) {
        const matchesClient = filters.clientName.some(client =>
          workOrder.client_name.toLowerCase().includes(client.toLowerCase())
        );
        if (!matchesClient) return false;
      }

      // Has estimate filter
      if (filters.hasEstimate !== null) {
        if (filters.hasEstimate !== workOrder.has_estimate) return false;
      }

      // Date range filter
      if (filters.dateRange.start && workOrder.start_date) {
        if (workOrder.start_date < filters.dateRange.start) return false;
      }
      if (filters.dateRange.end && workOrder.start_date) {
        if (workOrder.start_date > filters.dateRange.end) return false;
      }

      return true;
    });
  }, [workOrders, filters]);

  // Sort the filtered work orders
  const sortedWorkOrders = useMemo(() => {
    if (!sortColumn) return filteredWorkOrders;
    
    return [...filteredWorkOrders].sort((a, b) => {
      let aValue, bValue;
      switch (sortColumn) {
        case 'project_number':
          aValue = a.project_number || '';
          bValue = b.project_number || '';
          break;
        case 'project_name':
          aValue = a.project_name || '';
          bValue = b.project_name || '';
          break;
        case 'client_name':
          aValue = a.client_name || '';
          bValue = b.client_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'contracted_amount':
          aValue = a.contracted_amount || 0;
          bValue = b.contracted_amount || 0;
          break;
        case 'do_not_exceed':
          aValue = a.do_not_exceed || 0;
          bValue = b.do_not_exceed || 0;
          break;
        case 'projected_margin':
          aValue = a.projected_margin || 0;
          bValue = b.projected_margin || 0;
          break;
        case 'current_margin':
          aValue = a.current_margin || 0;
          bValue = b.current_margin || 0;
          break;
        case 'adjusted_est_costs':
          aValue = a.adjusted_est_costs || 0;
          bValue = b.adjusted_est_costs || 0;
          break;
        case 'original_est_costs':
          aValue = a.original_est_costs || 0;
          bValue = b.original_est_costs || 0;
          break;
        case 'margin_percentage':
          aValue = a.margin_percentage || 0;
          bValue = b.margin_percentage || 0;
          break;
        case 'customer_po_number':
          aValue = a.customer_po_number || '';
          bValue = b.customer_po_number || '';
          break;
        case 'end_date':
          aValue = a.end_date ? new Date(a.end_date).getTime() : 0;
          bValue = b.end_date ? new Date(b.end_date).getTime() : 0;
          break;
        case 'has_estimate':
          aValue = a.has_estimate ? 1 : 0;
          bValue = b.has_estimate ? 1 : 0;
          break;
        case 'total_expenses':
          aValue = a.total_expenses || 0;
          bValue = b.total_expenses || 0;
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        default:
          return 0;
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
  }, [filteredWorkOrders, sortColumn, sortDirection]);

  const pagination = usePagination({
    totalItems: sortedWorkOrders.length,
    pageSize,
    initialPage: 1,
  });

  // Get paginated work orders
  const paginatedWorkOrders = useMemo(() => {
    const start = pagination.startIndex;
    const end = pagination.endIndex;
    return sortedWorkOrders.slice(start, end);
  }, [sortedWorkOrders, pagination.startIndex, pagination.endIndex]);

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 py-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Work Orders</h1>
            <p className="text-muted-foreground">Manage your work orders and track progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateNew} size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Create Work Order
          </Button>
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={sortedWorkOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <BrandedLoader message="Loading work orders..." />
      ) : (
        <div className="space-y-2">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending/In Progress</p>
                    <p className="text-base font-bold">{statistics.pendingInProgress}</p>
                  </div>
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Completed This Week</p>
                    <p className="text-base font-bold">{statistics.completedThisWeek}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Completed This Month</p>
                    <p className="text-base font-bold">{statistics.completedThisMonth}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">With Estimates</p>
                    <p className="text-base font-bold">{statistics.totalWithEstimates}</p>
                  </div>
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <WorkOrderFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={sortedWorkOrders.length}
            clients={clients}
          />

          {/* Bulk Actions */}
          <WorkOrderBulkActions
            selectedCount={selectedIds.length}
            onStatusUpdate={(status) => handleBulkStatusUpdate(status)}
            onDelete={() => setBulkDeleteDialogOpen(true)}
            onCancel={() => setSelectedIds([])}
          />

          {/* Table */}
          <WorkOrdersTableView
            workOrders={paginatedWorkOrders}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdate={handleWorkOrderUpdate}
            onAddExpense={handleAddExpense}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            totalCount={sortedWorkOrders.length}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              pagination.goToPage(1);
            }}
            currentPage={pagination.currentPage}
            totalPages={Math.ceil(sortedWorkOrders.length / pageSize)}
            onPageChange={pagination.goToPage}
          />
        </div>
      )}

      <CreateWorkOrderModal 
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            loadWorkOrders();
          }
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} {selectedIds.length === 1 ? 'work order' : 'work orders'}? 
              This action cannot be undone and will also delete associated estimates and expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExpenseFormSheet
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        onSave={handleSaveExpense}
        defaultProjectId={selectedWorkOrderForExpense?.id}
        projectName={selectedWorkOrderForExpense ? `${selectedWorkOrderForExpense.project_number} - ${selectedWorkOrderForExpense.project_name}` : undefined}
      />

      {selectedWorkOrderForEdit && (
        <WorkOrderEditSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          workOrder={selectedWorkOrderForEdit}
          onSave={handleSaveWorkOrder}
        />
      )}
    </div>
  );
};

export default WorkOrders;
