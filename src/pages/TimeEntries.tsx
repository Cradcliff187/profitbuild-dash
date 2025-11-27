import { useState, useEffect, useRef, useMemo } from "react";
import {
  ClipboardCheck,
  Download,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Eye,
  FileImage,
  Paperclip,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { TimeEntryFilters } from "@/types/timeEntry";
import { TimeEntrySearchFilters } from "@/components/TimeEntrySearchFilters";
import { TimeEntryBulkActions } from "@/components/TimeEntryBulkActions";
import { RejectTimeEntryDialog } from "@/components/RejectTimeEntryDialog";
import { EditTimeEntryDialog } from "@/components/time-tracker/EditTimeEntryDialog";
import { TimeEntryExportModal } from "@/components/TimeEntryExportModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ColumnSelector } from "@/components/ui/column-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptsManagement, ReceiptsManagementRef } from "@/components/ReceiptsManagement";
import { CreateTimeEntryDialog } from "@/components/time-tracker/CreateTimeEntryDialog";
import { AddReceiptModal } from "@/components/time-tracker/AddReceiptModal";
import { useRoles } from "@/contexts/RoleContext";

// Define column metadata for selector (must be outside component for state initialization)
const columnDefinitions = [
  { key: "worker", label: "Worker", required: true, sortable: true },
  { key: "employee_number", label: "Employee #", required: false, sortable: true },
  { key: "project", label: "Project", required: true, sortable: true },
  { key: "address", label: "Project Address", required: false, sortable: true },
  { key: "date", label: "Date", required: true, sortable: true },
  { key: "start", label: "Start Time", required: false, sortable: true },
  { key: "end", label: "End Time", required: false, sortable: true },
  { key: "hours", label: "Hours", required: false, sortable: true },
  { key: "amount", label: "Amount", required: false, sortable: true },
  { key: "receipt", label: "Receipt", required: false, sortable: true },
  { key: "status", label: "Status", required: false, sortable: true },
  { key: "submitted_at", label: "Submitted At", required: false, sortable: true },
  { key: "actions", label: "Actions", required: true },
];

