import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ClipboardCheck, FileImage, Plus, Download, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { TimeEntrySearchFilters } from "@/components/TimeEntrySearchFilters";
import { TimeEntryBulkActions } from "@/components/TimeEntryBulkActions";
import { TimeEntryExportModal } from "@/components/TimeEntryExportModal";
import { AdminCreateTimeEntrySheet } from "@/components/time-entries/AdminCreateTimeEntrySheet";
import { AdminEditTimeEntrySheet } from "@/components/time-entries/AdminEditTimeEntrySheet";
import { RejectTimeEntryDialog } from "@/components/RejectTimeEntryDialog";
import { AddReceiptModal } from "@/components/time-tracker/AddReceiptModal";
import { ReceiptsManagement, ReceiptsManagementRef } from "@/components/ReceiptsManagement";
import { ReceiptSearchFilters, ReceiptFilters } from "@/components/ReceiptSearchFilters";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { TimeEntryFilters, TimeEntryListItem } from "@/types/timeEntry";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ColumnSelector } from "@/components/ui/column-selector";
import { TimeEntriesCardView } from "@/components/TimeEntriesCardView";
import { timeEntryColumnDefinitions } from "@/config/timeEntryColumns";
import { receiptColumnDefinitions } from "@/config/receiptColumns";
import { TimeEntriesTable } from "@/components/time-entries/TimeEntriesTable";
import { useTimeEntrySelection } from "@/hooks/useTimeEntrySelection";
import { useTimeEntrySorting } from "@/hooks/useTimeEntrySorting";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const TimeEntriesPage = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isAdmin, isManager } = useRoles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state
  const tabFromUrl = searchParams.get("tab") === "receipts" ? "receipts" : "entries";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Filters state
  const [filters, setFilters] = useState<TimeEntryFilters>({
    dateFrom: null,
    dateTo: null,
    status: [],
    workerIds: [],
    projectIds: [],
  });

  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>({
    dateFrom: null,
    dateTo: null,
    status: [],
    payeeIds: [],
    projectIds: [],
    amount: null,
  });

  // Workers and projects for filters
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);
  
  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Receipt management ref
  const receiptsManagementRef = useRef<ReceiptsManagementRef>(null);
  
  // Receipt state
  const [receiptStatistics, setReceiptStatistics] = useState({
    pendingCount: 0,
    approvedTodayCount: 0,
    rejectedCount: 0,
    totalThisWeekCount: 0,
  });
  const [receiptFilteredCount, setReceiptFilteredCount] = useState(0);
  const [receiptPayees, setReceiptPayees] = useState<Array<{ id: string; name: string }>>([]);
  const [receiptProjects, setReceiptProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);
  const [receiptVisibleColumns, setReceiptVisibleColumns] = useState<string[]>(
    receiptColumnDefinitions.filter(col => col.required || col.key === "status" || col.key === "amount").map(col => col.key)
  );
  const [receiptColumnOrder, setReceiptColumnOrder] = useState<string[]>(receiptColumnDefinitions.map((col) => col.key));

  // Modals state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryListItem | null>(null);
  const [rejectDialogEntry, setRejectDialogEntry] = useState<TimeEntryListItem | null>(null);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Column state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    timeEntryColumnDefinitions.filter(col => col.required || col.key === "status" || col.key === "hours").map(col => col.key)
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(timeEntryColumnDefinitions.map((col) => col.key));

  // Calculate totals
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Receipt count for badge
  const [receiptCount, setReceiptCount] = useState(0);
  
  // Pending time entries count for badge (all pending, not filtered)
  const [pendingTimeEntriesCount, setPendingTimeEntriesCount] = useState(0);

  // Debounce filters to prevent rapid refetches (500ms delay)
  const debouncedFilters = useDebounce(filters, 500);

  // Track previous filters to detect changes and reset pagination
  const prevFiltersRef = useRef<TimeEntryFilters>(filters);

  // Use time entries hook with debounced filters
  const {
    entries: timeEntries,
    loading,
    statistics,
    totalCount,
    refetch: refreshTimeEntries,
  } = useTimeEntries(debouncedFilters, pageSize, currentPage);

  // Initialize pagination with totalCount (will update when totalCount changes)
  const pagination = usePagination({
    totalItems: totalCount || 0,
    pageSize: pageSize,
    initialPage: currentPage,
  });

  // Create a wrapper for goToPage that updates local state (which triggers useTimeEntries refetch)
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Create pagination object for components that expect { currentPage, goToPage }
  const paginationProps = {
    currentPage: currentPage,
    goToPage: handlePageChange,
  };

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    const filtersChanged = 
      prevFiltersRef.current.dateFrom !== filters.dateFrom ||
      prevFiltersRef.current.dateTo !== filters.dateTo ||
      JSON.stringify(prevFiltersRef.current.status) !== JSON.stringify(filters.status) ||
      JSON.stringify(prevFiltersRef.current.workerIds) !== JSON.stringify(filters.workerIds) ||
      JSON.stringify(prevFiltersRef.current.projectIds) !== JSON.stringify(filters.projectIds);

    if (filtersChanged) {
      setCurrentPage(1);
    }
    prevFiltersRef.current = filters;
  }, [filters, pagination]);

  // Use extracted hooks
  const selection = useTimeEntrySelection(timeEntries);
  const sorting = useTimeEntrySorting(timeEntries);
  const actions = useTimeEntryActions({
    user,
    refreshTimeEntries,
    setSelectedIds: selection.setSelectedIds,
    setRejectDialogOpen,
    setDeleteDialogOpen,
  });

  // Check permissions (based on roles)
  const canApproveTimeEntries = isAdmin || isManager;
  const canRejectTimeEntries = isAdmin || isManager;
  const canCreateTimeEntry = isAdmin || isManager;

  // Sync tab with URL parameter changes
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Sync receipt data from ref when tab changes to receipts
  useEffect(() => {
    if (activeTab === "receipts") {
      // Use a retry mechanism to ensure data is loaded
      const syncData = () => {
        if (receiptsManagementRef.current) {
          const columnState = receiptsManagementRef.current.getColumnState();
          setReceiptVisibleColumns(columnState.visibleColumns);
          setReceiptColumnOrder(columnState.columnOrder);
          
          const stats = receiptsManagementRef.current.getStatistics();
          setReceiptStatistics(stats);
          const filters = receiptsManagementRef.current.getFilters();
          setReceiptFilters(filters);
          
          const payees = receiptsManagementRef.current.getPayees();
          const projects = receiptsManagementRef.current.getProjects();
          
          // Always update payees and projects (they may be empty initially, but we'll retry)
          setReceiptPayees(payees);
          setReceiptProjects(projects);
          
          const count = receiptsManagementRef.current.getFilteredCount();
          setReceiptFilteredCount(count);
          
          // Return true if data is ready, false if we need to retry
          return payees.length > 0 && projects.length > 0;
        }
        return false;
      };

      // Initial attempt with retry logic
      let attemptCount = 0;
      const maxAttempts = 10; // Try for up to 2 seconds (10 * 200ms)
      
      const trySync = () => {
        attemptCount++;
        const success = syncData();
        
        // If data not ready and we haven't exceeded max attempts, retry
        if (!success && attemptCount < maxAttempts) {
          setTimeout(trySync, 200);
        }
      };

      // Start with a small delay, then retry if needed
      const timer = setTimeout(trySync, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Sync receipt data periodically when on receipts tab
  useEffect(() => {
    if (activeTab === "receipts" && receiptsManagementRef.current) {
      const interval = setInterval(() => {
        if (receiptsManagementRef.current) {
          const stats = receiptsManagementRef.current.getStatistics();
          setReceiptStatistics(stats);
          const filters = receiptsManagementRef.current.getFilters();
          setReceiptFilters(filters);
          
          // Also sync payees and projects periodically
          const payees = receiptsManagementRef.current.getPayees();
          const projects = receiptsManagementRef.current.getProjects();
          
          // Only update if we have data (don't overwrite with empty arrays)
          if (payees.length > 0) {
            setReceiptPayees(payees);
          }
          if (projects.length > 0) {
            setReceiptProjects(projects);
          }
          
          const count = receiptsManagementRef.current.getFilteredCount();
          setReceiptFilteredCount(count);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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

  // Update pagination when totalCount changes (but not when filters change, as that's handled above)
  useEffect(() => {
    const expectedTotalPages = Math.ceil(totalCount / pageSize);
    if (currentPage > expectedTotalPages && expectedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalCount, pageSize, currentPage, pagination]);

  // Calculate totals
  useEffect(() => {
    if (timeEntries) {
      const hours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
      const amount = timeEntries.reduce((sum, e) => sum + e.amount, 0);
      setTotalHours(hours);
      setTotalAmount(amount);
    }
  }, [timeEntries]);

  // Handler for reject dialog
  const handleReject = async (reason: string) => {
    await actions.handleReject(selection.selectedIds, reason);
  };

  // Fetch pending time entries count (all pending, not filtered)
  const fetchPendingTimeEntriesCount = async () => {
    try {
      const { count, error } = await supabase
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .eq("category", "labor_internal")
        .or("approval_status.is.null,approval_status.eq.pending");
      
      if (error) {
        console.error("Error fetching pending time entries count:", error);
        return;
      }
      
      setPendingTimeEntriesCount(count || 0);
    } catch (error) {
      console.error("Error fetching pending time entries count:", error);
    }
  };

  // Fetch receipt count (only pending receipts)
  const fetchReceiptCount = async () => {
    try {
      // Count expenses with receipt_id that are pending
      const { count: expensesWithReceiptsCount, error: expensesError } = await supabase
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .not("receipt_id", "is", null)
        .or("approval_status.is.null,approval_status.eq.pending");
      
      // Count standalone receipts that are pending
      const { count: standaloneCount, error: receiptsError } = await supabase
        .from("receipts")
        .select("*", { count: "exact", head: true })
        .or("approval_status.is.null,approval_status.eq.pending");
      
      if (expensesError) {
        console.error("Error fetching expenses with receipts count:", expensesError);
      }
      if (receiptsError) {
        console.error("Error fetching standalone receipts count:", receiptsError);
      }
      
      setReceiptCount((expensesWithReceiptsCount || 0) + (standaloneCount || 0));
    } catch (error) {
      console.error("Error fetching receipt count:", error);
    }
  };

  // Set up real-time updates for pending time entries count
  useEffect(() => {
    fetchPendingTimeEntriesCount();
    
    const timeEntriesChannel = supabase
      .channel("time-entries-count-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: "category=eq.labor_internal",
        },
        () => {
          fetchPendingTimeEntriesCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timeEntriesChannel);
    };
  }, []);

  // Set up real-time updates for receipt count
  useEffect(() => {
    fetchReceiptCount();
    
    const expensesChannel = supabase
      .channel("expenses-receipts-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        fetchReceiptCount,
      )
      .subscribe();

    const receiptsChannel = supabase
      .channel("receipts-updates")
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
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(receiptsChannel);
    };
  }, []);

  const tabOptions = [
    {
      value: "entries",
      label: "Time Entries",
      icon: ClipboardCheck,
      badgeCount: pendingTimeEntriesCount,
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
    navigate(`/time-entries${value === "receipts" ? "?tab=receipts" : ""}`);
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

  return (
    <MobilePageWrapper className="space-y-4">
      <PageHeader
        icon={ClipboardCheck}
        title="Time Entries"
        description="Review time entries and manage receipts"
        actions={
          <>
            {canCreateTimeEntry && activeTab === "entries" && (
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="hidden sm:flex items-center gap-1">
                <Plus className="h-4 w-4" />
                New Entry
              </Button>
            )}
            {activeTab === "receipts" && (
              <Button onClick={() => setAddReceiptModalOpen(true)} size="sm" className="hidden sm:flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Receipt
              </Button>
            )}
            {activeTab === "entries" && (
              <>
                <ColumnSelector
                  columns={timeEntryColumnDefinitions}
                  visibleColumns={visibleColumns}
                  columnOrder={columnOrder}
                  onVisibleColumnsChange={setVisibleColumns}
                  onColumnOrderChange={setColumnOrder}
                  className="hidden sm:flex"
                />
                <Button variant="ghost" size="sm" onClick={() => setExportModalOpen(true)} className="hidden sm:flex">
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </>
            )}
            {activeTab === "receipts" && receiptsManagementRef.current && (
              <>
                <ColumnSelector
                  columns={receiptColumnDefinitions}
                  visibleColumns={receiptVisibleColumns}
                  columnOrder={receiptColumnOrder}
                  onVisibleColumnsChange={(cols) => {
                    const columnState = receiptsManagementRef.current?.getColumnState();
                    if (columnState) {
                      columnState.setVisibleColumns(cols);
                    }
                  }}
                  onColumnOrderChange={(order) => {
                    const columnState = receiptsManagementRef.current?.getColumnState();
                    if (columnState) {
                      columnState.setColumnOrder(order);
                    }
                  }}
                  className="hidden sm:flex"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => receiptsManagementRef.current?.exportToCSV()}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </>
            )}
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto overflow-hidden">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{tab.label}</span>
                          {tab.badgeCount > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs font-semibold h-5 px-2 bg-slate-900 text-white border-0 hover:bg-slate-800"
                            >
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
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                    {tab.badgeCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-1 text-xs font-semibold h-5 px-2 min-w-[1.5rem] flex items-center justify-center bg-slate-900 text-white border-0 hover:bg-slate-800"
                      >
                        {tab.badgeCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <TabsContent value="entries" className="space-y-4 min-h-[600px]">
          <TimeEntrySearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            resultCount={timeEntries.length}
            workers={workers}
            projects={projects}
          />
          
          {/* Bulk Actions for Desktop - Right above table like Receipts */}
          {!isMobile && selection.selectedIds.length > 0 && (
            <TimeEntryBulkActions
              selectedCount={selection.selectedIds.length}
              onApprove={() => actions.handleApprove(selection.selectedIds)}
              onReject={() => setRejectDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              onCancel={selection.clearSelection}
            />
          )}
          
          {isMobile ? (
            <TimeEntriesCardView
              timeEntries={timeEntries || []}
              selectedIds={selection.selectedIds}
              onSelectOne={selection.handleSelectOne}
              onEdit={(entry) => setEditingEntry(entry as TimeEntryListItem)}
              onReject={(entry) => setRejectDialogEntry(entry as TimeEntryListItem)}
              onRefresh={refreshTimeEntries}
              canApprove={canApproveTimeEntries}
              canReject={canRejectTimeEntries}
              totalCount={totalCount}
              pagination={paginationProps}
              pageSize={pageSize}
              setPageSize={setPageSize}
              onBulkApprove={() => actions.handleApprove(selection.selectedIds)}
              onBulkReject={() => setRejectDialogOpen(true)}
              onBulkDelete={() => setDeleteDialogOpen(true)}
              onClearSelection={selection.clearSelection}
            />
          ) : (
            <ErrorBoundary>
              <TimeEntriesTable
                entries={sorting.sortedEntries}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                sortColumn={sorting.sortColumn}
                sortDirection={sorting.sortDirection}
                selectedIds={selection.selectedIds}
                onSort={sorting.handleSort}
                onSelectAll={selection.handleSelectAll}
                onSelectOne={selection.handleSelectOne}
                onApprove={(entryId) => actions.handleApprove([entryId])}
                onReject={(entryId) => {
                  selection.setSelectedIds([entryId]);
                  setRejectDialogOpen(true);
                }}
                onEdit={setEditingEntry}
                onViewProject={(projectId) => navigate(`/projects/${projectId}`)}
                totalCount={totalCount}
                totalHours={totalHours}
                totalAmount={totalAmount}
                loading={loading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                pagination={paginationProps}
                renderSortIcon={sorting.renderSortIcon}
              />
            </ErrorBoundary>
          )}
          
          {isMobile && canCreateTimeEntry && (
            <Button
              variant="default"
              onClick={() => setCreateDialogOpen(true)}
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            >
              <Plus className="h-6 w-6 !text-white" />
            </Button>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4 min-h-[600px]">
          <ReceiptSearchFilters
            filters={receiptFilters}
            onFiltersChange={(newFilters) => {
              setReceiptFilters(newFilters);
              if (receiptsManagementRef.current) {
                receiptsManagementRef.current.setFilters(newFilters);
              }
            }}
            onReset={() => {
              const resetFilters: ReceiptFilters = {
                dateFrom: null,
                dateTo: null,
                status: [],
                payeeIds: [],
                projectIds: [],
                amount: null,
              };
              setReceiptFilters(resetFilters);
              if (receiptsManagementRef.current) {
                receiptsManagementRef.current.resetFilters();
              }
            }}
            resultCount={receiptFilteredCount}
            payees={receiptPayees}
            projects={receiptProjects}
          />
          <ErrorBoundary>
            <ReceiptsManagement ref={receiptsManagementRef} />
          </ErrorBoundary>
          
          {isMobile && (
            <Button
              variant="default"
              onClick={() => setAddReceiptModalOpen(true)}
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            >
              <Plus className="h-6 w-6 !text-white" />
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AdminCreateTimeEntrySheet
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refreshTimeEntries}
      />
      
      {editingEntry && (
        <AdminEditTimeEntrySheet
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSuccess={() => {
            setEditingEntry(null);
            refreshTimeEntries();
          }}
        />
      )}
      
      {rejectDialogEntry && (
        <RejectTimeEntryDialog
          open={!!rejectDialogEntry}
          onOpenChange={(open) => !open && setRejectDialogEntry(null)}
          entryCount={1}
          onConfirm={(reason) => {
            actions.handleReject([rejectDialogEntry.id], reason);
            setRejectDialogEntry(null);
          }}
        />
      )}

      {/* Bulk Reject Dialog */}
      <RejectTimeEntryDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        entryCount={selection.selectedIds.length}
        onConfirm={(reason) => {
          handleReject(reason);
        }}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selection.selectedIds.length} {selection.selectedIds.length === 1 ? 'time entry' : 'time entries'}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                actions.handleDelete(selection.selectedIds);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AddReceiptModal
        open={addReceiptModalOpen}
        onClose={() => setAddReceiptModalOpen(false)}
        onSuccess={() => {
          setAddReceiptModalOpen(false);
          receiptsManagementRef.current?.refresh();
          fetchReceiptCount();
        }}
      />
      
      <TimeEntryExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        entries={timeEntries || []}
        filters={filters}
      />
    </MobilePageWrapper>
  );
};

export default TimeEntriesPage;
