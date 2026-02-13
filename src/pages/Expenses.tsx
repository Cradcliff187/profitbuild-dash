import React, { useState, useEffect, useRef } from "react";
import { Plus, Upload, BarChart3, List, Clock, FileDown, Receipt, DollarSign, RefreshCw, History, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabSelector } from "@/components/ui/mobile-tab-selector";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseFormSheet } from "@/components/ExpenseFormSheet";
import { ExpensesList, ExpensesListRef } from "@/components/ExpensesList";
import { ExpenseImportModal } from "@/components/ExpenseImportModal";
import { ExpenseExportModal } from "@/components/ExpenseExportModal";
import { TimesheetGridView } from "@/components/TimesheetGridView";
import { RevenueFormSheet } from "@/components/RevenueFormSheet";
import { RevenuesList } from "@/components/RevenuesList";
import { QuickBooksSyncModal } from "@/components/QuickBooksSyncModal";
import { QuickBooksSyncHistory } from "@/components/QuickBooksSyncHistory";
import { ImportHistory } from "@/components/ImportHistory";
import { BulkExpenseAllocationSheet } from "@/components/BulkExpenseAllocationSheet";
import { Expense, ExpenseCategory } from "@/types/expense";
import { ProjectRevenue } from "@/types/revenue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ColumnSelector } from "@/components/ui/column-selector";
import { MobileResponsiveHeader } from "@/components/ui/mobile-responsive-header";
import { parseDateOnly } from "@/utils/dateUtils";
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';

type ViewMode = "overview" | "list" | "invoices" | "import-history";

// Helper to filter out all split parent expenses (defensive)
const filterDisplayableExpenses = (expenses: Expense[]): Expense[] => {
  return expenses.filter((expense) => {
    // Hide split parent containers regardless of project assignment
    const isSplitParent = expense.is_split === true;
    return !isSplitParent;
  });
};

