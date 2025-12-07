import React, { useState } from "react";
import { Edit, Eye, Trash2, MoreHorizontal, FileText, Plus, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { Project, ProjectStatus } from "@/types/project";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WorkOrderWithDetails extends Project {
  has_estimate: boolean;
  is_auto_generated_estimate: boolean;
  total_expenses: number;
  expense_count: number;
  estimate_amount: number | null;
  total_invoiced: number;
}

interface WorkOrdersTableViewProps {
  workOrders: WorkOrderWithDetails[];
  onEdit: (workOrder: Project) => void;
  onDelete?: (workOrderId: string) => void;
  onUpdate?: () => void;
  onAddExpense?: (workOrder: WorkOrderWithDetails) => void;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
  visibleColumns?: string[];
  columnOrder?: string[];
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  renderSortIcon?: (columnKey: string) => React.ReactNode;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  poRunningTotals?: Map<string, number>;
}

export const WorkOrdersTableView = ({ 
  workOrders, 
  onEdit,
  onDelete,
  onUpdate,
  onAddExpense,
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  visibleColumns = [],
  columnOrder = [],
  sortColumn = null,
  sortDirection = 'asc',
  onSort,
  renderSortIcon,
  totalCount = 0,
  pageSize = 25,
  onPageSizeChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  poRunningTotals,
}: WorkOrdersTableViewProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; workOrder: Project | null}>({
    open: false,
    workOrder: null
  });

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
    { key: "total_invoiced", label: "Total Invoiced", required: false, sortable: true },
    { key: "running_po_total", label: "Running PO Total", required: false, sortable: true },
    { key: "start_date", label: "Start Date", required: false, sortable: true },
    { key: "end_date", label: "Target/End Date", required: false, sortable: true },
    { key: "actions", label: "Actions", required: true },
  ];

  const widths: Record<string, string> = {
    project_number: "w-28",
    project_name: "w-48",
    client_name: "w-40",
    status: "w-24",
    customer_po_number: "w-32",
    contracted_amount: "w-32",
    do_not_exceed: "w-32",
    original_est_costs: "w-36",
    adjusted_est_costs: "w-36",
    projected_margin: "w-36",
    current_margin: "w-36",
    margin_percentage: "w-32",
    has_estimate: "w-24",
    total_expenses: "w-28",
    total_invoiced: "w-28",
    running_po_total: "w-32",
    start_date: "w-28",
    end_date: "w-28",
    actions: "w-20",
  };
  
  const alignments: Record<string, string> = {
    customer_po_number: "text-center",
    contracted_amount: "text-right",
    do_not_exceed: "text-right",
    original_est_costs: "text-right",
    adjusted_est_costs: "text-right",
    projected_margin: "text-right",
    current_margin: "text-right",
    margin_percentage: "text-right",
    total_expenses: "text-right",
    total_invoiced: "text-right",
    running_po_total: "text-right",
    start_date: "text-right",
    end_date: "text-right",
    actions: "text-right",
  };
  
  const labels: Record<string, string> = {
    project_number: "Project #",
    project_name: "Project Name",
    client_name: "Client",
    status: "Status",
    customer_po_number: "Customer PO #",
    contracted_amount: "Contract Value",
    do_not_exceed: "Do Not Exceed",
    original_est_costs: "Original Est. Costs",
    adjusted_est_costs: "Adjusted Est. Costs",
    projected_margin: "Projected Margin ($)",
    current_margin: "Current Margin ($)",
    margin_percentage: "Projected Margin %",
    has_estimate: "Has Estimate",
    total_expenses: "Actual Expenses",
    total_invoiced: "Total Invoiced",
    running_po_total: "Running PO Total",
    start_date: "Start Date",
    end_date: "Target/End Date",
    actions: "Actions",
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const statusColors: Record<ProjectStatus, string> = {
      'estimating': 'text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300',
      'quoted': 'text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-300',
      'approved': 'text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300',
      'in_progress': 'text-[10px] h-4 px-1.5 bg-purple-50 text-purple-700 border-purple-300',
      'complete': 'text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300',
      'on_hold': 'text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300',
      'cancelled': 'text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300',
    };

    return (
      <Badge 
        variant="outline" 
        className={cn(
          statusColors[status] || 'text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300',
          'whitespace-nowrap leading-tight font-normal rounded-md'
        )}
      >
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const handleViewDetails = (workOrder: Project) => {
    navigate(`/projects/${workOrder.id}`);
  };

  const handleAddExpense = (workOrder: WorkOrderWithDetails) => {
    if (onAddExpense) {
      onAddExpense(workOrder);
    } else {
      // Fallback to navigation if callback not provided
      navigate(`/expenses?project=${workOrder.id}`);
    }
  };

  const handleViewEstimate = (workOrder: WorkOrderWithDetails) => {
    // If estimate is auto-generated, treat it as no estimate and navigate to create
    if (workOrder.has_estimate && !workOrder.is_auto_generated_estimate) {
      navigate(`/estimates?project=${workOrder.id}`);
    } else {
      navigate(`/estimates?create=true&project=${workOrder.id}`);
    }
  };

  const handleMarkComplete = async (workOrder: WorkOrderWithDetails) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'complete' })
        .eq('id', workOrder.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update work order status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Work order marked as complete",
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-muted-foreground">Loading work orders...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (workOrders.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="text-center py-12">
            <p className="text-xs text-muted-foreground mb-2">No work orders found</p>
            <p className="text-xs text-muted-foreground">
              Create your first work order to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto -mx-2 px-2 sm:mx-0 sm:px-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                <TableRow className="h-8">
                  {onSelectAll && (
                    <TableHead className="w-10 p-2">
                      <Checkbox
                        checked={selectedIds.length === workOrders.length && workOrders.length > 0}
                        onCheckedChange={onSelectAll}
                      />
                    </TableHead>
                  )}
                  {columnOrder.map((colKey) => {
                    if (!visibleColumns.includes(colKey)) return null;
                    
                    const column = columnDefinitions.find(col => col.key === colKey);
                    const isSortable = column?.sortable;

                    return (
                      <TableHead 
                        key={colKey} 
                        className={cn(
                          `p-2 text-xs font-medium h-8 ${widths[colKey] || ''} ${alignments[colKey] || ''}`,
                          isSortable && onSort && "cursor-pointer hover:text-foreground select-none"
                        )}
                        onClick={() => isSortable && onSort && onSort(colKey)}
                      >
                        <div className={cn(
                          "flex items-center",
                          alignments[colKey] === "text-right" && "justify-end",
                          alignments[colKey] === "text-center" && "justify-center"
                        )}>
                          {labels[colKey]}
                          {renderSortIcon && renderSortIcon(colKey)}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((workOrder) => (
                  <TableRow key={workOrder.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                    {onSelectOne && (
                      <TableCell className="p-1.5">
                        <Checkbox
                          checked={selectedIds.includes(workOrder.id)}
                          onCheckedChange={(checked) => onSelectOne(workOrder.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    {columnOrder.map((colKey) => {
                      if (!visibleColumns.includes(colKey)) return null;

                      switch (colKey) {
                        case "project_number":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs">
                              {workOrder.project_number}
                            </TableCell>
                          );
                        case "project_name":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs font-medium">
                              {workOrder.project_name}
                            </TableCell>
                          );
                        case "client_name":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {workOrder.client_name}
                            </TableCell>
                          );
                        case "status":
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <div className="flex items-center">
                                {getStatusBadge(workOrder.status)}
                              </div>
                            </TableCell>
                          );
                        case "customer_po_number":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-center">
                              {workOrder.customer_po_number || "—"}
                            </TableCell>
                          );
                        case "contracted_amount":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.contracted_amount ? formatCurrency(workOrder.contracted_amount) : "—"}
                            </TableCell>
                          );
                        case "do_not_exceed":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.do_not_exceed ? formatCurrency(workOrder.do_not_exceed) : "—"}
                            </TableCell>
                          );
                        case "original_est_costs":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.original_est_costs ? formatCurrency(workOrder.original_est_costs) : "—"}
                            </TableCell>
                          );
                        case "adjusted_est_costs":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.adjusted_est_costs ? formatCurrency(workOrder.adjusted_est_costs) : "—"}
                            </TableCell>
                          );
                        case "projected_margin":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.projected_margin !== null && workOrder.projected_margin !== undefined 
                                ? formatCurrency(workOrder.projected_margin) 
                                : "—"}
                            </TableCell>
                          );
                        case "current_margin":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.current_margin !== null && workOrder.current_margin !== undefined 
                                ? formatCurrency(workOrder.current_margin) 
                                : "—"}
                            </TableCell>
                          );
                        case "margin_percentage":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {workOrder.margin_percentage !== null && workOrder.margin_percentage !== undefined 
                                ? `${workOrder.margin_percentage.toFixed(1)}%` 
                                : "—"}
                            </TableCell>
                          );
                        case "has_estimate":
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              {workOrder.has_estimate ? (
                                workOrder.is_auto_generated_estimate ? (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300">
                                    System
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                    Yes
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  No
                                </Badge>
                              )}
                            </TableCell>
                          );
                        case "total_expenses":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right font-semibold">
                              {formatCurrency(workOrder.total_expenses)}
                            </TableCell>
                          );
                        case "total_invoiced":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right font-semibold">
                              {formatCurrency(workOrder.total_invoiced || 0)}
                            </TableCell>
                          );
                        case "running_po_total":
                          const runningTotal = workOrder.customer_po_number 
                            ? poRunningTotals?.get(workOrder.customer_po_number) || 0 
                            : 0;
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right font-semibold">
                              {workOrder.customer_po_number ? formatCurrency(runningTotal) : "—"}
                            </TableCell>
                          );
                        case "start_date":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs text-right">
                              {workOrder.start_date ? format(new Date(workOrder.start_date), "MM/dd/yy") : "Not set"}
                            </TableCell>
                          );
                        case "end_date":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs text-right">
                              {workOrder.end_date ? format(new Date(workOrder.end_date), "MM/dd/yy") : "Not set"}
                            </TableCell>
                          );
                        case "actions":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(workOrder)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onEdit(workOrder)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleAddExpense(workOrder)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Expense
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewEstimate(workOrder)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {workOrder.has_estimate && !workOrder.is_auto_generated_estimate ? 'View Estimate' : 'Create Estimate'}
                                  </DropdownMenuItem>
                                  {workOrder.status !== 'complete' && (
                                    <DropdownMenuItem onClick={() => handleMarkComplete(workOrder)}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark Complete
                                    </DropdownMenuItem>
                                  )}
                                  {onDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setDeleteConfirm({ open: true, workOrder })}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                  </TableRow>
                ))}
              </TableBody>
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
                    if (onPageSizeChange) {
                      onPageSizeChange(Number(e.target.value));
                    }
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>

              {totalCount > pageSize && onPageChange && (
                <CompletePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({open, workOrder: null})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this work order? 
              This action will also remove all associated estimates and expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm.workOrder && onDelete) {
                  onDelete(deleteConfirm.workOrder.id);
                }
                setDeleteConfirm({ open: false, workOrder: null });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

