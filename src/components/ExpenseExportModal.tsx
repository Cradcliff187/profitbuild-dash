import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";

interface ExpenseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

interface ExportOptions {
  format: 'csv';
  includeProjectDetails: boolean;
  includePayeeDetails: boolean;
  includeSplitDetails: boolean;
  includeApprovalStatus: boolean;
  includeLineItemAllocation: boolean;
  filterCategory: string;
  filterTransactionType: string;
  filterApprovalStatus: string;
}

const EXPENSE_CATEGORY_DISPLAY: Record<string, string> = {
  materials: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  permits_fees: "Permits & Fees",
  other: "Other",
};

const TRANSACTION_TYPE_DISPLAY: Record<string, string> = {
  purchase: "Purchase",
  rental: "Rental",
  service: "Service",
  refund: "Refund",
  other: "Other",
};

export const ExpenseExportModal: React.FC<ExpenseExportModalProps> = ({
  isOpen,
  onClose,
  expenses
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [expenseSplits, setExpenseSplits] = useState<Record<string, any[]>>({});
  const [expenseMatches, setExpenseMatches] = useState<Record<string, any>>({});
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeProjectDetails: true,
    includePayeeDetails: true,
    includeSplitDetails: true,
    includeApprovalStatus: true,
    includeLineItemAllocation: true,
    filterCategory: 'all',
    filterTransactionType: 'all',
    filterApprovalStatus: 'all'
  });

  useEffect(() => {
    if (isOpen) {
      loadExpenseData();
    }
  }, [isOpen, expenses]);

  const loadExpenseData = async () => {
    try {
      // Load splits
      const { data: splitsData, error: splitsError } = await supabase
        .from("expense_splits")
        .select(`
          *,
          projects(project_name)
        `)
        .in('expense_id', expenses.map(e => e.id).filter(Boolean));

      if (splitsError) throw splitsError;

      const splits: Record<string, any[]> = {};
      (splitsData || []).forEach((split) => {
        if (!splits[split.expense_id]) {
          splits[split.expense_id] = [];
        }
        splits[split.expense_id].push({
          ...split,
          project_name: split.projects?.project_name,
        });
      });
      setExpenseSplits(splits);
    } catch (error) {
      console.error('Error loading expense data:', error);
    }
  };

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      if (exportOptions.filterCategory !== 'all' && expense.category !== exportOptions.filterCategory) {
        return false;
      }
      if (exportOptions.filterTransactionType !== 'all' && expense.transaction_type !== exportOptions.filterTransactionType) {
        return false;
      }
      if (exportOptions.filterApprovalStatus !== 'all' && expense.approval_status !== exportOptions.filterApprovalStatus) {
        return false;
      }
      return true;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const filteredExpenses = getFilteredExpenses();
      
      if (filteredExpenses.length === 0) {
        toast({
          title: "No data to export",
          description: "No expenses match the current filters.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      await exportToCSV(filteredExpenses);
      
      toast({
        title: "Export successful",
        description: `Successfully exported ${filteredExpenses.length} expenses`,
      });

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (filteredExpenses: Expense[]) => {
    // Build headers based on options
    const headers: string[] = ["Date"];

    if (exportOptions.includeProjectDetails) {
      headers.push("Project", "Project Assignment");
    }

    if (exportOptions.includePayeeDetails) {
      headers.push("Payee");
    }

    headers.push("Category", "Transaction Type", "Amount");

    if (exportOptions.includeApprovalStatus) {
      headers.push("Approval Status");
    }

    if (exportOptions.includeLineItemAllocation) {
      headers.push("Line Item Allocation");
    }

    if (exportOptions.includeSplitDetails) {
      headers.push("Is Split", "Split Type", "Split Notes");
    }

    // Build rows
    const csvRows: string[] = [];
    let totalRows = 0;

    for (const expense of filteredExpenses) {
      const splits = expenseSplits[expense.id] || [];
      const isSplitParent = expense.is_split && expense.project_number === "SYS-000";
      const isUnassigned = expense.project_number === "000-UNASSIGNED";
      const isPlaceholder = isUnassigned;

      // Skip split parent containers entirely in export
      if (isSplitParent) continue;

      // Build row data
      const row: string[] = [expense.expense_date.toLocaleDateString()];

      if (exportOptions.includeProjectDetails) {
        row.push(
          `"${expense.project_name || ""}"`,
          isPlaceholder ? "Needs Assignment" : "Assigned"
        );
      }

      if (exportOptions.includePayeeDetails) {
        row.push(`"${expense.payee_name || ""}"`);
      }

      row.push(
        `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
        `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
        expense.amount.toString()
      );

      if (exportOptions.includeApprovalStatus) {
        const status = (expense.approval_status || "pending").charAt(0).toUpperCase() +
          (expense.approval_status || "pending").slice(1);
        row.push(status);
      }

      if (exportOptions.includeLineItemAllocation) {
        const allocation = isPlaceholder
          ? "—"
          : expenseMatches[expense.id]?.matched
            ? `Allocated (${expenseMatches[expense.id].type})`
            : "Unallocated";
        row.push(allocation);
      }

      if (exportOptions.includeSplitDetails) {
        row.push(
          expense.is_split ? "Yes" : "No",
          expense.is_split ? "Parent" : "Single",
          ""
        );
      }

      csvRows.push(row.join(","));
      totalRows++;

      // If expense is split, add child split rows
      if (expense.is_split && expense.id && exportOptions.includeSplitDetails) {
        const splits = expenseSplits[expense.id] || [];
        for (const split of splits) {
          const splitRow: string[] = [expense.expense_date.toLocaleDateString()];

          if (exportOptions.includeProjectDetails) {
            splitRow.push(`"${split.project_name || ""}"`, "Split Allocation");
          }

          if (exportOptions.includePayeeDetails) {
            splitRow.push(`"${expense.payee_name || ""}"`);
          }

          splitRow.push(
            `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
            `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
            split.split_amount.toFixed(2)
          );

          if (exportOptions.includeApprovalStatus) {
            const status = (expense.approval_status || "pending").charAt(0).toUpperCase() +
              (expense.approval_status || "pending").slice(1);
            splitRow.push(status);
          }

          if (exportOptions.includeLineItemAllocation) {
            splitRow.push("—");
          }

          splitRow.push(
            "Yes",
            `Split (${split.split_percentage?.toFixed(1)}%)`,
            `"${split.notes || ""}"`
          );

          csvRows.push(splitRow.join(","));
          totalRows++;
        }
      }
    }

    // Convert to CSV
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredCount = getFilteredExpenses().length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Expenses</span>
          </SheetTitle>
          <SheetDescription>
            Configure export options and download expense data
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-4">
            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Export Summary:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Receipt className="h-3 w-3 mr-1" />
                  {filteredCount} of {expenses.length} expenses
                </Badge>
                {exportOptions.filterCategory !== 'all' && (
                  <Badge variant="secondary">Category: {EXPENSE_CATEGORY_DISPLAY[exportOptions.filterCategory]}</Badge>
                )}
                {exportOptions.filterTransactionType !== 'all' && (
                  <Badge variant="secondary">Type: {TRANSACTION_TYPE_DISPLAY[exportOptions.filterTransactionType]}</Badge>
                )}
                {exportOptions.filterApprovalStatus !== 'all' && (
                  <Badge variant="secondary">Status: {exportOptions.filterApprovalStatus}</Badge>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportOptions.format} onValueChange={(value) => updateOptions({ format: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Filter Expenses</label>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={exportOptions.filterCategory} onValueChange={(value) => updateOptions({ filterCategory: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Transaction Type</label>
                <Select value={exportOptions.filterTransactionType} onValueChange={(value) => updateOptions({ filterTransactionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Approval Status</label>
                <Select value={exportOptions.filterApprovalStatus} onValueChange={(value) => updateOptions({ filterApprovalStatus: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Include Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Include in Export</label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="projectDetails"
                    checked={exportOptions.includeProjectDetails}
                    onCheckedChange={(checked) => updateOptions({ includeProjectDetails: !!checked })}
                  />
                  <label htmlFor="projectDetails" className="text-sm cursor-pointer">Project Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="payeeDetails"
                    checked={exportOptions.includePayeeDetails}
                    onCheckedChange={(checked) => updateOptions({ includePayeeDetails: !!checked })}
                  />
                  <label htmlFor="payeeDetails" className="text-sm cursor-pointer">Payee Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="splitDetails"
                    checked={exportOptions.includeSplitDetails}
                    onCheckedChange={(checked) => updateOptions({ includeSplitDetails: !!checked })}
                  />
                  <label htmlFor="splitDetails" className="text-sm cursor-pointer">Split Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approvalStatus"
                    checked={exportOptions.includeApprovalStatus}
                    onCheckedChange={(checked) => updateOptions({ includeApprovalStatus: !!checked })}
                  />
                  <label htmlFor="approvalStatus" className="text-sm cursor-pointer">Approval Status</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lineItemAllocation"
                    checked={exportOptions.includeLineItemAllocation}
                    onCheckedChange={(checked) => updateOptions({ includeLineItemAllocation: !!checked })}
                  />
                  <label htmlFor="lineItemAllocation" className="text-sm cursor-pointer">Line Item Allocation</label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t flex space-x-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredCount === 0}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {filteredCount} Expenses
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

