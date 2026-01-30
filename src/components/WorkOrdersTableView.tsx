import React, { useState } from "react";
import { Edit, Eye, Trash2, MoreHorizontal, FileText, Plus, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileListCard } from "@/components/ui/mobile-list-card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkOrderWithDetails extends Project {
  has_estimate: boolean;
  is_auto_generated_estimate: boolean;
  total_expenses: number;
  expense_count: number;
  estimate_amount: number | null;
  estimates?: Array<{
    id: string;
    is_current_version?: boolean;
    total_amount?: number;
    total_cost?: number;
    status?: string;
  }>;
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
}: WorkOrdersTableViewProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; workOrder: Project | null}>({
    open: false,
    workOrder: null
  });

  const getFinancialDisplayValues = (workOrder: WorkOrderWithDetails) => {
    const status = workOrder.status;
    if (status === "estimating") {
      const currentEstimate = workOrder.estimates?.find((e: { is_current_version?: boolean }) => e.is_current_version);
      if (currentEstimate) {
        const estimateValue = currentEstimate.total_amount ?? 0;
        const estimatedCosts = currentEstimate.total_cost ?? 0;
        const estimatedMargin = estimateValue - estimatedCosts;
        const estimatedMarginPct = estimateValue > 0 ? (estimatedMargin / estimateValue) * 100 : 0;
        return {
          contractLabel: "Est. Value",
          contractValue: estimateValue,
          costsLabel: "Est. Costs",
          costsValue: estimatedCosts,
          marginLabel: "Est. Margin",
          marginValue: estimatedMargin,
          marginPct: estimatedMarginPct,
          isEstimate: true,
        };
      }
    }
    return {
      contractLabel: "Contract",
      contractValue: workOrder.contracted_amount ?? 0,
      costsLabel: "Adj. Est. Costs",
      costsValue: workOrder.adjusted_est_costs ?? 0,
      marginLabel: "Proj. Margin",
      marginValue: workOrder.adjusted_est_margin ?? workOrder.projected_margin ?? 0,
      marginPct: workOrder.margin_percentage ?? 0,
      isEstimate: false,
    };
  };

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
    { key: "adjusted_est_margin", label: "Adj. Est. Margin ($)", required: false, sortable: true },
    { key: "actual_margin", label: "Actual Margin ($)", required: false, sortable: true },
    { key: "margin_percentage", label: "Adj. Est. Margin %", required: false, sortable: true },
    { key: "has_estimate", label: "Has Estimate", required: false, sortable: true },
    { key: "total_expenses", label: "Actual Expenses", required: false, sortable: true },
    { key: "start_date", label: "Start Date", required: false, sortable: true },
    { key: "end_date", label: "Target/End Date", required: false, sortable: true },
    { key: "actions", label: "Actions", required: true },
  ];

  const widths: Record<string, string> = {
    project_number: "w-32",
    project_name: "w-64",
    client_name: "w-40",
    status: "w-24",
    customer_po_number: "w-32",
    contracted_amount: "w-32",
    do_not_exceed: "w-32",
    original_est_costs: "w-36",
    adjusted_est_costs: "w-36",
    adjusted_est_margin: "w-36",
    actual_margin: "w-36",
    margin_percentage: "w-32",
    has_estimate: "w-24",
    total_expenses: "w-28",
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
    adjusted_est_margin: "text-right",
    actual_margin: "text-right",
    margin_percentage: "text-right",
    total_expenses: "text-right",
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
    adjusted_est_margin: "Adj. Est. Margin ($)",
    actual_margin: "Actual Margin ($)",
    margin_percentage: "Adj. Est. Margin %",
    has_estimate: "Has Estimate",
    total_expenses: "Actual Expenses",
    start_date: "Start Date",
    end_date: "Target/End Date",
    actions: "Actions",
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const statusColors: Record<ProjectStatus, string> = {
      'estimating': 'text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300',
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

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-2">
          {workOrders.map((workOrder) => {
            const display = getFinancialDisplayValues(workOrder);
            return (
              <MobileListCard
                key={workOrder.id}
                title={workOrder.project_name}
                subtitle={`${workOrder.project_number}${workOrder.client_name ? ` • ${workOrder.client_name}` : ""}`}
                badge={{
                  label: workOrder.status.replace("_", " ").toUpperCase(),
                  className: (() => {
                    switch (workOrder.status) {
                      case "complete":
                        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                      case "in_progress":
                        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
                      case "on_hold":
                        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
                      case "cancelled":
                        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
                      case "approved":
                        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
                      default:
                        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
                    }
                  })(),
                }}
                secondaryBadge={
                  workOrder.has_estimate
                    ? workOrder.is_auto_generated_estimate
                      ? { label: "AUTO EST", className: "border-gray-300 text-gray-600" }
                      : { label: "ESTIMATE", className: "border-green-300 text-green-700" }
                    : undefined
                }
                metrics={[
                  {
                    label: "Contract",
                    value:
                      display.contractValue != null && display.contractValue !== 0
                        ? formatCurrency(display.contractValue)
                        : "—",
                    subtext: display.isEstimate ? "(est)" : undefined,
                  },
                  {
                    label: "Margin",
                    value:
                      display.marginValue != null && display.marginValue !== undefined
                        ? formatCurrency(display.marginValue)
                        : "—",
                  },
                ]}
                attention={(() => {
                  if (
                    workOrder.do_not_exceed &&
                    (workOrder.total_expenses ?? 0) > workOrder.do_not_exceed
                  ) {
                    return { message: "Over DNE budget", variant: "error" as const };
                  }
                  if (!workOrder.has_estimate || workOrder.is_auto_generated_estimate) {
                    return { message: "Needs real estimate", variant: "warning" as const };
                  }
                  return undefined;
                })()}
                expandable={true}
                expandedContent={
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Total Expenses</p>
                        <p className="font-medium">{formatCurrency(workOrder.total_expenses || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expense Count</p>
                        <p className="font-medium">{workOrder.expense_count ?? 0}</p>
                      </div>
                      {workOrder.do_not_exceed && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Do Not Exceed</p>
                            <p className="font-medium">{formatCurrency(workOrder.do_not_exceed)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">DNE Remaining</p>
                            <p
                              className={cn(
                                "font-medium",
                                (workOrder.do_not_exceed - (workOrder.total_expenses ?? 0)) < 0 && "text-red-600"
                              )}
                            >
                              {formatCurrency(workOrder.do_not_exceed - (workOrder.total_expenses ?? 0))}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {workOrder.start_date
                            ? format(new Date(workOrder.start_date), "MMM dd, yyyy")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium">
                          {workOrder.end_date
                            ? format(new Date(workOrder.end_date), "MMM dd, yyyy")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    {workOrder.customer_po_number && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground">Customer PO</p>
                        <p className="font-medium font-mono">{workOrder.customer_po_number}</p>
                      </div>
                    )}
                  </div>
                }
                selectable={!!onSelectOne}
                selected={selectedIds.includes(workOrder.id)}
                onSelectChange={(checked) => onSelectOne?.(workOrder.id, checked)}
                onTap={() => navigate(`/projects/${workOrder.id}`)}
                actions={[
                  {
                    icon: Eye,
                    label: "View Details",
                    onClick: (e) => {
                      e.stopPropagation();
                      navigate(`/projects/${workOrder.id}`);
                    },
                  },
                  {
                    icon: Edit,
                    label: "Edit",
                    onClick: (e) => {
                      e.stopPropagation();
                      onEdit(workOrder);
                    },
                  },
                  ...(!workOrder.has_estimate || workOrder.is_auto_generated_estimate
                    ? [
                        {
                          icon: FileText,
                          label: "Create Estimate",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleViewEstimate(workOrder);
                          },
                        },
                      ]
                    : []),
                  ...(workOrder.status !== "complete"
                    ? [
                        {
                          icon: CheckCircle,
                          label: "Mark Complete",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleMarkComplete(workOrder);
                          },
                        },
                      ]
                    : []),
                  {
                    icon: Trash2,
                    label: "Delete",
                    onClick: (e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ open: true, workOrder });
                    },
                    variant: "destructive" as const,
                  },
                ]}
              />
            );
          })}
        </div>

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
  }

  // Desktop table view
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
                            <TableCell key={colKey} className="p-1.5 font-mono font-bold text-foreground text-xs">
                              {workOrder.project_number}
                            </TableCell>
                          );
                        case "project_name":
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <div className="text-xs font-medium truncate max-w-[250px]" title={workOrder.project_name}>
                                {workOrder.project_name}
                              </div>
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
                        case "contracted_amount": {
                          const display = getFinancialDisplayValues(workOrder);
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-right cursor-help">
                                    <div className="font-medium tabular-nums">
                                      {display.contractValue ? formatCurrency(display.contractValue) : "—"}
                                    </div>
                                    {display.isEstimate && (
                                      <div className="text-[10px] text-muted-foreground italic">estimate</div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{display.contractLabel}: {display.contractValue ? formatCurrency(display.contractValue) : "—"}</p>
                                  {display.isEstimate && <p className="text-xs italic">From current estimate (not yet approved)</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        }
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
                        case "adjusted_est_costs": {
                          const display = getFinancialDisplayValues(workOrder);
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-right cursor-help">
                                    <div className="font-medium tabular-nums">
                                      {display.costsValue ? formatCurrency(display.costsValue) : "—"}
                                    </div>
                                    {display.isEstimate && (
                                      <div className="text-[10px] text-muted-foreground italic">estimate</div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{display.costsLabel}: {display.costsValue ? formatCurrency(display.costsValue) : "—"}</p>
                                  {display.isEstimate && <p className="text-xs italic">From current estimate (not yet approved)</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        }
                        case "adjusted_est_margin": {
                          const display = getFinancialDisplayValues(workOrder);
                          const hasMargin = display.marginValue !== null && display.marginValue !== undefined;
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-right cursor-help">
                                    <div className={cn(
                                      "font-medium tabular-nums",
                                      hasMargin && display.marginValue >= 0 ? "text-green-600" : hasMargin ? "text-red-600" : ""
                                    )}>
                                      {hasMargin ? formatCurrency(display.marginValue) : "—"}
                                    </div>
                                    {display.isEstimate && (
                                      <div className="text-[10px] text-muted-foreground italic">estimate</div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{display.marginLabel}: {hasMargin ? formatCurrency(display.marginValue) : "—"}</p>
                                  {display.isEstimate && <p className="text-xs italic">From current estimate (not yet approved)</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        }
                        case "actual_margin": {
                          const value = workOrder.actual_margin ?? workOrder.current_margin;
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {value !== null && value !== undefined 
                                ? formatCurrency(value) 
                                : "—"}
                            </TableCell>
                          );
                        }
                        case "margin_percentage": {
                          const display = getFinancialDisplayValues(workOrder);
                          const hasPct = display.marginPct !== null && display.marginPct !== undefined;
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-right cursor-help">
                                    <div className={cn(
                                      "font-medium tabular-nums",
                                      hasPct && display.marginPct >= 0 ? "text-green-600" : hasPct ? "text-red-600" : ""
                                    )}>
                                      {hasPct ? `${display.marginPct.toFixed(1)}%` : "—"}
                                    </div>
                                    {display.isEstimate && (
                                      <div className="text-[10px] text-muted-foreground italic">estimate</div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{display.marginLabel}: {hasPct ? `${display.marginPct.toFixed(1)}%` : "—"}</p>
                                  {display.isEstimate && <p className="text-xs italic">From current estimate (not yet approved)</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        }
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

