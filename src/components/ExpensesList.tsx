import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { isOverheadProject, ProjectCategory, isOperationalProject, isSystemProjectByCategory } from "@/types/project";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  FileDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Target,
  FolderOpen,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Receipt,
  Link2,
  Unlink,
  Eye,
  Paperclip,
} from "lucide-react";
import { ExpenseBulkActions } from "./ExpenseBulkActions";
import { ReassignExpenseProjectDialog } from "./ReassignExpenseProjectDialog";
import { ExpenseSplitDialog } from "./ExpenseSplitDialog";
import { ExpenseAllocationSheet } from "./ExpenseAllocationSheet";
import { ReceiptLinkModal } from "./expenses/ReceiptLinkModal";
import { ReceiptPreviewModal } from "./ReceiptPreviewModal";
import { unlinkReceiptFromExpense, fetchLinkedReceipt } from "@/utils/receiptLinking";
import { CollapsibleFilterSection } from "./ui/collapsible-filter-section";
import { usePagination } from '@/hooks/usePagination';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Expense,
  ExpenseCategory,
  TransactionType,
  ExpenseSplit,
  EXPENSE_CATEGORY_DISPLAY,
  TRANSACTION_TYPE_DISPLAY,
} from "@/types/expense";
import { PayeeType } from "@/types/payee";
import { getExpenseSplits, calculateProjectExpenses } from "@/utils/expenseSplits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const EXPENSE_COLUMNS: ColumnDefinition[] = [
  { key: 'checkbox', label: 'Select', required: true, width: 'w-10', defaultVisible: true },
  { key: 'date', label: 'Date', required: false, width: 'w-24', sortable: true, defaultVisible: true },
  { key: 'project', label: 'Project', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'payee', label: 'Payee', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'description', label: 'Description', required: false, sortable: true, defaultVisible: true },
  { key: 'category', label: 'Category', required: false, width: 'w-32', sortable: true, defaultVisible: true },
  { key: 'transaction_type', label: 'Type', required: false, width: 'w-24', sortable: true, defaultVisible: false },
  { key: 'amount', label: 'Amount', required: false, width: 'w-24', align: 'right', sortable: true, defaultVisible: true },
  { key: 'invoice_number', label: 'Invoice #', required: false, width: 'w-28', sortable: true, defaultVisible: false },
  { key: 'status_assigned', label: 'Assigned', required: false, width: 'w-20', align: 'center', sortable: true, defaultVisible: true },
  { key: 'status_allocated', label: 'Allocated', required: false, width: 'w-20', align: 'center', sortable: true, defaultVisible: true },
  { key: 'approval_status', label: 'Approval', required: false, width: 'w-24', align: 'center', sortable: true, defaultVisible: false },
  { key: 'receipt', label: 'Receipt', required: false, width: 'w-20', align: 'center', sortable: false, defaultVisible: true },
  { key: 'actions', label: 'Actions', required: true, width: 'w-16', align: 'center', defaultVisible: true },
];