const TimeEntries = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "receipts" ? "receipts" : "entries";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync tab with URL parameter changes
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Apply URL status parameter to filters
  useEffect(() => {
    const statusParam = searchParams.get("status");

    if (statusParam && (statusParam === "pending" || statusParam === "approved" || statusParam === "rejected")) {
      setFilters((prev) => ({
        ...prev,
        status: [statusParam],
      }));
    }
  }, [searchParams]);

  const [filters, setFilters] = useState<TimeEntryFilters>({
    dateFrom: null,
    dateTo: null,
    status: [],
    workerIds: [],
    projectIds: [],
  });
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [receiptCount, setReceiptCount] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);
  const { isAdmin, isManager } = useRoles();
  const canCreateTimeEntry = isAdmin || isManager;
  const receiptsManagementRef = useRef<ReceiptsManagementRef>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Receipt column definitions
  const receiptColumnDefinitions = [
    { key: 'preview', label: 'Preview', required: true },
    { key: 'type', label: 'Type', required: false },
    { key: 'payee', label: 'Vendor', required: true },
    { key: 'project', label: 'Project', required: true },
    { key: 'date', label: 'Date', required: true },
    { key: 'amount', label: 'Amount', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'submitted_at', label: 'Submitted At', required: false },
    { key: 'submitted_by', label: 'Submitted By', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];
  
  // Receipt column state (will be synced from ReceiptsManagement via ref)
  const [receiptVisibleColumns, setReceiptVisibleColumns] = useState<string[]>([]);
  const [receiptColumnOrder, setReceiptColumnOrder] = useState<string[]>([]);
  
  // Sync receipt column state from ref when tab changes to receipts
  useEffect(() => {
    if (activeTab === "receipts") {
      // Use a small timeout to ensure the ref is ready after component mount
      const timer = setTimeout(() => {
        if (receiptsManagementRef.current) {
          const columnState = receiptsManagementRef.current.getColumnState();
          setReceiptVisibleColumns(columnState.visibleColumns);
          setReceiptColumnOrder(columnState.columnOrder);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("time-entries-visible-columns");
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return [
      "worker",
      "project",
      "date",
      "start",
      "end",
      "hours",
      "amount",
      "receipt",
      "status",
      "submitted_at",
      "actions",
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("time-entries-column-order");
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
    localStorage.setItem("time-entries-visible-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem("time-entries-column-order", JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Fetch receipt count
  const fetchReceiptCount = async () => {
    try {
      // Count only PENDING receipts from both sources
      const [{ count: timeEntryCount }, { count: standaloneCount }] = await Promise.all([
        supabase
          .from("expenses")
          .select("*", { count: "exact", head: true })
          .eq("category", "labor_internal")
          .not("attachment_url", "is", null)
          .or("approval_status.is.null,approval_status.eq.pending"),
        supabase
          .from("receipts")
          .select("*", { count: "exact", head: true })
          .or("approval_status.is.null,approval_status.eq.pending"),
      ]);

      setReceiptCount((timeEntryCount || 0) + (standaloneCount || 0));
    } catch (error) {
      console.error("Failed to fetch receipt count:", error);
    }
  };

  const pagination = usePagination({
    totalItems: 0,
    pageSize,
    initialPage: 1,
  });

  const { entries, statistics, loading, totalCount, refetch } = useTimeEntries(
    filters,
    pageSize,
    pagination.currentPage,
  );

  const tabOptions = [
    {
      value: "entries",
      label: "Time Entries",
      icon: ClipboardCheck,
      badgeCount: statistics.pendingCount,
    },
    {
      value: "receipts",
      label: "Receipts",
      icon: FileImage,
      badgeCount: receiptCount,
    },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Update pagination when totalCount changes
  useEffect(() => {
    if (totalCount !== pagination.totalPages * pageSize) {
      pagination.goToPage(1);
    }
  }, [totalCount]);

  // Fetch receipt count on mount
  useEffect(() => {
    fetchReceiptCount();
  }, []);

  // Fetch workers for filter
  useEffect(() => {
    const fetchWorkers = async () => {
      const { data, error } = await supabase
        .from("payees")
        .select("id, payee_name")
        .eq("is_internal", true)
        .eq("provides_labor", true)
        .eq("is_active", true)
        .order("payee_name");

      if (error) {
        console.error("Error fetching workers:", error);
        return;
      }

      if (data) {
        setWorkers(data.map((w) => ({ id: w.id, name: w.payee_name })));
      }
    };
    fetchWorkers();
  }, []);

  // Fetch projects for filter
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = (await supabase
        .from("projects")
        .select("id, project_number, project_name, category")
        .eq('category', 'construction')
        .order('project_number')) as any;

      if (data) {
        setProjects(
          data.map((p: any) => ({
            id: p.id,
            number: p.project_number,
            name: p.project_name,
          })),
        );
      }
    };
    fetchProjects();
  }, []);

  // Real-time updates for time entries
  useEffect(() => {
    const channel = supabase
      .channel("time-entries-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: "category=eq.labor_internal",
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Real-time updates for receipt count
  useEffect(() => {
    const channel = supabase
      .channel("receipt-count-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: "category=eq.labor_internal",
        },
        fetchReceiptCount,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
        },
        fetchReceiptCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(entries.map((e) => e.id));
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

  const handleApprove = async (entryIds: string[]) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          approval_status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .in("id", entryIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"} approved`,
      });
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve entries",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (reason: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
          approved_by: null,
          approved_at: null,
        })
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? "entry" : "entries"} rejected`,
      });
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject entries",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase.from("expenses").delete().in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? "entry" : "entries"} deleted`,
      });
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive",
      });
    }
  };

  const handleCreateTimeEntry = () => {
    setCreateDialogOpen(true);
  };

  const handleTimeEntrySaved = () => {
    refetch();
    fetchReceiptCount();
    toast({
      title: "Success",
      description: "Time entry created successfully",
    });
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      status: [],
      workerIds: [],
      projectIds: [],
    });
  };

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

  const sortedEntries = useMemo(() => {
    if (!sortColumn) return entries;
    
    return [...entries].sort((a, b) => {
      let aValue, bValue;
      switch (sortColumn) {
        case 'worker':
          aValue = a.worker_name || '';
          bValue = b.worker_name || '';
          break;
        case 'employee_number':
          aValue = a.payee?.employee_number || '';
          bValue = b.payee?.employee_number || '';
          break;
        case 'project':
          aValue = a.project_number || '';
          bValue = b.project_number || '';
          break;
        case 'address':
          aValue = a.project_address || '';
          bValue = b.project_address || '';
          break;
        case 'date':
          aValue = new Date(a.expense_date).getTime();
          bValue = new Date(b.expense_date).getTime();
          break;
        case 'start':
          aValue = a.start_time ? new Date(a.start_time).getTime() : 0;
          bValue = b.start_time ? new Date(b.start_time).getTime() : 0;
          break;
        case 'end':
          aValue = a.end_time ? new Date(a.end_time).getTime() : 0;
          bValue = b.end_time ? new Date(b.end_time).getTime() : 0;
          break;
        case 'hours':
          aValue = a.hours;
          bValue = b.hours;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'receipt':
          aValue = a.attachment_url ? 1 : 0;
          bValue = b.attachment_url ? 1 : 0;
          break;
        case 'status':
          aValue = a.approval_status || 'pending';
          bValue = b.approval_status || 'pending';
          break;
        case 'submitted_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
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
  }, [entries, sortColumn, sortDirection]);

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

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 py-2 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="flex items-center space-x-3 min-w-0">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Employee Time and Receipt Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Review time entries and manage receipts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {canCreateTimeEntry && activeTab === "entries" && (
            <Button onClick={handleCreateTimeEntry} size="sm" className="flex items-center gap-1 flex-1 sm:flex-initial">
              <Plus className="h-4 w-4" />
              Create Time Entry
            </Button>
          )}
          {activeTab === "receipts" && (
            <Button onClick={() => setAddReceiptModalOpen(true)} size="sm" className="flex items-center gap-1 flex-1 sm:flex-initial">
              <Plus className="h-4 w-4" />
              Add Receipt
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2">
            {activeTab === "entries" && (
              <>
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
                  onClick={() => setShowExportModal(true)}
                  disabled={entries.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </>
            )}
            {activeTab === "receipts" && receiptsManagementRef.current && (
              <>
                <ColumnSelector
                  columns={receiptColumnDefinitions}
                  visibleColumns={receiptVisibleColumns}
                  onVisibilityChange={(cols) => {
                    setReceiptVisibleColumns(cols);
                    const columnState = receiptsManagementRef.current?.getColumnState();
                    if (columnState) {
                      columnState.setVisibleColumns(cols);
                    }
                  }}
                  columnOrder={receiptColumnOrder}
                  onColumnOrderChange={(order) => {
                    setReceiptColumnOrder(order);
                    const columnState = receiptsManagementRef.current?.getColumnState();
                    if (columnState) {
                      columnState.setColumnOrder(order);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => receiptsManagementRef.current?.exportToCSV()}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                          {tab.badgeCount > 0 && (
                            <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1.5">
                              {tab.badgeCount}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.badgeCount > 0 && (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                        {tab.badgeCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* Time Entries Tab */}
        <TabsContent value="entries" className="space-y-2">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                    <p className="text-base font-bold">{statistics.pendingCount}</p>
                  </div>
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Approved This Week</p>
                    <p className="text-base font-bold">{statistics.approvedThisWeekHours.toFixed(1)}h</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                    <p className="text-base font-bold">{statistics.rejectedCount}</p>
                  </div>
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total This Month</p>
                    <p className="text-base font-bold">{statistics.totalThisMonthHours.toFixed(1)}h</p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <TimeEntrySearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            resultCount={totalCount}
            workers={workers}
            projects={projects}
          />

          {/* Bulk Actions */}
          <TimeEntryBulkActions
            selectedCount={selectedIds.length}
            onApprove={() => handleApprove(selectedIds)}
            onReject={() => setRejectDialogOpen(true)}
            onDelete={() => setDeleteDialogOpen(true)}
            onCancel={() => setSelectedIds([])}
          />

          {/* Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-auto -mx-2 px-2 sm:mx-0 sm:px-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                    <TableRow className="h-8">
                      <TableHead className="w-10 p-2">
                        <Checkbox
                          checked={selectedIds.length === sortedEntries.length && sortedEntries.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      {columnOrder.map((colKey) => {
                        if (!visibleColumns.includes(colKey)) return null;
                        
                        const column = columnDefinitions.find(col => col.key === colKey);
                        const isSortable = column?.sortable;

                        const widths: Record<string, string> = {
                          worker: "w-32",
                          employee_number: "w-28",
                          project: "w-48",
                          address: "w-40",
                          date: "w-28",
                          start: "w-20",
                          end: "w-20",
                          hours: "w-20",
                          amount: "w-24",
                          receipt: "w-16",
                          status: "w-24",
                          submitted_at: "w-36",
                          actions: "w-20",
                        };
                        
                        const alignments: Record<string, string> = {
                          hours: "text-right",
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
                          hours: "Hours",
                          amount: "Amount",
                          receipt: "Receipt",
                          status: "Status",
                          submitted_at: "Submitted At",
                          actions: "Actions",
                        };

                        return (
                          <TableHead 
                            key={colKey} 
                            className={cn(
                              `p-2 text-xs font-medium h-8 ${widths[colKey]} ${alignments[colKey] || ''}`,
                              isSortable && "cursor-pointer hover:text-foreground select-none"
                            )}
                            onClick={() => isSortable && handleSort(colKey)}
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
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-xs">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColumns.length + 1}
                          className="text-center py-4 text-xs text-muted-foreground"
                        >
                          No time entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedEntries.map((entry) => (
                        <TableRow key={entry.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                          <TableCell className="p-1.5">
                            <Checkbox
                              checked={selectedIds.includes(entry.id)}
                              onCheckedChange={(checked) => handleSelectOne(entry.id, checked as boolean)}
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
                                    {format(new Date(entry.expense_date + "T12:00:00"), "MMM dd, yyyy")}
                                  </TableCell>
                                );
                              case "start":
                                return (
                                  <TableCell key={colKey} className="p-1.5 font-mono text-xs">
                                    {entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "-"}
                                  </TableCell>
                                );
                              case "end":
                                return (
                                  <TableCell key={colKey} className="p-1.5 font-mono text-xs">
                                    {entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "-"}
                                  </TableCell>
                                );
                              case "hours":
                                return (
                                  <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                                    {entry.hours.toFixed(2)}
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
                                  <TableCell key={colKey}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Time Entry
                                        </DropdownMenuItem>
                                        {(!entry.approval_status || entry.approval_status === "pending") && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleApprove([entry.id])}>
                                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                              Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setSelectedIds([entry.id]);
                                                setRejectDialogOpen(true);
                                              }}
                                            >
                                              <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                              Reject
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => navigate(`/projects/${entry.project_id}`)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Project
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                );
                              default:
                                return null;
                            }
                          })}
                        </TableRow>
                      ))
                    )}
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

                  {totalCount > pageSize && (
                    <CompletePagination
                      currentPage={pagination.currentPage}
                      totalPages={Math.ceil(totalCount / pageSize)}
                      onPageChange={pagination.goToPage}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts">
          <ReceiptsManagement ref={receiptsManagementRef} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RejectTimeEntryDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleReject}
        entryCount={selectedIds.length}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "time entry" : "time entries"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            refetch();
          }}
        />
      )}

      {/* Create Time Entry Dialog - Only for admins and managers */}
      {canCreateTimeEntry && (
        <CreateTimeEntryDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSaved={handleTimeEntrySaved}
        />
      )}

      {/* Export Modal */}
      <TimeEntryExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entries={entries}
        filters={filters}
      />

      {/* Add Receipt Modal */}
      <AddReceiptModal
        open={addReceiptModalOpen}
        onClose={() => setAddReceiptModalOpen(false)}
        onSuccess={() => {
          setAddReceiptModalOpen(false);
          receiptsManagementRef.current?.refresh();
          fetchReceiptCount();
        }}
      />
    </div>
  );
};

export default TimeEntries;