const Expenses = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<ProjectRevenue[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [selectedRevenue, setSelectedRevenue] = useState<ProjectRevenue | undefined>();
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [revenueFormOpen, setRevenueFormOpen] = useState(false);
  const tabOptions = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    { value: "list", label: "All Expenses", icon: List },
    { value: "invoices", label: "Invoices", icon: DollarSign },
    { value: "import-history", label: "Import History", icon: History },
  ];
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQuickBooksSync, setShowQuickBooksSync] = useState(false);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [showBulkAllocate, setShowBulkAllocate] = useState(false);
  const expensesListRef = useRef<ExpensesListRef>(null);
  const { isEnabled: isQuickBooksSyncEnabled, config: qbSyncConfig } = useQuickBooksSync();

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('expenses-visible-columns');
    const defaultColumns = [
      'checkbox', 'date', 'project', 'payee', 'description', 
      'category', 'amount', 'status_assigned', 'status_allocated', 'receipt', 'actions'
    ];
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to include any new columns (like 'receipt')
        const merged = [...new Set([...defaultColumns, ...parsed])];
        return merged;
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return defaultColumns;
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('expenses-column-order');
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Add any new columns not in saved order
        const allColumns = [
          'checkbox', 'date', 'project', 'payee', 'description', 
          'category', 'transaction_type', 'amount', 'invoice_number', 
          'status_assigned', 'status_allocated', 'approval_status', 'receipt', 'actions'
        ];
        const newColumns = allColumns.filter(key => !savedOrder.includes(key));
        return [...savedOrder, ...newColumns];
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return [
      'checkbox', 'date', 'project', 'payee', 'description', 
      'category', 'transaction_type', 'amount', 'invoice_number', 
      'status_assigned', 'status_allocated', 'approval_status', 'receipt', 'actions'
    ];
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('expenses-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('expenses-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Column definitions for ColumnSelector
  const expenseColumnDefinitions = [
    { key: 'checkbox', label: 'Select', required: true },
    { key: 'date', label: 'Date', required: false },
    { key: 'project', label: 'Project', required: false },
    { key: 'payee', label: 'Payee', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'transaction_type', label: 'Type', required: false },
    { key: 'amount', label: 'Amount', required: false },
    { key: 'invoice_number', label: 'Invoice #', required: false },
    { key: 'status_assigned', label: 'Assigned', required: false },
    { key: 'status_allocated', label: 'Allocated', required: false },
    { key: 'approval_status', label: 'Approval', required: false },
    { key: 'receipt', label: 'Receipt', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  // Column visibility state for revenues with localStorage persistence
  const [revenueVisibleColumns, setRevenueVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('revenues-visible-columns');
    const defaultColumns = [
      'checkbox', 'date', 'invoice_number', 'project', 'client', 'description', 'amount', 'account', 'quickbooks_id', 'actions'
    ];
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Remove 'split' if it exists (no longer a column)
        const cleaned = parsed.filter((key: string) => key !== 'split');
        // Ensure checkbox is always included
        if (!cleaned.includes('checkbox')) {
          cleaned.unshift('checkbox');
        }
        // Merge with defaults to include any new columns
        const merged = [...new Set([...defaultColumns, ...cleaned])];
        return merged;
      } catch {
        // Invalid JSON, use defaults
      }
    }
    // Default visible columns
    return defaultColumns;
  });

  // Column order state for revenues with localStorage persistence
  const [revenueColumnOrder, setRevenueColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('revenues-column-order');
    const allColumns = [
      'checkbox', 'date', 'invoice_number', 'project', 'client', 'description', 'amount', 'account', 'quickbooks_id', 'actions'
    ];
    
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Remove 'split' if it exists (no longer a column)
        const cleaned = savedOrder.filter((key: string) => key !== 'split');
        // Add any new columns not in saved order
        const newColumns = allColumns.filter(key => !cleaned.includes(key));
        
        // Insert new columns in their default positions
        const merged = [...cleaned];
        newColumns.forEach(newKey => {
          const defaultIndex = allColumns.indexOf(newKey);
          if (defaultIndex > 0) {
            merged.splice(defaultIndex, 0, newKey);
          }
        });
        
        // Ensure checkbox is always first
        if (merged.includes('checkbox')) {
          return ['checkbox', ...merged.filter(key => key !== 'checkbox')];
        }
        return merged;
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return allColumns;
  });

  // Wrapper for setRevenueVisibleColumns to ensure checkbox is always included
  const handleRevenueVisibleColumnsChange = (columns: string[]) => {
    // Ensure checkbox is always included (it's required)
    const columnsWithCheckbox = columns.includes('checkbox') 
      ? columns 
      : ['checkbox', ...columns];
    setRevenueVisibleColumns(columnsWithCheckbox);
  };

  // Save revenue columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem('revenues-visible-columns', JSON.stringify(revenueVisibleColumns));
  }, [revenueVisibleColumns]);

  useEffect(() => {
    localStorage.setItem('revenues-column-order', JSON.stringify(revenueColumnOrder));
  }, [revenueColumnOrder]);

  // Column definitions for revenue ColumnSelector
  const revenueColumnDefinitions = [
    { key: 'checkbox', label: 'Select', required: true },
    { key: 'date', label: 'Date', required: false },
    { key: 'invoice_number', label: 'Invoice #', required: false },
    { key: 'project', label: 'Project', required: false },
    { key: 'client', label: 'Client', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'amount', label: 'Amount', required: false },
    { key: 'account', label: 'Account', required: false },
    { key: 'quickbooks_id', label: 'QB ID', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  // Load expenses and revenues from Supabase
  useEffect(() => {
    fetchData();
    fetchRevenues();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResult, estimatesResult] = await Promise.all([
        supabase.from("expenses").select(`
            *,
            payees!expenses_payee_id_fkey (
              payee_name,
              payee_type,
              full_name
            ),
            projects(project_name, project_number, category)
          `),
        supabase.from("estimates").select(`
            *,
            projects(project_name, client_name),
            estimate_line_items(
              id,
              category,
              cost_per_unit,
              total_cost,
              quantity,
              description
            )
          `),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (estimatesResult.error) throw estimatesResult.error;

      const transformedExpenses: Expense[] = (expensesResult.data || []).map((expense) => ({
        ...expense,
        category: expense.category as ExpenseCategory,
        expense_date: parseDateOnly(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        payee_name: expense.payees?.payee_name,
        payee_type: expense.payees?.payee_type,
        payee_full_name: expense.payees?.full_name,
        project_name: expense.projects?.project_name,
        project_number: expense.projects?.project_number,
        project_category: expense.projects?.category,
      }));

      // Filter out split parent containers before setting state
      const displayableExpenses = filterDisplayableExpenses(transformedExpenses);

      setExpenses(displayableExpenses);
      setEstimates(estimatesResult.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = (expense: Expense) => {
    // Refresh the expenses list
    fetchData();
    setSelectedExpense(undefined);
  };

  const handleImportSuccess = () => {
    fetchData();
    setViewMode("list");
  };

  const handleTimesheetSuccess = () => {
    fetchData();
    setViewMode("list");
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseFormOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleCreateNew = () => {
    setSelectedExpense(undefined);
    setExpenseFormOpen(true);
  };

  const fetchRevenues = async () => {
    try {
      // Query revenues without joins (no FK relationship exists)
      const { data: revenuesData, error: revenuesError } = await supabase
        .from("project_revenues")
        .select(`
          id,
          invoice_date,
          invoice_number,
          amount,
          description,
          account_name,
          account_full_name,
          quickbooks_transaction_id,
          project_id,
          client_id,
          is_split
        `)
        .order('invoice_date', { ascending: false });

      if (revenuesError) throw revenuesError;

      // Get unique project IDs and client IDs
      const projectIds = [...new Set((revenuesData || []).map(r => r.project_id).filter(Boolean))];
      const clientIds = [...new Set((revenuesData || []).map(r => r.client_id).filter(Boolean))];

      // Fetch projects separately
      const projectsMap = new Map();
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, project_number, project_name, client_name, customer_po_number")
          .in('id', projectIds);

        if (projectsError) throw projectsError;
        
        (projectsData || []).forEach(p => {
          projectsMap.set(p.id, p);
        });
      }

      // Fetch clients separately
      const clientsMap = new Map();
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, client_name")
          .in('id', clientIds);

        if (!clientsError && clientsData) {
          clientsData.forEach(c => {
            clientsMap.set(c.id, c.client_name);
          });
        }
      }

      // Transform and merge data
      const transformedRevenues: ProjectRevenue[] = (revenuesData || []).map((revenue: any) => {
        const project = projectsMap.get(revenue.project_id);
        
        return {
          ...revenue,
          invoice_date: parseDateOnly(revenue.invoice_date),
          created_at: new Date(revenue.created_at),
          updated_at: new Date(revenue.updated_at),
          project_number: project?.project_number || 'Unassigned',
          project_name: project?.project_name || 'Unassigned',
          client_name: clientsMap.get(revenue.client_id) || project?.client_name || null,
          customer_po_number: project?.customer_po_number || null,
        } as ProjectRevenue;
      });

      setRevenues(transformedRevenues);
    } catch (error: any) {
      console.error("Error loading revenues:", error);
      toast.error("Failed to load invoices: " + (error.message || "Unknown error"));
    }
  };

  const handleSaveRevenue = (revenue: ProjectRevenue) => {
    // Refresh the revenues list
    fetchRevenues();
    setSelectedRevenue(undefined);
  };

  const handleEditRevenue = (revenue: ProjectRevenue) => {
    setSelectedRevenue(revenue);
    setRevenueFormOpen(true);
  };

  const handleDeleteRevenue = (id: string) => {
    setRevenues(revenues.filter((r) => r.id !== id));
    fetchRevenues();
  };

  const handleCreateNewRevenue = () => {
    setSelectedRevenue(undefined);
    setRevenueFormOpen(true);
  };

  const handleTabChange = (value: string) => {
    if (value === "overview" || value === "list" || value === "invoices" || value === "import-history") {
      setViewMode(value as ViewMode);
    }
  };

  if (loading) {
    return <BrandedLoader message="Loading expenses..." />;
  }

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchRevenues()]);
  };

  return (
    <MobilePageWrapper onRefresh={handleRefresh} enablePullToRefresh>
      <PageHeader
        icon={Receipt}
        title="Expenses & Invoices"
        description="Track expenses, invoices, and financial transactions"
        actions={
          <>
            <div className="hidden sm:flex items-center gap-2">
              {isQuickBooksSyncEnabled && (
                <>
                  <Button variant="outline" onClick={() => setShowQuickBooksSync(true)} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync from QB
                  </Button>
                  <Button variant="outline" onClick={() => setShowSyncHistory(true)} size="sm">
                    <History className="h-4 w-4 mr-2" />
                    Sync History
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowImportModal(true)} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={() => setShowExportModal(true)} size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setShowTimesheetModal(true)} size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Timesheet
              </Button>
              {viewMode === "list" && (
                <Button variant="outline" onClick={() => setShowBulkAllocate(true)} size="sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Bulk Allocate
                </Button>
              )}
            </div>
            {!isMobile && (
              <Button 
                onClick={viewMode === "invoices" ? handleCreateNewRevenue : handleCreateNew} 
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {viewMode === "invoices" ? "Add Invoice" : "Add Expense"}
              </Button>
            )}
          </>
        }
      />

      <Tabs value={viewMode} onValueChange={handleTabChange}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto sm:order-1">
              <div className="sm:hidden">
                <MobileTabSelector
                  value={viewMode}
                  onValueChange={handleTabChange}
                  options={tabOptions}
                />
              </div>

              <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/50 p-1 sm:flex">
                {tabOptions.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {(viewMode === "list" || viewMode === "invoices") && !isMobile && (
              <div className="flex justify-end sm:order-2">
                <ColumnSelector
                  columns={viewMode === "invoices" ? revenueColumnDefinitions : expenseColumnDefinitions}
                  visibleColumns={viewMode === "invoices" ? revenueVisibleColumns : visibleColumns}
                  onVisibleColumnsChange={viewMode === "invoices" ? handleRevenueVisibleColumnsChange : setVisibleColumns}
                  columnOrder={viewMode === "invoices" ? revenueColumnOrder : columnOrder}
                  onColumnOrderChange={viewMode === "invoices" ? setRevenueColumnOrder : setColumnOrder}
                />
              </div>
            )}
          </div>

          <TabsContent value="overview">
            <ExpenseDashboard expenses={expenses} estimates={estimates} />
          </TabsContent>

          <TabsContent value="list">
            <ExpensesList
              ref={expensesListRef}
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onRefresh={fetchData}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <RevenuesList
              revenues={revenues}
              onEdit={handleEditRevenue}
              onDelete={handleDeleteRevenue}
              onRefresh={fetchRevenues}
              visibleColumns={revenueVisibleColumns}
              onVisibleColumnsChange={setRevenueVisibleColumns}
              columnOrder={revenueColumnOrder}
              onColumnOrderChange={setRevenueColumnOrder}
            />
          </TabsContent>

          <TabsContent value="import-history">
            <ImportHistory />
          </TabsContent>
        </Tabs>

      <ExpenseFormSheet
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
      />

      <ExpenseImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        estimates={estimates}
      />

      <TimesheetGridView
        open={showTimesheetModal}
        onClose={() => setShowTimesheetModal(false)}
        onSuccess={handleTimesheetSuccess}
      />

      <ExpenseExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        expenses={expenses}
      />

      <RevenueFormSheet
        open={revenueFormOpen}
        onOpenChange={setRevenueFormOpen}
        revenue={selectedRevenue}
        onSave={handleSaveRevenue}
      />

      <QuickBooksSyncModal
        open={showQuickBooksSync}
        onClose={() => setShowQuickBooksSync(false)}
        onSuccess={handleImportSuccess}
        defaultDaysBack={qbSyncConfig?.default_days_back}
      />

      <QuickBooksSyncHistory
        open={showSyncHistory}
        onClose={() => setShowSyncHistory(false)}
      />

      <BulkExpenseAllocationSheet
        open={showBulkAllocate}
        onOpenChange={setShowBulkAllocate}
        onSuccess={fetchData}
      />

      {/* Mobile FAB */}
      {isMobile && viewMode !== "overview" && (
        <Button
          variant="default"
          onClick={viewMode === "invoices" ? handleCreateNewRevenue : handleCreateNew}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </MobilePageWrapper>
  );
};

export default Expenses;