interface ExpensesListProps {
  expenses: Expense[];
  projectId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  enablePagination?: boolean;
  pageSize?: number;
  visibleColumns?: string[];
  onVisibleColumnsChange?: (columns: string[]) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

export interface ExpensesListRef {
  exportToCsv: () => void;
}

export const ExpensesList = React.forwardRef<ExpensesListRef, ExpensesListProps>(
  ({ expenses, projectId, onEdit, onDelete, onRefresh, enablePagination = true, pageSize: initialPageSize = 25, visibleColumns: externalVisibleColumns, onVisibleColumnsChange, columnOrder: externalColumnOrder, onColumnOrderChange }, ref) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterTransactionTypes, setFilterTransactionTypes] = useState<string[]>([]);
    const [filterProjects, setFilterProjects] = useState<string[]>([]);
    const [filterMatchStatuses, setFilterMatchStatuses] = useState<string[]>([]);
    const [filterApprovalStatuses, setFilterApprovalStatuses] = useState<string[]>([]);
    const [filterSplitStatuses, setFilterSplitStatuses] = useState<string[]>([]);
    const [filterPayees, setFilterPayees] = useState<string[]>([]);
    const [filterPayeeTypes, setFilterPayeeTypes] = useState<string[]>([]);
    const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [payees, setPayees] = useState<any[]>([]);
    const [expenseMatches, setExpenseMatches] = useState<
      Record<string, { matched: boolean; type?: "estimate" | "quote" | "change_order" }>
    >({});
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [expenseToReassign, setExpenseToReassign] = useState<Expense | null>(null);
    const [splitDialogOpen, setSplitDialogOpen] = useState(false);
    const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);
    const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
    const [expandedMobileCards, setExpandedMobileCards] = useState<Set<string>>(new Set());
    const [expenseSplits, setExpenseSplits] = useState<Record<string, ExpenseSplit[]>>({});
    const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
    const [allocationSheetOpen, setAllocationSheetOpen] = useState(false);
    const [expenseToAllocate, setExpenseToAllocate] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const { toast } = useToast();
    
    // Receipt linking state
    const [receiptLinkModalOpen, setReceiptLinkModalOpen] = useState(false);
    const [expenseToLink, setExpenseToLink] = useState<Expense | null>(null);
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
    const [previewReceiptDetails, setPreviewReceiptDetails] = useState<any>(null);

    // Column visibility state - use external if provided, otherwise internal with localStorage
    const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(() => {
      const saved = localStorage.getItem('expenses-visible-columns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Invalid JSON, use defaults
        }
      }
      // Default visible columns
      return EXPENSE_COLUMNS
        .filter(col => col.defaultVisible)
        .map(col => col.key);
    });

    // Column order state - use external if provided, otherwise internal with localStorage
    const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>(() => {
      const saved = localStorage.getItem('expenses-column-order');
      if (saved) {
        try {
          const savedOrder = JSON.parse(saved);
          // Add any new columns not in saved order
          const newColumns = EXPENSE_COLUMNS
            .map(col => col.key)
            .filter(key => !savedOrder.includes(key));
          return [...savedOrder, ...newColumns];
        } catch {
          // Invalid JSON, use defaults
        }
      }
      return EXPENSE_COLUMNS.map(col => col.key);
    });

    // Use external state if provided, otherwise use internal
    const visibleColumns = externalVisibleColumns ?? internalVisibleColumns;
    const columnOrder = externalColumnOrder ?? internalColumnOrder;

    const setVisibleColumns = (columns: string[]) => {
      if (onVisibleColumnsChange) {
        onVisibleColumnsChange(columns);
      } else {
        setInternalVisibleColumns(columns);
        localStorage.setItem('expenses-visible-columns', JSON.stringify(columns));
      }
    };

    const setColumnOrder = (order: string[]) => {
      if (onColumnOrderChange) {
        onColumnOrderChange(order);
      } else {
        setInternalColumnOrder(order);
        localStorage.setItem('expenses-column-order', JSON.stringify(order));
      }
    };

    // Helper to check if column is visible
    const isColumnVisible = (key: string) => {
      return visibleColumns.includes(key);
    };

    // Get ordered columns
    const orderedColumns = columnOrder
      .map(key => EXPENSE_COLUMNS.find(col => col.key === key))
      .filter((col): col is ColumnDefinition => col !== undefined);

    const getActiveFilterCount = (): number => {
      let count = 0;
      if (searchTerm) count++;
      if (filterCategories.length > 0) count++;
      if (filterTransactionTypes.length > 0) count++;
      if (filterProjects.length > 0) count++;
      if (filterMatchStatuses.length > 0) count++;
      if (filterApprovalStatuses.length > 0) count++;
      if (filterSplitStatuses.length > 0) count++;
      if (filterPayees.length > 0) count++;
      if (filterPayeeTypes.length > 0) count++;
      return count;
    };

    const hasActiveFilters = (): boolean => {
      return getActiveFilterCount() > 0;
    };

    const handleClearFilters = () => {
      setSearchTerm("");
      setFilterCategories([]);
      setFilterTransactionTypes([]);
      setFilterProjects([]);
      setFilterMatchStatuses([]);
      setFilterApprovalStatuses([]);
      setFilterSplitStatuses([]);
      setFilterPayees([]);
      setFilterPayeeTypes([]);
    };

    // Toggle helper functions for multi-select
    const toggleProject = (projectId: string) => {
      setFilterProjects(prev => 
        prev.includes(projectId)
          ? prev.filter(id => id !== projectId)
          : [...prev, projectId]
      );
    };

    const toggleCategory = (category: string) => {
      setFilterCategories(prev =>
        prev.includes(category)
          ? prev.filter(c => c !== category)
          : [...prev, category]
      );
    };

    const toggleTransactionType = (type: string) => {
      setFilterTransactionTypes(prev =>
        prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type]
      );
    };

    const toggleMatchStatus = (status: string) => {
      setFilterMatchStatuses(prev =>
        prev.includes(status)
          ? prev.filter(s => s !== status)
          : [...prev, status]
      );
    };

    const toggleApprovalStatus = (status: string) => {
      setFilterApprovalStatuses(prev =>
        prev.includes(status)
          ? prev.filter(s => s !== status)
          : [...prev, status]
      );
    };

    const toggleSplitStatus = (status: string) => {
      setFilterSplitStatuses(prev =>
        prev.includes(status)
          ? prev.filter(s => s !== status)
          : [...prev, status]
      );
    };

    const togglePayee = (payeeId: string) => {
      setFilterPayees(prev => 
        prev.includes(payeeId)
          ? prev.filter(id => id !== payeeId)
          : [...prev, payeeId]
      );
    };

    const togglePayeeType = (type: string) => {
      setFilterPayeeTypes(prev =>
        prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type]
      );
    };

    React.useImperativeHandle(ref, () => ({
      exportToCsv,
    }));

    // Load projects for filter dropdown
    useEffect(() => {
      const fetchProjects = async () => {
        try {
          const { data, error } = await supabase
            .from("projects")
            .select("id, project_name, project_number, category")
            .order("project_name");

          if (error) throw error;
          
          // Sort projects: unassigned and overhead at top, then construction projects
          const sortedProjects = (data || []).sort((a, b) => {
            // Check if project is system or overhead
            const aIsSpecial = a.project_number === "000-UNASSIGNED" || 
                              a.project_number === "SYS-000" ||
                              (a.category === 'overhead' || isOverheadProject(a.category as ProjectCategory)) ||
                              (!a.category && isOperationalProject(a.project_number || ''));
            const bIsSpecial = b.project_number === "000-UNASSIGNED" || 
                              b.project_number === "SYS-000" ||
                              (b.category === 'overhead' || isOverheadProject(b.category as ProjectCategory)) ||
                              (!b.category && isOperationalProject(b.project_number || ''));
            
            // Special projects (unassigned, system, overhead) come first
            if (aIsSpecial && !bIsSpecial) return -1;
            if (!aIsSpecial && bIsSpecial) return 1;
            
            // Within special projects, sort by project_number
            if (aIsSpecial && bIsSpecial) {
              return (a.project_number || '').localeCompare(b.project_number || '');
            }
            
            // Regular construction projects sorted by project_name
            return (a.project_name || '').localeCompare(b.project_name || '');
          });
          
          setProjects(sortedProjects);
        } catch (error) {
          console.error("Error fetching projects:", error);
        }
      };

      fetchProjects();
    }, []);

    // Load payees for filter dropdown
    useEffect(() => {
      const fetchPayees = async () => {
        try {
          const { data, error } = await supabase
            .from("payees")
            .select("id, payee_name, payee_type")
            .eq("is_active", true)
            .order("payee_name");

          if (error) throw error;
          setPayees(data || []);
        } catch (error) {
          console.error("Error fetching payees:", error);
        }
      };

      fetchPayees();
    }, []);

    // Load expense line item matches and splits
    useEffect(() => {
      const fetchExpenseMatches = async () => {
        if (expenses.length === 0) return;

        try {
          const { data, error } = await supabase
            .from("expense_line_item_correlations")
            .select("expense_id, correlation_type, estimate_line_item_id, quote_id, change_order_line_item_id")
            .in(
              "expense_id",
              expenses.map((e) => e.id),
            );

          if (error) throw error;

          const matches: Record<string, { matched: boolean; type?: "estimate" | "quote" | "change_order" }> = {};
          expenses.forEach((expense) => {
            const correlation = data?.find((c) => c.expense_id === expense.id);
            if (correlation) {
              // Determine type based on which ID field is populated
              let type: "estimate" | "quote" | "change_order" = "estimate";
              if (correlation.quote_id) {
                type = "quote";
              } else if (correlation.change_order_line_item_id) {
                type = "change_order";
              } else if (correlation.estimate_line_item_id) {
                type = "estimate";
              }
              matches[expense.id] = { matched: true, type };
            } else {
              matches[expense.id] = { matched: false };
            }
          });

          setExpenseMatches(matches);
        } catch (error) {
          console.error("Error fetching expense matches:", error);
        }
      };

      const fetchExpenseSplits = async () => {
        if (expenses.length === 0) return;

        const splitExpenses = expenses.filter((e) => e.is_split);
        if (splitExpenses.length === 0) return;

        try {
          const splitsData: Record<string, ExpenseSplit[]> = {};

          await Promise.all(
            splitExpenses.map(async (expense) => {
              const splits = await getExpenseSplits(expense.id);
              splitsData[expense.id] = splits;
            }),
          );

          setExpenseSplits(splitsData);
        } catch (error) {
          console.error("Error fetching expense splits:", error);
        }
      };

      fetchExpenseMatches();
      fetchExpenseSplits();
    }, [expenses]);

    // Defensive filter: Remove all split parent expenses regardless of project
    const displayableExpenses = useMemo(() => {
      return expenses.filter((expense) => {
        const isSplitParent = expense.is_split === true;
        return !isSplitParent;
      });
    }, [expenses]);

    // Filter expenses based on search term and filters
    const filteredExpenses = useMemo(() => {
      return displayableExpenses.filter((expense) => {
        // Search logic - includes amount
        let matchesSearch = true;
        if (searchTerm && searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase().trim();
          const amountStr = formatCurrency(expense.amount).toLowerCase();
          const amountNum = expense.amount.toString();
          
          // Extract payee name from description as fallback
          let extractedPayeeName = '';
          if (expense.description) {
            // Match pattern: "transaction_type - PayeeName (Unassigned)" or "transaction_type - PayeeName"
            const descMatch = expense.description.match(/^(?:bill|check|expense|credit_card|cash)\s*-\s*(.+?)(?:\s*\(|$)/i);
            extractedPayeeName = descMatch ? descMatch[1].trim() : '';
          }
          
          // Check all possible fields for search match - be explicit about each check
          const descriptionMatch = expense.description ? expense.description.toLowerCase().includes(searchLower) : false;
          const payeeNameMatch = expense.payee_name ? expense.payee_name.toLowerCase().includes(searchLower) : false;
          const payeeFullNameMatch = expense.payee_full_name ? expense.payee_full_name.toLowerCase().includes(searchLower) : false;
          const extractedPayeeMatch = extractedPayeeName ? extractedPayeeName.toLowerCase().includes(searchLower) : false;
          const projectNameMatch = expense.project_name ? expense.project_name.toLowerCase().includes(searchLower) : false;
          const projectNumberMatch = expense.project_number ? expense.project_number.toLowerCase().includes(searchLower) : false;
          const invoiceNumberMatch = expense.invoice_number ? expense.invoice_number.toLowerCase().includes(searchLower) : false;
          const amountStrMatch = amountStr.includes(searchLower);
          
          // Only check amount number match if search term contains numbers
          const cleanedNumberSearch = searchTerm.replace(/[^0-9.]/g, '');
          const amountNumMatch = cleanedNumberSearch ? amountNum.includes(cleanedNumberSearch) : false;
          
          matchesSearch =
            descriptionMatch ||
            payeeNameMatch ||
            payeeFullNameMatch ||
            extractedPayeeMatch ||
            projectNameMatch ||
            projectNumberMatch ||
            invoiceNumberMatch ||
            amountStrMatch ||
            amountNumMatch;
        }

        const matchesCategory = filterCategories.length === 0 || filterCategories.includes(expense.category);
        const matchesType = filterTransactionTypes.length === 0 || filterTransactionTypes.includes(expense.transaction_type);
        const matchesProject = filterProjects.length === 0 || filterProjects.includes(expense.project_id);
        const matchesPayee = filterPayees.length === 0 || (expense.payee_id && filterPayees.includes(expense.payee_id));
        const matchesPayeeType = filterPayeeTypes.length === 0 || 
          (expense.payee_type && filterPayeeTypes.includes(expense.payee_type));
        const matchesApprovalStatus = filterApprovalStatuses.length === 0 || 
          filterApprovalStatuses.includes(expense.approval_status || "pending");

        let matchesMatchStatus = true;
        if (filterMatchStatuses.length > 0) {
          matchesMatchStatus = filterMatchStatuses.some(status => {
            if (status === "unassigned") {
              return expense.project_number === "000-UNASSIGNED";
            } else if (status === "unmatched") {
              // Only show as unallocated if it's a real construction project
              // Exclude: 000-UNASSIGNED, SYS-000, and overhead projects (001-GAS, 002-GA, etc.)
              const isNonAllocatableProject = 
                expense.project_number === "000-UNASSIGNED" ||
                expense.project_number === "SYS-000" ||
                isOverheadProject(expense.project_category as ProjectCategory);
              
              return !isNonAllocatableProject && expenseMatches[expense.id]?.matched === false;
            } else if (status === "matched") {
              return expenseMatches[expense.id]?.matched === true;
            }
            return false;
          });
        }

        let matchesSplitStatus = true;
        if (filterSplitStatuses.length > 0) {
          matchesSplitStatus = filterSplitStatuses.some(status => {
            if (status === "split") {
              return expense.is_split === true;
            } else if (status === "unsplit") {
              return !expense.is_split;
            }
            return false;
          });
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesProject &&
          matchesPayee &&
          matchesPayeeType &&
          matchesMatchStatus &&
          matchesApprovalStatus &&
          matchesSplitStatus
        );
      });
    }, [
      displayableExpenses,
      searchTerm,
      filterCategories,
      filterTransactionTypes,
      filterProjects,
      filterPayees,
      filterPayeeTypes,
      filterMatchStatuses,
      filterApprovalStatuses,
      filterSplitStatuses,
      expenseMatches,
    ]);

    // Calculate split-aware total for project context
    useEffect(() => {
      const calculateTotal = async () => {
        if (!projectId) {
          // If no project context, use simple sum
          setCalculatedTotal(filteredExpenses.reduce((sum, e) => sum + e.amount, 0));
          return;
        }

        // Use split-aware calculation for project context
        const total = await calculateProjectExpenses(projectId, filteredExpenses);
        setCalculatedTotal(total);
      };

      calculateTotal();
    }, [filteredExpenses, projectId]);

    const handleDelete = async (expenseId: string) => {
      try {
        const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense deleted successfully.",
        });

        onDelete(expenseId);
        onRefresh();
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast({
          title: "Error",
          description: "Failed to delete expense.",
          variant: "destructive",
        });
      }
    };

    const handleApprovalAction = async (
      expenseId: string,
      action: "submit" | "approve" | "reject",
      rejectionReason?: string,
    ) => {
      try {
        let updateData: any = {};

        if (action === "submit") {
          updateData = { approval_status: "pending" };
        } else if (action === "approve") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          updateData = {
            approval_status: "approved",
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          };
        } else if (action === "reject") {
          updateData = {
            approval_status: "rejected",
            rejection_reason: rejectionReason,
          };
        }

        const { error } = await supabase.from("expenses").update(updateData).eq("id", expenseId);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Expense ${action === "submit" ? "submitted for approval" : action === "approve" ? "approved" : "rejected"}.`,
        });

        onRefresh();
      } catch (error) {
        console.error("Error updating approval status:", error);
        toast({
          title: "Error",
          description: "Failed to update approval status.",
          variant: "destructive",
        });
      }
    };

    // Handle opening receipt link modal
    const handleLinkReceipt = (expense: Expense) => {
      setExpenseToLink(expense);
      setReceiptLinkModalOpen(true);
    };

    // Handle viewing linked receipt
    const handleViewReceipt = async (expense: Expense) => {
      if (!expense.receipt_id) return;
      
      try {
        const receipt = await fetchLinkedReceipt(expense.receipt_id);
        if (receipt) {
          setPreviewReceiptUrl(receipt.image_url);
          setPreviewReceiptDetails({
            project: expense.project_number || 'Unassigned',
            date: format(parseDateOnly(expense.expense_date), 'MMM d, yyyy'),
            payee: expense.payee_name,
            amount: formatCurrency(expense.amount),
          });
          setReceiptPreviewOpen(true);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load receipt',
          variant: 'destructive',
        });
      }
    };

    // Handle unlinking receipt
    const handleUnlinkReceipt = async (expense: Expense) => {
      if (!expense.receipt_id) return;
      
      try {
        await unlinkReceiptFromExpense({ expenseId: expense.id });
        toast({
          title: 'Receipt Unlinked',
          description: 'The receipt has been unlinked from this expense.',
        });
        onRefresh?.();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to unlink receipt',
          variant: 'destructive',
        });
      }
    };

    // Handle successful receipt link
    const handleReceiptLinkSuccess = () => {
      setReceiptLinkModalOpen(false);
      setExpenseToLink(null);
      onRefresh?.();
    };

    const exportToCsv = async () => {
      const headers = [
        "Date",
        "Project",
        "Project Assignment",
        "Payee",
        "Expense Category",
        "Payee Type",
        "Transaction Type",
        "Amount",
        "Approval Status",
        "Line Item Allocation",
        "Is Split",
        "Split Type",
        "Split Notes",
      ];

      const csvRows: string[] = [];
      let totalRows = 0;

    for (const expense of filteredExpenses) {
      const splits = expenseSplits[expense.id] || [];
      const isSplitParent = expense.is_split === true;
      const isUnassigned = expense.project_number === "000-UNASSIGNED";
      const isPlaceholder = isUnassigned || (expense.project_number && isOperationalProject(expense.project_number));

      // Skip split parent containers entirely in export
      if (isSplitParent) continue;

        // Add parent expense row
        csvRows.push(
          [
            expense.expense_date.toLocaleDateString(),
            `"${expense.project_name || ""}"`,
            isPlaceholder ? "Needs Assignment" : "Assigned",
            `"${expense.payee_name || ""}"`,
            `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
            `"${expense.payee_type || ""}"`,
            `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
            expense.amount,
            (expense.approval_status || "pending").charAt(0).toUpperCase() +
              (expense.approval_status || "pending").slice(1),
            isPlaceholder
              ? "—"
              : expenseMatches[expense.id]?.matched
                ? `Allocated (${expenseMatches[expense.id].type})`
                : "Unallocated",
            expense.is_split ? "Yes" : "No",
            expense.is_split ? "Parent" : "Single",
            "",
          ].join(","),
        );
        totalRows++;

        // If expense is split, add child split rows
        if (expense.is_split && expense.id) {
          const splits = expenseSplits[expense.id] || [];
          for (const split of splits) {
            csvRows.push(
              [
                expense.expense_date.toLocaleDateString(),
                `"${split.project_name || ""}"`,
                "Split Allocation",
                `"${expense.payee_name || ""}"`,
                `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
                `"${expense.payee_type || ""}"`,
                `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
                split.split_amount.toFixed(2),
                (expense.approval_status || "pending").charAt(0).toUpperCase() +
                  (expense.approval_status || "pending").slice(1),
                "—",
                "Yes",
                `Split (${split.split_percentage?.toFixed(1)}%)`,
                `"${split.notes || ""}"`,
              ].join(","),
            );
            totalRows++;
          }
        }
      }

      const csvContent = [headers.join(","), ...csvRows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `${filteredExpenses.length} expenses (${totalRows} total rows including splits) exported to CSV`,
      });
    };

    const handleSelectAll = () => {
      if (selectedExpenses.length === filteredExpenses.length) {
        setSelectedExpenses([]);
      } else {
        setSelectedExpenses(filteredExpenses.map((e) => e.id));
      }
    };

    const handleSelectExpense = (expenseId: string) => {
      if (selectedExpenses.includes(expenseId)) {
        setSelectedExpenses(selectedExpenses.filter((id) => id !== expenseId));
      } else {
        setSelectedExpenses([...selectedExpenses, expenseId]);
      }
    };

    const handleAllocationSuccess = () => {
      // Refresh the expenses list
      onRefresh();
      setAllocationSheetOpen(false);
      setExpenseToAllocate(null);
    };

    const getCategoryBadgeVariant = (category: ExpenseCategory) => {
      switch (category) {
        case ExpenseCategory.LABOR:
          return "default";
        case ExpenseCategory.SUBCONTRACTOR:
          return "secondary";
        case ExpenseCategory.MATERIALS:
          return "outline";
        case ExpenseCategory.EQUIPMENT:
          return "default";
        case ExpenseCategory.PERMITS:
          return "secondary";
        case ExpenseCategory.MANAGEMENT:
          return "outline";
        default:
          return "secondary";
      }
    };

    const getTypeBadgeVariant = (type: TransactionType) => {
      switch (type) {
        case "expense":
          return "default";
        case "bill":
          return "secondary";
        case "check":
          return "outline";
        case "credit_card":
          return "default";
        case "cash":
          return "secondary";
        default:
          return "outline";
      }
    };

    const toggleExpanded = (expenseId: string) => {
      setExpandedExpenses((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(expenseId)) {
          newSet.delete(expenseId);
        } else {
          newSet.add(expenseId);
        }
        return newSet;
      });
    };

    // Create display data that includes split rows
    type DisplayRow = Expense & {
      _isSplitRow?: boolean;
      _splitData?: ExpenseSplit & {
        project_name?: string;
        project_number?: string;
      };
      _parentExpenseId?: string;
      payee_type?: string;
      category?: string;
    };

    const displayData = useMemo((): DisplayRow[] => {
      const result: DisplayRow[] = [];

      filteredExpenses.forEach((expense) => {
        result.push(expense as DisplayRow);

        // If expense is split and expanded, add split rows
        if (expense.is_split && expandedExpenses.has(expense.id)) {
          const splits = expenseSplits[expense.id] || [];
          splits.forEach((split) => {
            result.push({
              ...expense,
              _isSplitRow: true,
              _splitData: split,
              _parentExpenseId: expense.id,
              id: `${expense.id}_split_${split.id}`, // Unique ID for rendering
            } as DisplayRow);
          });
        }
      });

      return result;
    }, [filteredExpenses, expandedExpenses, expenseSplits]);

    // Sorting functions
    const handleSort = (columnKey: string) => {
      const column = EXPENSE_COLUMNS.find(col => col.key === columnKey);
      if (!column?.sortable) return;
      
      if (sortColumn === columnKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(columnKey);
        setSortDirection('asc');
      }
    };

    const renderSortIcon = (columnKey: string) => {
      const column = EXPENSE_COLUMNS.find(col => col.key === columnKey);
      if (!column?.sortable) return null;
      
      if (sortColumn !== columnKey) {
        return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
      }
      return sortDirection === 'asc' 
        ? <ChevronUp className="h-3 w-3 ml-1" /> 
        : <ChevronDown className="h-3 w-3 ml-1" />;
    };

    // Apply sorting to displayData
    const sortedDisplayData = useMemo(() => {
      if (!sortColumn) return displayData;
      
      return [...displayData].sort((a, b) => {
        // Split rows always stay with their parent, don't sort them independently
        if (a._isSplitRow || b._isSplitRow) return 0;
        
        let aValue: any, bValue: any;
        
        switch (sortColumn) {
          case 'date':
            aValue = parseDateOnly(a.expense_date).getTime();
            bValue = parseDateOnly(b.expense_date).getTime();
            break;
          case 'project':
            aValue = a.project_number || '';
            bValue = b.project_number || '';
            break;
          case 'payee':
            aValue = a.payee_name || '';
            bValue = b.payee_name || '';
            break;
          case 'description':
            aValue = a.description || '';
            bValue = b.description || '';
            break;
          case 'category':
            aValue = a.category || '';
            bValue = b.category || '';
            break;
          case 'transaction_type':
            aValue = a.transaction_type || '';
            bValue = b.transaction_type || '';
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'invoice_number':
            aValue = a.invoice_number || '';
            bValue = b.invoice_number || '';
            break;
          case 'status_assigned':
            aValue = a.project_name?.includes('Unassigned') ? 0 : 1;
            bValue = b.project_name?.includes('Unassigned') ? 0 : 1;
            break;
          case 'status_allocated':
            aValue = expenseMatches[a.id]?.matched ? 1 : 0;
            bValue = expenseMatches[b.id]?.matched ? 1 : 0;
            break;
          case 'approval_status':
            aValue = a.approval_status || '';
            bValue = b.approval_status || '';
            break;
          default:
            return 0;
        }
        
        // Handle nulls
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // Compare values
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }, [displayData, sortColumn, sortDirection, expenseMatches]);

    // Pagination
    const pagination = usePagination({
      totalItems: sortedDisplayData.filter(r => !r._isSplitRow).length,
      pageSize: pageSize,
      initialPage: 1,
    });

    const paginatedData = sortedDisplayData.slice(pagination.startIndex, pagination.endIndex);

    const columns = [
      {
        key: "expense_date",
        label: "Date",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow && row._splitData) {
            return (
              <div className="text-xs font-mono text-muted-foreground">
                {row._splitData.split_percentage?.toFixed(1)}%
              </div>
            );
          }

          return (
            <div className="text-sm font-mono">
              {row.expense_date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </div>
          );
        },
      },
      {
        key: "project_name",
        label: "Project",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow && row._splitData) {
            return (
              <div className="text-sm text-muted-foreground">
                {row._splitData.project_number && <span className="font-mono">{row._splitData.project_number} • </span>}
                {row._splitData.project_name}
              </div>
            );
          }

          // For split parents, show "SPLIT" instead of project number
          if (row.is_split) {
            return (
              <div className="text-sm">
                <span className="font-medium">SPLIT</span>
              </div>
            );
          }

          const isUnassigned = row.project_name?.includes("Unassigned");

          return (
            <div className={cn("text-sm", isUnassigned && "text-muted-foreground italic")}>
              {row.project_number && <span className="font-mono">{row.project_number} • </span>}
              {row.project_name}
            </div>
          );
        },
      },
      {
        key: "project_status",
        label: "Project Assignment",
        sortable: false,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap bg-muted/50 border-muted-foreground/30">
                Split
              </Badge>
            );
          }

          // Check if this is a split parent expense (defensive check)
          if (row.is_split === true) {
            return (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                Split Parent
              </Badge>
            );
          }

          const isPlaceholder =
            row.project_number === "000-UNASSIGNED" ||
            row.project_number === "SYS-000";

          if (isPlaceholder) {
            return (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap text-warning border-warning/50">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                Needs Assignment
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap text-success border-success/50">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              Assigned
            </Badge>
          );
        },
      },
      {
        key: "payee_name",
        label: "Payee",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            if (row._splitData?.notes) {
              return <div className="text-xs text-muted-foreground italic">{row._splitData.notes}</div>;
            }
            return <div className="text-xs text-muted-foreground">{row.payee_name}</div>;
          }
          return <div className="text-sm">{row.payee_name}</div>;
        },
      },
      {
        key: "payee_type",
        label: "Payee Type",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return row.payee_type ? (
              <span className="text-xs text-muted-foreground">{row.payee_type}</span>
            ) : null;
          }
          
          if (!row.payee_type) return <span className="text-xs text-muted-foreground">—</span>;
          
          const payeeTypeDisplay: Record<string, string> = {
            'subcontractor': 'Subcontractor',
            'supplier': 'Supplier',
            'employee': 'Employee',
            'internal': 'Internal',
            'permit_issuer': 'Permit Issuer',
            'equipment_rental': 'Equipment Rental',
            'consultant': 'Consultant',
            'other': 'Other'
          };
          
          return (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap">
              {payeeTypeDisplay[row.payee_type] || row.payee_type}
            </Badge>
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow && row._splitData) {
            return (
              <div className="text-right text-sm font-mono font-medium text-muted-foreground">
                {formatCurrency(row._splitData.split_amount, { showCents: true })}
              </div>
            );
          }

          // For split expenses in project view, show allocated amount
          if (row.is_split && projectId && row.project_id !== projectId) {
            const splitForThisProject = expenseSplits[row.id]?.find((s) => s.project_id === projectId);

            if (splitForThisProject) {
              return (
                <div className="text-right">
                  <div className="text-sm font-mono font-medium">
                    {formatCurrency(splitForThisProject.split_amount, { showCents: true })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {formatCurrency(row.amount, { showCents: true })}
                  </div>
                </div>
              );
            }
          }

          return (
            <div className="text-right text-sm font-mono font-medium">
              {formatCurrency(row.amount, { showCents: true })}
            </div>
          );
        },
      },
      {
        key: "category",
        label: "Expense Category",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return (
              <Badge variant={getCategoryBadgeVariant(row.category)} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap opacity-60">
                {EXPENSE_CATEGORY_DISPLAY[row.category]}
              </Badge>
            );
          }

          return (
            <Badge variant={getCategoryBadgeVariant(row.category)} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap">
              {EXPENSE_CATEGORY_DISPLAY[row.category]}
            </Badge>
          );
        },
      },
      {
        key: "transaction_type",
        label: "Transaction Type",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return (
              <Badge variant={getTypeBadgeVariant(row.transaction_type)} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap opacity-60">
                {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
              </Badge>
            );
          }

          return (
            <Badge variant={getTypeBadgeVariant(row.transaction_type)} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap">
              {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
            </Badge>
          );
        },
      },
      {
        key: "approval_status",
        label: "Status",
        sortable: true,
        render: (row: DisplayRow) => {
          const status = row.approval_status || "pending";
          const variant =
            status === "approved"
              ? "default"
              : status === "rejected"
                ? "destructive"
                : status === "pending"
                  ? "secondary"
                  : "outline";

          if (row._isSplitRow) {
            return (
              <Badge variant={variant} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap opacity-60">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            );
          }

          return (
            <Badge variant={variant} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        },
      },
      {
        key: "line_item_allocation",
        label: "Line Item Allocation",
        sortable: false,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          // Check if this is a non-construction project (can't allocate to line items)
          const isPlaceholder =
            isSystemProjectByCategory(row.project_category as ProjectCategory) ||
            isOverheadProject(row.project_category as ProjectCategory) ||
            // Backward compatibility: check project_number if category not set
            (!row.project_category && (
              row.project_number === "000-UNASSIGNED" ||
              row.project_number === "SYS-000" ||
              (row.project_number && isOperationalProject(row.project_number))
            ));

          // Show dash for placeholder projects
          if (isPlaceholder) {
            return <span className="text-muted-foreground">—</span>;
          }

          // Show allocation status for real projects
          const match = expenseMatches[row.id];
          if (match?.matched) {
            const displayType =
              match.type === "estimate" ? "Estimate" : match.type === "quote" ? "Quote" : "Change Order";

            return (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap text-success border-success/50">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />→ {displayType}
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap text-warning border-warning/50">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              Unallocated
            </Badge>
          );
        },
      },
    ];

    const renderActions = (row: DisplayRow) => {
      // Don't show actions for split rows
      if (row._isSplitRow) return null;

      const status = row.approval_status || "pending";
      const isAllocated = expenseMatches[row.id]?.matched;
      const canSplit =
        row.project_number !== "000-UNASSIGNED" &&
        row.project_number !== "SYS-000";

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-input-compact w-8 p-0" aria-label="Actions menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Edit2 className="h-3 w-3 mr-2" />
              Edit Expense
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setExpenseToReassign(row);
                setReassignDialogOpen(true);
              }}
            >
              <FolderOpen className="h-3 w-3 mr-2" />
              Reassign Project
            </DropdownMenuItem>

            {canSplit && !row.is_split && (
              <DropdownMenuItem
                onClick={() => {
                  setExpenseToSplit(row);
                  setSplitDialogOpen(true);
                }}
              >
                <Target className="h-3 w-3 mr-2" />
                Split Expense
              </DropdownMenuItem>
            )}

            {row.is_split && (
              <DropdownMenuItem
                onClick={() => {
                  setExpenseToSplit(row);
                  setSplitDialogOpen(true);
                }}
              >
                <Edit2 className="h-3 w-3 mr-2" />
                Manage Splits
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => {
              setExpenseToAllocate(row.id);
              setAllocationSheetOpen(true);
            }}>
              <Target className="h-3 w-3 mr-2" />
              {isAllocated ? 'View/Change Allocation' : 'Match to Line Items'}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Delete Expense
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => handleApprovalAction(row.id, "approve")}>Approve</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleApprovalAction(row.id, "reject")}>Reject</DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            {row.receipt_id ? (
              <>
                <DropdownMenuItem onClick={() => handleViewReceipt(row)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Receipt
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleUnlinkReceipt(row)}
                  className="text-destructive"
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Unlink Receipt
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => handleLinkReceipt(row)}>
                <Link2 className="mr-2 h-4 w-4" />
                Link Receipt
              </DropdownMenuItem>
            )}

            {row.project_id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => (window.location.href = `/projects/${row.project_id}`)}>
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    };

    const renderCell = (row: DisplayRow, columnKey: string) => {
      switch (columnKey) {
        case 'checkbox':
          return (
            <Checkbox
              checked={selectedExpenses.includes(row.id)}
              onCheckedChange={(checked) => {
                if (!row._isSplitRow) {
                  if (checked) {
                    setSelectedExpenses([...selectedExpenses, row.id]);
                  } else {
                    setSelectedExpenses(selectedExpenses.filter((id) => id !== row.id));
                  }
                }
              }}
              disabled={row._isSplitRow}
            />
          );
        
        case 'date':
          if (row._isSplitRow && row._splitData) {
            return (
              <span className="text-muted-foreground font-mono text-xs">
                {row._splitData.split_percentage?.toFixed(1)}%
              </span>
            );
          }
          return (
            <span className="font-mono text-muted-foreground text-xs">
              {format(parseDateOnly(row.expense_date), 'M/d/yy')}
            </span>
          );
        
        case 'project':
          if (row._isSplitRow && row._splitData) {
            return (
              <div className="text-muted-foreground pl-2">
                <div className="text-xs leading-tight">
                  <div className="font-medium">{row._splitData.project_number || "-"}</div>
                  <div className="text-muted-foreground text-[10px]">{row._splitData.project_name || ""}</div>
                </div>
              </div>
            );
          }
          
          // Always show project - never hide it
          return (
            <div className={cn(
              "text-xs leading-tight",
              row.project_name?.includes("Unassigned") && "text-muted-foreground italic"
            )}>
              <div className="font-medium">{row.project_number || "-"}</div>
              <div className="text-muted-foreground text-[10px]">{row.project_name || ""}</div>
            </div>
          );
        
        case 'payee':
          if (row._isSplitRow) return null;
          return (
            <div className="text-xs">
              {row.payee_name || (
                <span className="text-muted-foreground italic">No payee</span>
              )}
            </div>
          );
        
        case 'description':
          if (row._isSplitRow) return null;
          return (
            <div className="text-xs text-muted-foreground truncate max-w-xs">
              {row.description || '-'}
            </div>
          );
        
        case 'category':
          if (row._isSplitRow) return null;
          return (
            <Badge variant={getCategoryBadgeVariant(row.category)} className="text-[10px] px-1.5 py-0 h-4">
              {EXPENSE_CATEGORY_DISPLAY[row.category]}
            </Badge>
          );
        
        case 'transaction_type':
          if (row._isSplitRow) return null;
          return (
            <span className="text-xs text-muted-foreground">
              {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
            </span>
          );
        
        case 'amount':
          if (row._isSplitRow && row._splitData) {
            return (
              <span className="font-mono font-medium text-muted-foreground">
                {formatCurrency(row._splitData.split_amount, { showCents: true })}
              </span>
            );
          }
          // For split expenses in project view, show allocated amount
          if (row.is_split && projectId && row.project_id !== projectId) {
            const splitForThisProject = expenseSplits[row.id]?.find((s) => s.project_id === projectId);
            if (splitForThisProject) {
              return (
                <div>
                  <div className="font-mono font-medium">
                    {formatCurrency(splitForThisProject.split_amount, { showCents: true })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {formatCurrency(row.amount, { showCents: true })}
                  </div>
                </div>
              );
            }
          }
          return (
            <span className="font-mono font-medium">
              {formatCurrency(row.amount, { showCents: true })}
            </span>
          );
        
        case 'invoice_number':
          if (row._isSplitRow) return null;
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {row.invoice_number || '-'}
            </span>
          );
        
        case 'status_assigned':
          if (row._isSplitRow) return null;
          
          if (row.is_split) {
            return (
              <div className="flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
              </div>
            );
          }
          
          // Check for placeholder projects (system projects) or unassigned expenses
          // Overhead projects (001-GAS, 002-GA) can be assigned, so they show green check when assigned
          const isSystemProject = isSystemProjectByCategory(row.project_category as ProjectCategory) ||
            (!row.project_category && (
              row.project_number === "000-UNASSIGNED" ||
              row.project_number === "SYS-000"
            ));
          
          const isUnassigned = !row.project_id;
          
          if (isSystemProject || isUnassigned) {
            return (
              <div className="flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
            );
          }
          
          // Show green check for assigned expenses (including overhead projects like 001-GAS, 002-GA)
          return (
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          );
        
        case 'status_allocated':
          if (row._isSplitRow) return null;
          
          // Show "-" for overhead projects (never allocated to line items)
          // This includes 001-GAS, 002-GA, and any future overhead projects
          if (isOverheadProject(row.project_category as ProjectCategory) || 
              (!row.project_category && (row.project_number === "001-GAS" || row.project_number === "002-GA"))) {
            return (
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground">-</span>
              </div>
            );
          }
          
          const isAllocated = expenseMatches[row.id]?.matched;
          return (
            <div className="flex items-center justify-center">
              {isAllocated ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          );
        
        case 'approval_status':
          if (row._isSplitRow) return null;
          const status = row.approval_status || "pending";
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
          return (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        
        case 'receipt':
          if (row._isSplitRow) return null;
          return (
            <div className="flex justify-center">
              {row.receipt_id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => handleViewReceipt(row)}
                  title="View linked receipt"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-primary"
                  onClick={() => handleLinkReceipt(row)}
                  title="Link a receipt"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        
        case 'actions':
          if (row._isSplitRow) return null;
          return renderActions(row);
        
        default:
          return null;
      }
    };

    return (
      <div className="dense-spacing">
        {/* Workflow helper */}
        <div className="mb-2 border-b pb-2 text-xs text-muted-foreground w-full max-w-full min-w-0 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">
                <strong>Workflow:</strong> First assign expenses to projects, then optionally allocate them to specific line
                items for detailed tracking.
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-xs shrink-0">
                  Learn more
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-sm text-xs" align="start">
                <div className="space-y-2">
                  <div>
                    <strong>Step 1: Project Assignment</strong>
                    <p className="text-muted-foreground mt-0.5">Assign each expense to a project to affect project budgets.</p>
                  </div>
                  <div>
                    <strong>Step 2: Line Item Allocation</strong>
                    <p className="text-muted-foreground mt-0.5">Match to specific line items for variance analysis.</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filters - Compact */}
        <CollapsibleFilterSection
          title="Filter Expenses"
          hasActiveFilters={hasActiveFilters()}
          activeFilterCount={getActiveFilterCount()}
          onClearFilters={handleClearFilters}
          resultCount={filteredExpenses.length}
          defaultExpanded={false}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-4">
              <Input
                placeholder="Search by payee, description, invoice, project, amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            {!projectId && (
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
                <PopoverContent className="w-full sm:w-64 p-0" align="start">
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
                          value={`${project.project_number} ${project.project_name}`}
                          onSelect={() => toggleProject(project.id)}
                          className="text-sm"
                        >
                  <div className="flex items-center gap-2 w-full">
                    <Checkbox
                      checked={filterProjects.includes(project.id)}
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span className="text-sm truncate">
                      {project.project_number} - {project.project_name}
                    </span>
                  </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-full justify-between text-xs"
                >
                  <span className="truncate">
                    {filterCategories.length === 0 
                      ? "Expense Categories" 
                      : `${filterCategories.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterCategories(Object.keys(EXPENSE_CATEGORY_DISPLAY))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterCategories([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([value, label]) => (
                    <div 
                      key={value}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleCategory(value)}
                    >
                      <Checkbox
                        checked={filterCategories.includes(value)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
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
                    {filterTransactionTypes.length === 0 
                      ? "Transaction Types" 
                      : `${filterTransactionTypes.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterTransactionTypes(Object.keys(TRANSACTION_TYPE_DISPLAY))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterTransactionTypes([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([value, label]) => (
                    <div 
                      key={value}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleTransactionType(value)}
                    >
                      <Checkbox
                        checked={filterTransactionTypes.includes(value)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
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
                    {filterMatchStatuses.length === 0 
                      ? "Allocation Status" 
                      : `${filterMatchStatuses.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterMatchStatuses(["unassigned", "unmatched", "matched"])}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterMatchStatuses([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  <div 
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleMatchStatus("unassigned")}
                  >
                    <Checkbox
                      checked={filterMatchStatuses.includes("unassigned")}
                      className="h-4 w-4 pointer-events-none"
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      ⚠️ Needs Assignment
                    </label>
                  </div>
                  <div 
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleMatchStatus("unmatched")}
                  >
                    <Checkbox
                      checked={filterMatchStatuses.includes("unmatched")}
                      className="h-4 w-4 pointer-events-none"
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      ⚠️ Unallocated
                    </label>
                  </div>
                  <div 
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleMatchStatus("matched")}
                  >
                    <Checkbox
                      checked={filterMatchStatuses.includes("matched")}
                      className="h-4 w-4 pointer-events-none"
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      ✅ Allocated
                    </label>
                  </div>
                </div>
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
                    {filterApprovalStatuses.length === 0 
                      ? "All Statuses" 
                      : `${filterApprovalStatuses.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterApprovalStatuses(["pending", "approved", "rejected"])}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterApprovalStatuses([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {[
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" }
                  ].map(({ value, label }) => (
                    <div 
                      key={value}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleApprovalStatus(value)}
                    >
                      <Checkbox
                        checked={filterApprovalStatuses.includes(value)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
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
                    {filterSplitStatuses.length === 0 
                      ? "Split Status" 
                      : `${filterSplitStatuses.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterSplitStatuses(["split", "unsplit"])}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterSplitStatuses([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {[
                    { value: "split", label: "Split Expenses" },
                    { value: "unsplit", label: "Single Project" }
                  ].map(({ value, label }) => (
                    <div 
                      key={value}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleSplitStatus(value)}
                    >
                      <Checkbox
                        checked={filterSplitStatuses.includes(value)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
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
                    {filterPayees.length === 0 
                      ? "All Payees" 
                      : `${filterPayees.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search payees..." className="h-9" />
                  <CommandEmpty>No payee found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setFilterPayees(payees.map(p => p.id))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setFilterPayees([])}
                      >
                        Clear
                      </Button>
                    </div>
                    {payees.map((payee) => (
                      <CommandItem
                        key={payee.id}
                        value={payee.payee_name}
                        onSelect={() => togglePayee(payee.id)}
                        className="text-sm"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Checkbox
                            checked={filterPayees.includes(payee.id)}
                            className="h-4 w-4 pointer-events-none"
                          />
                          <span className="text-sm truncate">
                            {payee.payee_name}
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
                    {filterPayeeTypes.length === 0 
                      ? "All Payee Types" 
                      : `${filterPayeeTypes.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-56 p-2" align="start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterPayeeTypes(Object.values(PayeeType))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFilterPayeeTypes([])}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {[
                    { value: PayeeType.SUBCONTRACTOR, label: "Subcontractor" },
                    { value: PayeeType.MATERIAL_SUPPLIER, label: "Material Supplier" },
                    { value: PayeeType.EQUIPMENT_RENTAL, label: "Equipment Rental" },
                    { value: PayeeType.INTERNAL_LABOR, label: "Internal Labor" },
                    { value: PayeeType.MANAGEMENT, label: "Management" },
                    { value: PayeeType.PERMIT_AUTHORITY, label: "Permit Authority" },
                    { value: PayeeType.OTHER, label: "Other" }
                  ].map(({ value, label }) => (
                    <div 
                      key={value}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => togglePayeeType(value)}
                    >
                      <Checkbox
                        checked={filterPayeeTypes.includes(value)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CollapsibleFilterSection>

        {/* Bulk Actions */}
        {selectedExpenses.length > 0 && (
          <div className="mb-3">
            <ExpenseBulkActions
              selectedExpenseIds={selectedExpenses}
              onSelectionChange={(newSet) => setSelectedExpenses(Array.from(newSet))}
              onComplete={() => {
                setSelectedExpenses([]);
                onRefresh();
              }}
            />
          </div>
        )}

        {/* Expenses Table */}
        {displayData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {filteredExpenses.length === 0 
              ? "No expenses found. Add your first expense to get started."
              : "No expenses match your current filters."}
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div className="space-y-2 w-full max-w-full min-w-0 overflow-x-hidden">
            {paginatedData.map((row) => {
              // Skip split rows in mobile - they'll be shown within parent cards
              if (row._isSplitRow) return null;
              
              const splits = expenseSplits[row.id] || [];
              const hasSplits = row.is_split && splits.length > 0;
              const isSystemProject = isSystemProjectByCategory(row.project_category as ProjectCategory) ||
                (!row.project_category && (
                  row.project_number === "000-UNASSIGNED" ||
                  row.project_number === "SYS-000"
                ));
              const isUnassigned = !row.project_id;
              const isAssigned = !isSystemProject && !isUnassigned;
              const isAllocated = expenseMatches[row.id]?.matched;
              const isOverhead = isOverheadProject(row.project_category as ProjectCategory) ||
                (!row.project_category && (row.project_number === "001-GAS" || row.project_number === "002-GA"));

              return (
                <Card key={row.id} className="hover:bg-muted/50 transition-colors overflow-hidden">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-sm font-semibold truncate">
                            {row.project_number || '-'}
                          </CardTitle>
                          {row.is_split && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              SPLIT
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{row.project_name || ''}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(parseDateOnly(row.expense_date), 'M/d/yy')}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-mono font-medium">
                            {formatCurrency(row.amount, { showCents: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          checked={selectedExpenses.includes(row.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExpenses([...selectedExpenses, row.id]);
                            } else {
                              setSelectedExpenses(selectedExpenses.filter((id) => id !== row.id));
                            }
                          }}
                        />
                        {renderActions(row)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {/* Always visible key metrics */}
                    <div className="flex items-center justify-between px-3 py-2 border-t min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0 flex-1">
                        {/* Assigned Status */}
                        <div className="flex items-center gap-1 shrink-0">
                          {row.is_split ? (
                            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : isSystemProject || isUnassigned ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Assigned</span>
                        </div>
                        {/* Allocated Status */}
                        {!isOverhead && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isAllocated ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Allocated</span>
                          </div>
                        )}
                      </div>
                      {hasSplits && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedMobileCards(prev => {
                              const next = new Set(prev);
                              if (next.has(row.id)) {
                                next.delete(row.id);
                              } else {
                                next.add(row.id);
                              }
                              return next;
                            });
                          }}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                            expandedMobileCards.has(row.id) ? 'rotate-180' : ''
                          }`} />
                        </Button>
                      )}
                    </div>

                    {/* Expandable Details */}
                    <Collapsible 
                      open={expandedMobileCards.has(row.id)}
                      onOpenChange={(open) => {
                        setExpandedMobileCards(prev => {
                          const next = new Set(prev);
                          if (open) {
                            next.add(row.id);
                          } else {
                            next.delete(row.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs"
                        >
                          <span>View Details</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                            expandedMobileCards.has(row.id) ? 'rotate-180' : ''
                          }`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 pt-2">
                          {/* Additional Details Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2 rounded min-w-0">
                            {row.payee_name && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Payee</div>
                                <div className="font-medium truncate">{row.payee_name}</div>
                              </div>
                            )}
                            {row.category && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Category</div>
                                <div>
                                  <Badge variant={getCategoryBadgeVariant(row.category)} className="text-[10px] px-1.5 py-0 h-4">
                                    {EXPENSE_CATEGORY_DISPLAY[row.category]}
                                  </Badge>
                                </div>
                              </div>
                            )}
                            {row.transaction_type && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Type</div>
                                <div className="font-medium truncate">{TRANSACTION_TYPE_DISPLAY[row.transaction_type]}</div>
                              </div>
                            )}
                            {row.invoice_number && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Invoice #</div>
                                <div className="font-mono font-medium truncate">{row.invoice_number}</div>
                              </div>
                            )}
                            {row.approval_status && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Approval</div>
                                <div>
                                  {row.approval_status === "pending" ? (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">
                                      Pending
                                    </Badge>
                                  ) : row.approval_status === "approved" ? (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300">
                                      Approved
                                    </Badge>
                                  ) : row.approval_status === "rejected" ? (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300">
                                      Rejected
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      {row.approval_status.charAt(0).toUpperCase() + row.approval_status.slice(1)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Split Rows */}
                          {hasSplits && expandedMobileCards.has(row.id) && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="text-xs font-medium px-3 text-muted-foreground">Split Details</div>
                              {splits.map((split) => (
                                <div key={split.id} className="bg-muted/20 p-2 rounded mx-3 min-w-0">
                                  <div className="flex items-center justify-between mb-1 gap-2 min-w-0">
                                    <div className="text-xs font-medium truncate min-w-0">
                                      {split.project_number || '-'}
                                    </div>
                                    <div className="text-xs font-mono font-medium shrink-0">
                                      {formatCurrency(split.split_amount, { showCents: true })}
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {split.project_name || ''}
                                  </div>
                                  {split.split_percentage && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      {split.split_percentage.toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {enablePagination && displayData.filter(r => !r._isSplitRow).length > 0 && (
              <div className="p-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      pagination.goToPage(1);
                    }}
                    className="border rounded px-2 py-1 text-sm shrink-0"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
                {displayData.filter(r => !r._isSplitRow).length > pageSize && (
                  <div className="min-w-0">
                    <CompletePagination
                      currentPage={pagination.currentPage}
                      totalPages={Math.ceil(displayData.filter(r => !r._isSplitRow).length / pageSize)}
                      onPageChange={pagination.goToPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Totals Footer */}
            <div className="p-3 border-t bg-muted/30 rounded-b min-w-0">
              <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                <span className="font-medium truncate min-w-0">
                  Total ({displayData.filter(r => !r._isSplitRow).length} expenses):
                </span>
                <span className="font-mono font-medium shrink-0">
                  {formatCurrency(
                    displayData
                      .filter(r => !r._isSplitRow)
                      .reduce((sum, r) => sum + r.amount, 0),
                    { showCents: true }
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-auto -mx-2 px-2 sm:mx-0 sm:px-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <Table className="min-w-[1200px]">
                  <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                    <TableRow className="h-8">
                      <TableHead className="w-10 p-2 text-xs">
                        <Checkbox
                          checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
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
                    {paginatedData.map((row, index) => {
                      const isEvenRow = index % 2 === 0;
                      return (
                        <TableRow 
                          key={row.id}
                          className={cn(
                            "h-9 hover:bg-muted/50",
                            row._isSplitRow ? "bg-muted/10 hover:bg-muted/30" : isEvenRow && "bg-muted/20"
                          )}
                        >
                          {/* Selection Checkbox - always visible */}
                          <TableCell className="p-1.5">
                            {!row._isSplitRow ? (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={selectedExpenses.includes(row.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedExpenses([...selectedExpenses, row.id]);
                                    } else {
                                      setSelectedExpenses(selectedExpenses.filter((id) => id !== row.id));
                                    }
                                  }}
                                />
                                {row.is_split && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0" 
                                    onClick={() => toggleExpanded(row.id)}
                                  >
                                    {expandedExpenses.has(row.id) ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="w-4 h-4" />
                            )}
                          </TableCell>

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
                                {renderCell(row, column.key)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  
                  {/* Footer with totals */}
                  <TableFooter className="border-t bg-muted/30">
                    <TableRow>
                      {orderedColumns.map((column) => {
                        if (!isColumnVisible(column.key)) return null;
                        
                        if (column.key === 'project') {
                          return (
                            <TableCell key={column.key} className="p-2 font-medium text-xs">
                              Total ({displayData.filter(r => !r._isSplitRow).length} expenses):
                            </TableCell>
                          );
                        } else if (column.key === 'amount') {
                          return (
                            <TableCell key={column.key} className="p-2 text-right font-mono font-medium text-xs">
                              {formatCurrency(
                                displayData
                                  .filter(r => !r._isSplitRow)
                                  .reduce((sum, r) => sum + r.amount, 0),
                                { showCents: true }
                              )}
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
              {enablePagination && displayData.filter(r => !r._isSplitRow).length > 0 && (
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
                  {displayData.filter(r => !r._isSplitRow).length > pageSize && (
                    <CompletePagination
                      currentPage={pagination.currentPage}
                      totalPages={Math.ceil(displayData.filter(r => !r._isSplitRow).length / pageSize)}
                      onPageChange={pagination.goToPage}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <ReassignExpenseProjectDialog
          open={reassignDialogOpen}
          onClose={() => {
            setReassignDialogOpen(false);
            setExpenseToReassign(null);
          }}
          onSuccess={() => {
            setReassignDialogOpen(false);
            setExpenseToReassign(null);
            onRefresh();
          }}
          expenseIds={expenseToReassign ? [expenseToReassign.id] : []}
          currentProjectName={expenseToReassign?.project_name}
        />

        <ExpenseSplitDialog
          open={splitDialogOpen}
          onClose={() => {
            setSplitDialogOpen(false);
            setExpenseToSplit(null);
          }}
          expense={expenseToSplit}
          onSuccess={() => {
            setSplitDialogOpen(false);
            setExpenseToSplit(null);
            onRefresh();
          }}
        />

        {/* Expense Allocation Sheet */}
        <ExpenseAllocationSheet
          open={allocationSheetOpen}
          onOpenChange={setAllocationSheetOpen}
          expenseId={expenseToAllocate}
          onSuccess={handleAllocationSuccess}
        />

        {/* Receipt Link Modal */}
        <ReceiptLinkModal
          open={receiptLinkModalOpen}
          onOpenChange={setReceiptLinkModalOpen}
          expense={expenseToLink}
          onSuccess={handleReceiptLinkSuccess}
        />

        {/* Receipt Preview Modal */}
        <ReceiptPreviewModal
          open={receiptPreviewOpen}
          onOpenChange={setReceiptPreviewOpen}
          receiptUrl={previewReceiptUrl}
          timeEntryDetails={previewReceiptDetails}
        />
      </div>
    );
  },
);

ExpensesList.displayName = "ExpensesList";
