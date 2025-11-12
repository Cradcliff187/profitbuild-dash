import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ExpenseBulkActions } from "./ExpenseBulkActions";
import { ReassignExpenseProjectDialog } from "./ReassignExpenseProjectDialog";
import { ExpenseSplitDialog } from "./ExpenseSplitDialog";
import { CollapsibleFilterSection } from "./ui/collapsible-filter-section";
import { cn } from "@/lib/utils";
import {
  Expense,
  ExpenseCategory,
  TransactionType,
  ExpenseSplit,
  EXPENSE_CATEGORY_DISPLAY,
  TRANSACTION_TYPE_DISPLAY,
} from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import { getExpenseSplits, calculateProjectExpenses } from "@/utils/expenseSplits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExpensesListProps {
  expenses: Expense[];
  projectId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  enablePagination?: boolean;
  pageSize?: number;
}

export interface ExpensesListRef {
  exportToCsv: () => void;
}

export const ExpensesList = React.forwardRef<ExpensesListRef, ExpensesListProps>(
  ({ expenses, projectId, onEdit, onDelete, onRefresh, enablePagination = true, pageSize = 25 }, ref) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterTransactionType, setFilterTransactionType] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [filterMatchStatus, setFilterMatchStatus] = useState<string>("all");
    const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>("all");
    const [filterSplitStatus, setFilterSplitStatus] = useState<string>("all");
    const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [expenseMatches, setExpenseMatches] = useState<
      Record<string, { matched: boolean; type?: "estimate" | "quote" | "change_order" }>
    >({});
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [expenseToReassign, setExpenseToReassign] = useState<Expense | null>(null);
    const [splitDialogOpen, setSplitDialogOpen] = useState(false);
    const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);
    const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
    const [expenseSplits, setExpenseSplits] = useState<Record<string, ExpenseSplit[]>>({});
    const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
    const { toast } = useToast();

    const getActiveFilterCount = (): number => {
      let count = 0;
      if (searchTerm) count++;
      if (filterCategory !== "all") count++;
      if (filterTransactionType !== "all") count++;
      if (filterProject !== "all") count++;
      if (filterMatchStatus !== "all") count++;
      if (filterApprovalStatus !== "all") count++;
      if (filterSplitStatus !== "all") count++;
      return count;
    };

    const hasActiveFilters = (): boolean => {
      return getActiveFilterCount() > 0;
    };

    const handleClearFilters = () => {
      setSearchTerm("");
      setFilterCategory("all");
      setFilterTransactionType("all");
      setFilterProject("all");
      setFilterMatchStatus("all");
      setFilterApprovalStatus("all");
      setFilterSplitStatus("all");
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
            .select("id, project_name, project_number")
            .order("project_name");

          if (error) throw error;
          setProjects(data || []);
        } catch (error) {
          console.error("Error fetching projects:", error);
        }
      };

      fetchProjects();
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

    // Defensive filter: Remove any SYS-000 split parents that might slip through
    const displayableExpenses = useMemo(() => {
      return expenses.filter((expense) => {
        const isSplitParent = expense.is_split && expense.project_id === "SYS-000";
        return !isSplitParent;
      });
    }, [expenses]);

    // Filter expenses based on search term and filters
    const filteredExpenses = useMemo(() => {
      return displayableExpenses.filter((expense) => {
        const matchesSearch =
          expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
        const matchesType = filterTransactionType === "all" || expense.transaction_type === filterTransactionType;
        const matchesProject = filterProject === "all" || expense.project_id === filterProject;
        const matchesApprovalStatus =
          filterApprovalStatus === "all" || (expense.approval_status || "pending") === filterApprovalStatus;

        let matchesMatchStatus = true;
        if (filterMatchStatus === "matched") {
          matchesMatchStatus = expenseMatches[expense.id]?.matched === true;
        } else if (filterMatchStatus === "unmatched") {
          matchesMatchStatus = expenseMatches[expense.id]?.matched === false;
        } else if (filterMatchStatus === "unassigned") {
          matchesMatchStatus = expense.project_id === "000-UNASSIGNED" || expense.project_name?.includes("Unassigned");
        }

        let matchesSplitStatus = true;
        if (filterSplitStatus === "split") {
          matchesSplitStatus = expense.is_split === true;
        } else if (filterSplitStatus === "unsplit") {
          matchesSplitStatus = !expense.is_split;
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesProject &&
          matchesMatchStatus &&
          matchesApprovalStatus &&
          matchesSplitStatus
        );
      });
    }, [
      displayableExpenses,
      searchTerm,
      filterCategory,
      filterTransactionType,
      filterProject,
      filterMatchStatus,
      filterApprovalStatus,
      filterSplitStatus,
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

    const exportToCsv = async () => {
      const headers = [
        "Date",
        "Project",
        "Project Assignment",
        "Payee",
        "Category",
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
        const isSplitParent = expense.is_split && expense.project_id === "SYS-000";
        const isUnassigned = expense.project_id === "000-UNASSIGNED" || expense.project_name?.includes("Unassigned");
        const isPlaceholder = isUnassigned;

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

    const columns = [
      {
        key: "split_indicator",
        label: "",
        sortable: false,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return <div className="pl-6" />; // Indent for split rows
          }

          if (!row.is_split) return null;

          const isExpanded = expandedExpenses.has(row.id);
          const splits = expenseSplits[row.id] || [];

          return (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpanded(row.id)}>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          );
        },
      },
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
              <Badge variant="outline" className="text-xs bg-muted/50 border-muted-foreground/30">
                Split
              </Badge>
            );
          }

          const isPlaceholder =
            row.project_id === "000-UNASSIGNED" ||
            row.project_name?.includes("Unassigned") ||
            row.project_id === "SYS-000";

          if (isPlaceholder) {
            return (
              <Badge variant="outline" className="text-xs text-warning border-warning/50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Needs Assignment
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="text-xs text-success border-success/50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
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
        label: "Category",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return (
              <Badge variant={getCategoryBadgeVariant(row.category)} className="text-xs opacity-60">
                {EXPENSE_CATEGORY_DISPLAY[row.category]}
              </Badge>
            );
          }

          return (
            <Badge variant={getCategoryBadgeVariant(row.category)} className="text-xs">
              {EXPENSE_CATEGORY_DISPLAY[row.category]}
            </Badge>
          );
        },
      },
      {
        key: "transaction_type",
        label: "Type",
        sortable: true,
        render: (row: DisplayRow) => {
          if (row._isSplitRow) {
            return (
              <Badge variant={getTypeBadgeVariant(row.transaction_type)} className="text-xs opacity-60">
                {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
              </Badge>
            );
          }

          return (
            <Badge variant={getTypeBadgeVariant(row.transaction_type)} className="text-xs">
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
              <Badge variant={variant} className="text-xs opacity-60">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            );
          }

          return (
            <Badge variant={variant} className="text-xs">
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

          const isPlaceholder =
            row.project_id === "000-UNASSIGNED" ||
            row.project_name?.includes("Unassigned") ||
            row.project_id === "SYS-000";

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
              <Badge variant="outline" className="text-xs text-success border-success/50">
                <CheckCircle2 className="h-3 w-3 mr-1" />→ {displayType}
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="text-xs text-warning border-warning/50">
              <AlertTriangle className="h-3 w-3 mr-1" />
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
        row.project_id !== "000-UNASSIGNED" &&
        row.project_id !== "SYS-000" &&
        !row.project_name?.includes("Unassigned");

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

            {!isAllocated && (
              <DropdownMenuItem onClick={() => navigate(`/expenses/matching?highlight=${row.id}`)}>
                <Target className="h-3 w-3 mr-2" />
                Match to Line Items
              </DropdownMenuItem>
            )}

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

    return (
      <div className="dense-spacing">
        {/* Workflow helper */}
        <div className="mb-2 flex items-center gap-2 border-b pb-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>
            <strong>Workflow:</strong> First assign expenses to projects, then optionally allocate them to specific line
            items for detailed tracking.
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                Learn more
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm text-xs" align="start">
              <Card className="border-none shadow-none">
                <CardContent className="p-0 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                          Assigned
                        </Badge>
                        <span className="font-medium">Project Assignment</span>
                      </div>
                      <ul className="ml-2 space-y-0.5 text-muted-foreground">
                        <li>• Which project does this expense belong to?</li>
                        <li>• Required for all expenses</li>
                        <li>• Affects project budgets and reports</li>
                        <li>• Use "Reassign Project" to change</li>
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                          Allocated
                        </Badge>
                        <span className="font-medium">Line Item Allocation</span>
                      </div>
                      <ul className="ml-2 space-y-0.5 text-muted-foreground">
                        <li>• Match to estimate/quote line items</li>
                        <li>• Optional but improves detail</li>
                        <li>• Powers cost variance analysis</li>
                        <li>• Use "Match to Line Items" to allocate</li>
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/40 p-2">
                    <p>
                      <strong>Tip:</strong> Keep projects assigned first, then revisit to allocate when estimates or
                      quotes are finalized.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
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
                placeholder="Search by payee, description, invoice, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            {!projectId && (
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTransactionType} onValueChange={setFilterTransactionType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterMatchStatus} onValueChange={setFilterMatchStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Allocation Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="unassigned">⚠️ Needs Assignment</SelectItem>
                <SelectItem value="unmatched">⚠️ Unallocated</SelectItem>
                <SelectItem value="matched">✅ Allocated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterApprovalStatus} onValueChange={setFilterApprovalStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSplitStatus} onValueChange={setFilterSplitStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Split Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="split">Split Expenses</SelectItem>
                <SelectItem value="unsplit">Single Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleFilterSection>

        <EntityTableTemplate
          title={projectId ? "Project Expenses" : "All Expenses"}
          description={`${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? "s" : ""} • Total: ${formatCurrency(calculatedTotal, { showCents: true })}${projectId && filteredExpenses.some((e) => e.is_split && e.project_id !== projectId) ? " • Split expenses show allocation for this project" : ""}`}
          data={displayData}
          columns={columns}
          isLoading={false}
          selectedItems={selectedExpenses}
          onSelectItem={(itemId) => {
            // Only allow selection of parent expenses, not split rows
            const row = displayData.find((d) => d.id === itemId);
            if (!row?._isSplitRow) {
              handleSelectExpense(itemId);
            }
          }}
          onSelectAll={handleSelectAll}
          renderActions={renderActions}
          enablePagination={enablePagination}
          pageSize={pageSize}
          enableSorting={true}
          defaultSortColumn="expense_date"
          defaultSortDirection="desc"
          bulkActions={
            selectedExpenses.length > 0 ? (
              <ExpenseBulkActions
                selectedExpenseIds={selectedExpenses}
                onSelectionChange={(newSet) => setSelectedExpenses(Array.from(newSet))}
                onComplete={() => {
                  setSelectedExpenses([]);
                  onRefresh();
                }}
              />
            ) : null
          }
          emptyMessage="No expenses found. Add your first expense to get started."
          noResultsMessage="No expenses match your current filters."
        />

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
      </div>
    );
  },
);

ExpensesList.displayName = "ExpensesList";
