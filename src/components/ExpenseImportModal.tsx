import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, CheckCircle2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseTransactionCSV, 
  processTransactionImport,
  createPayeeFromTransaction,
  TransactionCSVRow, 
  TransactionImportResult,
  ExpenseImportData,
  RevenueImportData,
  PendingPayeeReview,
  PendingClientReview,
} from '@/utils/enhancedTransactionImporter';
import { createExpenseKey, createRevenueKey, fuzzyMatchProject, suggestCategoryFromAccountName, PartialProject, ProjectAlias } from '@/utils/importCore';
import { ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionSelectionControls } from '@/components/import/TransactionSelectionControls';
import { TransactionSelectionTable, type CategorizedTransaction, type TransactionStatus } from '@/components/import/TransactionSelectionTable';

const AccountMappingsManagerLazy = lazy(() =>
  import('@/components/AccountMappingsManager').then(mod => ({ default: mod.AccountMappingsManager }))
);

interface StepperProps {
  currentStep: 'upload' | 'preview' | 'resolve_payees' | 'complete';
}

const ImportStepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 'upload', label: 'Upload', number: 1 },
    { id: 'preview', label: 'Review', number: 2 },
    { id: 'resolve_payees', label: 'Resolve Entities', number: 3 },
    { id: 'complete', label: 'Complete', number: 4 },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['upload', 'preview', 'resolve_payees', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  status === 'completed' && "bg-green-500 border-green-500 text-white",
                  status === 'current' && "bg-blue-500 border-blue-500 text-white",
                  status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                )}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 font-medium",
                  status === 'current' && "text-blue-600",
                  status === 'completed' && "text-green-600",
                  status === 'upcoming' && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-2 mb-5",
                  getStepStatus(steps[index + 1].id) !== 'upcoming'
                    ? "bg-green-500"
                    : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const FinancialSnapshot: React.FC<{
  expenses: { before: number; adding: number; after: number };
  revenues: { before: number; adding: number; after: number };
}> = ({ expenses, revenues }) => (
  <div className="grid grid-cols-2 gap-4">
    {/* Expenses Card */}
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <h4 className="font-medium text-gray-700">Expenses</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Current in system:</span>
          <span className="font-mono">{formatCurrency(expenses.before)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Adding:</span>
          <span className="font-mono">+{formatCurrency(expenses.adding)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
          <span>After import:</span>
          <span className="font-mono">{formatCurrency(expenses.after)}</span>
        </div>
      </div>
    </div>

    {/* Revenues Card */}
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        <h4 className="font-medium text-gray-700">Revenues</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Current in system:</span>
          <span className="font-mono">{formatCurrency(revenues.before)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Adding:</span>
          <span className="font-mono">+{formatCurrency(revenues.adding)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
          <span>After import:</span>
          <span className="font-mono">{formatCurrency(revenues.after)}</span>
        </div>
      </div>
    </div>
  </div>
);

interface ExpenseImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  estimates: any[];
}

export const ExpenseImportModal: React.FC<ExpenseImportModalProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  estimates 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<TransactionCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'resolve_payees' | 'complete'>('upload');
  const [pendingPayees, setPendingPayees] = useState<PendingPayeeReview[]>([]);
  const [payeeResolutions, setPayeeResolutions] = useState<Map<string, {
    action: 'create_new' | 'match_existing' | 'skip';
    matchedPayeeId?: string;
  }>>(new Map());
  const [pendingClients, setPendingClients] = useState<PendingClientReview[]>([]);
  const [clientResolutions, setClientResolutions] = useState<Map<string, {
    action: 'create_new' | 'match_existing' | 'skip';
    matchedClientId?: string;
  }>>(new Map());
  const [accountCategoryMappings, setAccountCategoryMappings] = useState<Map<string, ExpenseCategory>>(new Map());
  const [showMappingsManager, setShowMappingsManager] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'new' | 'duplicate' | 'unassigned'>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [processResult, setProcessResult] = useState<TransactionImportResult | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    expenses: ExpenseImportData[];
    revenues: RevenueImportData[];
    unassociated_expenses: number;
    unassociated_revenues: number;
    category_mappings_used: Record<string, string>;
    errors: string[];
    successCount: number;
    databaseDuplicatesSkipped?: number;
    inFileDuplicatesSkipped?: number;
    revenueDatabaseDuplicatesSkipped?: number;
    revenueInFileDuplicatesSkipped?: number;
    fuzzyMatches?: Array<{
      qbName: string;
      matchedPayee: any;
      confidence: number;
      matchType: 'exact' | 'fuzzy' | 'auto';
    }>;
    autoCreatedPayees?: Array<{
      qbName: string;
      payeeId: string;
      payeeType: any;
    }>;
    autoCreatedCount?: number;
    mappingStats?: {
      databaseMapped: number;
      staticMapped: number;
      descriptionMapped: number;
      unmapped: number;
    };
    unmappedAccounts?: Array<{
      accountFullName: string;
      transactionCount: number;
      totalAmount: number;
      suggestedCategory?: ExpenseCategory;
    }>;
    revenueReconciliation?: {
      totalExistingRevenues: number;
      totalDuplicateAmount: number;
      difference: number;
      isAligned: boolean;
      threshold: number;
    };
    reimportedDuplicateCount?: number;
    skippedNotSelectedCount?: number;
  } | null>(null);
  const [validationResults, setValidationResults] = useState<{
    matchedProjects: number;
    unmatchedProjects: number;
    matchedPayees: number;
    unmatchedPayees: number;
    unmatchedProjectNumbers: string[];
    unmatchedPayeeNames: string[];
    databaseDuplicatesSkipped?: number;
    databaseDuplicates?: Array<{
      transaction: TransactionCSVRow;
      existingExpenseId: string;
      matchKey: string;
    }>;
    inFileDuplicatesSkipped?: number;
    inFileDuplicates?: Array<{
      transaction: TransactionCSVRow;
      reason: string;
    }>;
    reconciliation?: {
      totalExistingNonLaborExpenses: number;
      totalDuplicateAmount: number;
      difference: number;
      isAligned: boolean;
      threshold: number;
    };
    revenueReconciliation?: {
      totalExistingRevenues: number;
      totalDuplicateAmount: number;
      difference: number;
      isAligned: boolean;
      threshold: number;
    };
    revenueDatabaseDuplicatesSkipped?: number;
    revenueDatabaseDuplicates?: Array<{
      transaction: TransactionCSVRow;
      existingRevenueId: string;
      matchKey: string;
    }>;
    revenueInFileDuplicatesSkipped?: number;
    revenueInFileDuplicates?: Array<{
      transaction: TransactionCSVRow;
      reason: string;
    }>;
  } | null>(null);
  const { toast } = useToast();

  // Build enriched CategorizedTransaction[] with status, matchKey, matchInfo for every row
  const allCategorized = useMemo((): CategorizedTransaction[] => {
    if (!csvData.length) return [];

    // Build duplicate index → matchKey map
    const duplicateIndexMap = new Map<number, { matchKey?: string; matchInfo?: string }>();

    if (validationResults) {
      // In-file duplicates (expenses)
      validationResults.inFileDuplicates?.forEach((d: any) => {
        const idx = csvData.findIndex(row =>
          row.Date === d.transaction.Date &&
          row.Amount === d.transaction.Amount &&
          row.Name === d.transaction.Name
        );
        if (idx >= 0) duplicateIndexMap.set(idx, { matchInfo: d.reason });
      });

      // Database duplicates (expenses)
      validationResults.databaseDuplicates?.forEach((d: any) => {
        const idx = csvData.findIndex(row =>
          row.Date === d.transaction.Date &&
          row.Amount === d.transaction.Amount &&
          row.Name === d.transaction.Name
        );
        if (idx >= 0) duplicateIndexMap.set(idx, { matchKey: d.matchKey, matchInfo: `Matches expense ${d.existingExpenseId?.slice(0, 8)}` });
      });

      // Database duplicates (revenues)
      validationResults.revenueDatabaseDuplicates?.forEach((d: any) => {
        const idx = csvData.findIndex(row =>
          row.Date === d.transaction.Date &&
          row.Amount === d.transaction.Amount &&
          row.Name === d.transaction.Name
        );
        if (idx >= 0) duplicateIndexMap.set(idx, { matchKey: d.matchKey, matchInfo: `Matches revenue ${d.existingRevenueId?.slice(0, 8)}` });
      });

      // Revenue in-file duplicates
      validationResults.revenueInFileDuplicates?.forEach((d: any) => {
        const idx = csvData.findIndex(row =>
          row.Date === d.transaction.Date &&
          row.Amount === d.transaction.Amount &&
          row.Name === d.transaction.Name
        );
        if (idx >= 0) duplicateIndexMap.set(idx, { matchInfo: d.reason });
      });
    }

    // Unassigned project set (from validation)
    const unmatchedProjectSet = new Set(
      (validationResults?.unmatchedProjectNumbers || []).map((n: string) => n.toLowerCase().trim())
    );

    return csvData.map((row, index): CategorizedTransaction => {
      const isDuplicate = duplicateIndexMap.has(index);
      const dupInfo = duplicateIndexMap.get(index);
      const amount = parseFloat(row['Amount']?.replace(/[,$()]/g, '') || '0');
      const date = row['Date'] || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const hasValidDate = date && !isNaN(new Date(date).getTime());
      const hasValidAmount = !isNaN(amount) && amount !== 0;

      // Determine status
      let status: TransactionStatus = 'new';
      if (!hasValidDate || !hasValidAmount) {
        status = 'error';
      } else if (isDuplicate) {
        status = 'duplicate';
      } else if (!projectWO || unmatchedProjectSet.has(projectWO.toLowerCase().trim())) {
        status = 'unassigned';
      }

      return {
        row,
        originalIndex: index,
        status,
        matchKey: dupInfo?.matchKey,
        matchInfo: dupInfo?.matchInfo,
      };
    });
  }, [csvData, validationResults]);

  // Derived convenience arrays for backward compat with the rest of the component
  const categorizeTransactions = useMemo(() => {
    const newRecords = allCategorized.filter(tx => tx.status === 'new' || tx.status === 'unassigned').map(tx => tx.row);
    const alreadyImported = allCategorized.filter(tx => tx.status === 'duplicate').map(tx => tx.row);
    const newExpenses = newRecords.filter(r => r['Transaction type'] !== 'Invoice');
    const newRevenues = newRecords.filter(r => r['Transaction type'] === 'Invoice');
    const existingExpenses = alreadyImported.filter(r => r['Transaction type'] !== 'Invoice');
    const existingRevenues = alreadyImported.filter(r => r['Transaction type'] === 'Invoice');

    return { newRecords, alreadyImported, newExpenses, newRevenues, existingExpenses, existingRevenues };
  }, [allCategorized]);

  // Calculate issues ONLY for new records (not duplicates)
  const newRecordIssues = useMemo(() => {
    if (!validationResults || !categorizeTransactions.newRecords.length) {
      return {
        unassignedProjects: 0,
        unassignedProjectNames: [] as string[],
        newPayees: 0,
        newPayeeNames: [] as string[],
        assignedProjects: 0,
        matchedPayees: 0,
      };
    }

    const newRecords = categorizeTransactions.newRecords;
    
    // Check project assignments for new records only
    // Use unmatched project numbers from validationResults and check if new records use them
    const unmatchedProjectNumbers = validationResults.unmatchedProjectNumbers || [];
    const unmatchedProjectSet = new Set(unmatchedProjectNumbers.map((n: string) => n.toLowerCase().trim()));
    
    const unassignedProjectNames = new Set<string>();
    let assignedCount = 0;
    let unassignedCount = 0;

    newRecords.forEach(record => {
      const projectNum = record['Project/WO #']?.trim();
      if (!projectNum) {
        unassignedCount++;
        unassignedProjectNames.add('(blank)');
      } else if (unmatchedProjectSet.has(projectNum.toLowerCase())) {
        unassignedCount++;
        unassignedProjectNames.add(projectNum);
      } else {
        assignedCount++;
      }
    });

    // Check payee assignments for new records only
    // Use unmatched payee names from validationResults and check if new records use them
    const unmatchedPayeeNames = validationResults.unmatchedPayeeNames || [];
    const unmatchedPayeeSet = new Set(unmatchedPayeeNames.map((n: string) => n.toLowerCase().trim()));

    const newPayeeNames = new Set<string>();
    let matchedPayeeCount = 0;
    let newPayeeCount = 0;

    newRecords.forEach(record => {
      const name = record.Name?.trim();
      if (!name) {
        // No payee specified - skip for payee matching
      } else if (unmatchedPayeeSet.has(name.toLowerCase())) {
        newPayeeCount++;
        newPayeeNames.add(name);
      } else {
        matchedPayeeCount++;
      }
    });

    return {
      unassignedProjects: unassignedCount,
      unassignedProjectNames: Array.from(unassignedProjectNames),
      newPayees: newPayeeCount,
      newPayeeNames: Array.from(newPayeeNames),
      assignedProjects: assignedCount,
      matchedPayees: matchedPayeeCount,
    };
  }, [validationResults, categorizeTransactions.newRecords]);

  // Calculate financial before/after snapshot
  const financialSnapshot = useMemo(() => {
    if (!validationResults || !categorizeTransactions.newRecords.length) {
      return null;
    }

    // Current system totals (from reconciliation data)
    const currentExpenseTotal = validationResults.reconciliation?.totalExistingNonLaborExpenses || 0;
    const currentRevenueTotal = validationResults.revenueReconciliation?.totalExistingRevenues || 0;

    // New amounts being added
    const newExpenseAmount = categorizeTransactions.newExpenses.reduce((sum, row) => {
      const amount = parseFloat(String(row.Amount).replace(/[,$()]/g, '')) || 0;
      return sum + Math.abs(amount);
    }, 0);

    const newRevenueAmount = categorizeTransactions.newRevenues.reduce((sum, row) => {
      const amount = parseFloat(String(row.Amount).replace(/[,$()]/g, '')) || 0;
      return sum + Math.abs(amount);
    }, 0);

    return {
      expenses: {
        before: currentExpenseTotal,
        adding: newExpenseAmount,
        after: currentExpenseTotal + newExpenseAmount,
      },
      revenues: {
        before: currentRevenueTotal,
        adding: newRevenueAmount,
        after: currentRevenueTotal + newRevenueAmount,
      },
    };
  }, [validationResults, categorizeTransactions]);

  // Initialize selection: new/unassigned = checked, duplicate/error = unchecked
  useEffect(() => {
    if (allCategorized.length > 0) {
      const initial = new Set<number>();
      allCategorized.forEach(tx => {
        if (tx.status === 'new' || tx.status === 'unassigned') {
          initial.add(tx.originalIndex);
        }
      });
      setSelectedRows(initial);
    }
  }, [allCategorized]);

  // Bulk action handlers
  const selectAllNew = useCallback(() => {
    const next = new Set(selectedRows);
    allCategorized.forEach(tx => {
      if (tx.status === 'new') next.add(tx.originalIndex);
    });
    setSelectedRows(next);
  }, [selectedRows, allCategorized]);

  const selectAllDuplicates = useCallback(() => {
    const next = new Set(selectedRows);
    allCategorized.forEach(tx => {
      if (tx.status === 'duplicate') next.add(tx.originalIndex);
    });
    setSelectedRows(next);
  }, [selectedRows, allCategorized]);

  const selectAll = useCallback(() => {
    const next = new Set<number>();
    allCategorized.forEach(tx => {
      if (tx.status !== 'error') next.add(tx.originalIndex);
    });
    setSelectedRows(next);
  }, [allCategorized]);

  const deselectAll = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  // Selection counts
  const selectionCounts = useMemo(() => {
    const totalNew = allCategorized.filter(tx => tx.status === 'new').length;
    const totalDuplicates = allCategorized.filter(tx => tx.status === 'duplicate').length;
    const totalErrors = allCategorized.filter(tx => tx.status === 'error').length;
    const totalUnassigned = allCategorized.filter(tx => tx.status === 'unassigned').length;
    const totalSelectable = allCategorized.filter(tx => tx.status !== 'error').length;
    const selectedDuplicateCount = allCategorized.filter(tx => tx.status === 'duplicate' && selectedRows.has(tx.originalIndex)).length;
    return { totalNew, totalDuplicates, totalErrors, totalUnassigned, totalSelectable, selectedDuplicateCount };
  }, [allCategorized, selectedRows]);

  const resetState = () => {
    setSelectedFile(null);
    setCsvData([]);
    setHeaders([]);
    setErrors([]);
    setIsUploading(false);
    setIsImporting(false);
    setStep('upload');
    setImportResults(null);
    setValidationResults(null);
    setPendingPayees([]);
    setPayeeResolutions(new Map());
    setPendingClients([]);
    setClientResolutions(new Map());
    setAccountCategoryMappings(new Map());
    setSelectedRows(new Set());
    setTxStatusFilter('all');
    setTxSearchQuery('');
    setProcessResult(null);
    setCurrentBatchId(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateMatches = async (data: TransactionCSVRow[]) => {
    // Safe date parser — returns '' instead of throwing on invalid dates
    const safeDateISO = (dateStr: string | undefined): string => {
      if (!dateStr || !dateStr.trim()) return '';
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    // Fetch all projects, payees, and aliases for matching
    const [{ data: projects }, { data: payees }, { data: projectAliasData }] = await Promise.all([
      supabase.from('projects').select('project_number, project_name, id'),
      supabase.from('payees').select('payee_name, full_name, id'),
      supabase.from('project_aliases').select('*').eq('is_active', true)
    ]);
    
    const partialProjects = (projects || []).map(p => ({
      id: p.id,
      project_number: p.project_number,
      project_name: p.project_name || ''
    }));
    const projectAliases = (projectAliasData || []).map((a: any) => ({
      id: a.id,
      project_id: a.project_id,
      alias: a.alias,
      match_type: a.match_type as 'exact' | 'starts_with' | 'contains',
      is_active: a.is_active
    }));
    
    const payeeNames = new Set(payees?.flatMap(p => [
      p.payee_name.toLowerCase().trim(),
      ...(p.full_name ? [p.full_name.toLowerCase().trim()] : [])
    ]) || []);
    
    let matchedProjects = 0;
    let unmatchedProjects = 0;
    let matchedPayees = 0;
    let unmatchedPayees = 0;
    const unmatchedProjectNumbers = new Set<string>();
    const unmatchedPayeeNames = new Set<string>();
    
    // === Check for in-file duplicates ===
    const seenInFile = new Map<string, TransactionCSVRow>();
    const inFileDuplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
    
    data.forEach(row => {
      // Only check expenses for duplicates (not invoices/revenues)
      if (row['Transaction type']?.toLowerCase() === 'invoice') {
        return;
      }
      
      const date = safeDateISO(row['Date']);
      const amount = parseFloat(row['Amount']?.replace(/[,$()]/g, '') || '0');
      const name = row['Name']?.trim() || '';
      
      // Use shared key function for consistency
      const key = createExpenseKey(date, amount, name);
      
      if (seenInFile.has(key)) {
        const firstOccurrence = seenInFile.get(key)!;
        inFileDuplicates.push({
          transaction: row,
          reason: `Duplicate of: ${firstOccurrence['Name']} on ${firstOccurrence['Date']}`
        });
      } else {
        seenInFile.set(key, row);
      }
    });
    // === END in-file duplicate detection ===
    
    // Check for database duplicates
    const dates = data
      .map(row => row['Date'])
      .filter(d => d && d.trim() !== '')
      .map(d => {
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter((d): d is Date => d !== null);
    
    let existingExpenses = new Map<string, { id: string; description: string }>();
    const databaseDuplicates: Array<{
      transaction: TransactionCSVRow;
      existingExpenseId: string;
      matchKey: string;
    }> = [];
    
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Add buffer days to catch edge cases
      minDate.setDate(minDate.getDate() - 1);
      maxDate.setDate(maxDate.getDate() + 1);
      
      const { data: existingExpensesData, error } = await supabase
        .from('expenses')
        .select(`
          id, 
          expense_date, 
          amount, 
          payee_id, 
          description,
          is_split,
          payees!expenses_payee_id_fkey (
            payee_name
          )
        `)
        .gte('expense_date', minDate.toISOString().split('T')[0])
        .lte('expense_date', maxDate.toISOString().split('T')[0]);
      
      if (!error && existingExpensesData) {
        for (const expense of existingExpensesData) {
          // ALWAYS extract from description first (matches CSV format)
          let extractedName = '';
          if (expense.description) {
            // Extract name from description pattern "transaction_type - Name (Unassigned)"
            // Also handle case where name is empty: "expense - " or "expense -  (Unassigned)"
            const descMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*(.+?)(?:\s*\(|$)/i);
            if (descMatch) {
              let extracted = descMatch[1].trim();
              // Remove "(Unassigned)" or any other parenthetical suffixes
              extracted = extracted.replace(/\s*\([^)]*\)\s*/g, '').trim();
              // If extracted is empty or just whitespace, treat as empty name
              extractedName = extracted || '';
            } else {
              // If pattern doesn't match at all, check if it's just "transaction_type - " (empty name case)
              const emptyNameMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*$/i);
              if (emptyNameMatch) {
                extractedName = ''; // Explicitly empty name
              }
            }
          }
          
          // Use payee name as fallback if extraction failed AND description is truly empty
          // Don't use payee name if description exists but name is empty (that's a valid empty name case)
          const payeeName = (expense.payees as any)?.payee_name || '';
          if (!extractedName && payeeName && (!expense.description || expense.description.trim() === '')) {
            extractedName = payeeName;
          }
          
          // Normalize date to ISO format (YYYY-MM-DD) to match CSV date format
          const normalizedDate = expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '';
          
          // Primary key: date|amount|name (using extracted name - matches CSV format)
          const primaryKey = createExpenseKey(normalizedDate, expense.amount, extractedName);
          existingExpenses.set(primaryKey, { 
            id: expense.id, 
            description: expense.description || '' 
          });
          
          // ALWAYS create key with payee name (not just when different)
          // This handles cases where CSV Name is empty but DB has payee_name
          if (payeeName) {
            const payeeKey = createExpenseKey(normalizedDate, expense.amount, payeeName);
            // Only set if different from primary key to avoid overwriting
            if (payeeKey !== primaryKey) {
              existingExpenses.set(payeeKey, { 
                id: expense.id, 
                description: expense.description || '' 
              });
            }
          }
          
          // Create key with empty name for expenses with empty names (regardless of description format)
          const looksAutoGenerated = extractedName && /no vendor|no payee|unassigned|unknown/i.test(extractedName);
          const shouldCreateEmptyKey = 
            !expense.description || 
            expense.description.trim() === '' ||
            expense.description.match(/^(?:bill|check|expense)\s*-\s*$/i) !== null ||
            (extractedName === '' && expense.description.match(/^(?:bill|check|expense)\s*-\s*(?:\s*\(|$)/i) !== null) ||
            looksAutoGenerated;
          
          if (shouldCreateEmptyKey) {
            const emptyKey = createExpenseKey(normalizedDate, expense.amount, '');
            // Only set if different from primary key to avoid overwriting
            if (emptyKey !== primaryKey) {
              existingExpenses.set(emptyKey, { 
                id: expense.id, 
                description: expense.description || '' 
              });
            }
          }
        }
      }
    }
    
    data.forEach(row => {
      const projectWO = row['Project/WO #']?.trim() || '';
      const name = row['Name']?.trim().toLowerCase();
      
      // Check project match using fuzzy matching with aliases
      if (projectWO) {
        const projectMatch = fuzzyMatchProject(projectWO, partialProjects, projectAliases);
        
        if (projectMatch) {
          matchedProjects++;
        } else {
          unmatchedProjects++;
          unmatchedProjectNumbers.add(row['Project/WO #']?.trim() || '');
        }
      } else {
        unmatchedProjects++;
      }
      
      // Check payee match (only for non-invoice transactions)
      if (row['Transaction type'] !== 'Invoice' && name) {
        if (payeeNames.has(name)) {
          matchedPayees++;
        } else {
          unmatchedPayees++;
          unmatchedPayeeNames.add(row['Name']?.trim() || '');
        }
      }
      
      // Check for database duplicate (only for expenses, not invoices)
      if (row['Transaction type'] !== 'Invoice') {
        const date = safeDateISO(row['Date']);
        const amount = parseFloat(row['Amount']?.replace(/[,$()]/g, '') || '0');
        const rowName = row['Name']?.trim() || '';
        
        // Try multiple matching strategies to handle empty names and mismatches
        let existingExpense: { id: string; description: string } | undefined;
        let matchKey = '';
        
        // Strategy 1: Primary key with CSV Name (exact match)
        const primaryKey = createExpenseKey(date, amount, rowName);
        existingExpense = existingExpenses.get(primaryKey);
        if (existingExpense) {
          matchKey = primaryKey;
        } else {
          // Strategy 2: If CSV Name is empty, try empty name key
          if (!rowName) {
            const emptyKey = createExpenseKey(date, amount, '');
            existingExpense = existingExpenses.get(emptyKey);
            if (existingExpense) {
              matchKey = emptyKey;
            }
          }
        }
        
        if (existingExpense) {
          databaseDuplicates.push({
            transaction: row,
            existingExpenseId: existingExpense.id,
            matchKey: matchKey || primaryKey
          });
        }
      }
    });
    
    // === Calculate reconciliation ===
    // Get unique expense IDs from database duplicates (in-file duplicates don't have existingExpenseId)
    const expenseIds = databaseDuplicates
      .map(dup => dup.existingExpenseId)
      .filter((id): id is string => !!id)
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
    
    let reconciliation = {
      totalExistingNonLaborExpenses: 0,
      totalDuplicateAmount: 0,
      difference: 0,
      isAligned: true,
      threshold: 0.01
    };
    
    if (expenseIds.length > 0 || databaseDuplicates.length > 0 || inFileDuplicates.length > 0) {
      // Query database for the specific expenses that match the duplicates
      let totalExistingNonLaborExpenses = 0;
      if (expenseIds.length > 0) {
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('id, amount, category')
          .in('id', expenseIds)
          .neq('category', ExpenseCategory.LABOR)
          .eq('is_split', false);
        
        if (!expensesError && expensesData) {
          totalExistingNonLaborExpenses = expensesData.reduce((sum, exp) => sum + Math.abs(exp.amount || 0), 0);
        }
      }
      
      // Sum amounts from all duplicate transactions (both in-file and database duplicates)
      let totalDuplicateAmount = 0;
      for (const dup of [...databaseDuplicates, ...inFileDuplicates]) {
        const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$()]/g, '') || '0');
        totalDuplicateAmount += Math.abs(amount);
      }
      
      const difference = Math.abs(totalExistingNonLaborExpenses - totalDuplicateAmount);
      const isAligned = difference <= reconciliation.threshold;
      
      reconciliation = {
        totalExistingNonLaborExpenses,
        totalDuplicateAmount,
        difference,
        isAligned,
        threshold: reconciliation.threshold
      };
    }
    // === END reconciliation calculation ===
    
    // === Revenue in-file duplicate detection ===
    const revenueSeenInFile = new Map<string, TransactionCSVRow>();
    const revenueInFileDuplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
    
    data.forEach(row => {
      // Only check invoices/revenues for duplicates
      if (row['Transaction type']?.toLowerCase() !== 'invoice') {
        return;
      }
      
      const date = safeDateISO(row['Date']);
      const amount = parseFloat(row['Amount']?.replace(/[,$()]/g, '') || '0');
      const invoiceNumber = row['Invoice #']?.trim() || '';
      const name = row['Name']?.trim() || '';
      
      // Use shared key function for consistency
      const key = createRevenueKey(amount, date, invoiceNumber, name);
      
      if (revenueSeenInFile.has(key)) {
        const firstOccurrence = revenueSeenInFile.get(key)!;
        revenueInFileDuplicates.push({
          transaction: row,
          reason: `Duplicate revenue: ${firstOccurrence['Name']} on ${firstOccurrence['Date']}`
        });
      } else {
        revenueSeenInFile.set(key, row);
      }
    });
    // === END revenue in-file duplicate detection ===
    
    // === Revenue database duplicate detection ===
    let existingRevenues = new Map<string, { id: string; description: string }>();
    const revenueDatabaseDuplicates: Array<{
      transaction: TransactionCSVRow;
      existingRevenueId: string;
      matchKey: string;
    }> = [];
    
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      minDate.setDate(minDate.getDate() - 1);
      maxDate.setDate(maxDate.getDate() + 1);
      
      const { data: existingRevenuesData, error: revenuesError } = await supabase
        .from('project_revenues')
        .select(`
          id, 
          invoice_date, 
          amount, 
          invoice_number, 
          description,
          clients!project_revenues_client_id_fkey (
            client_name
          )
        `)
        .gte('invoice_date', minDate.toISOString().split('T')[0])
        .lte('invoice_date', maxDate.toISOString().split('T')[0]);
      
      if (!revenuesError && existingRevenuesData) {
        for (const revenue of existingRevenuesData) {
          const clientName = (revenue.clients as any)?.client_name || '';
          
          // Extract name from description as fallback
          const descMatch = revenue.description?.match(/^Invoice from\s+(.+?)(?:\s*\(|$)/i);
          const extractedName = descMatch ? descMatch[1].trim() : clientName;
          
          const key = createRevenueKey(revenue.amount, revenue.invoice_date, revenue.invoice_number || '', extractedName);
          existingRevenues.set(key, { 
            id: revenue.id, 
            description: revenue.description || '' 
          });
        }
      }
      
      // Check for revenue database duplicates
      data.forEach(row => {
        if (row['Transaction type']?.toLowerCase() !== 'invoice') {
          return;
        }
        
        const date = safeDateISO(row['Date']);
        const amount = parseFloat(row['Amount']?.replace(/[,$()]/g, '') || '0');
        const invoiceNumber = row['Invoice #']?.trim() || '';
        const name = row['Name']?.trim() || '';
        
        // Use shared key function for consistency
        const key = createRevenueKey(amount, date, invoiceNumber, name);
        const existingRevenue = existingRevenues.get(key);
        
        if (existingRevenue) {
          revenueDatabaseDuplicates.push({
            transaction: row,
            existingRevenueId: existingRevenue.id,
            matchKey: key
          });
        }
      });
    }
    // === END revenue database duplicate detection ===
    
    // === Calculate revenue reconciliation ===
    const revenueIds = revenueDatabaseDuplicates
      .map(dup => dup.existingRevenueId)
      .filter((id): id is string => !!id)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    let revenueReconciliation = {
      totalExistingRevenues: 0,
      totalDuplicateAmount: 0,
      difference: 0,
      isAligned: true,
      threshold: 0.01
    };
    
    if (revenueIds.length > 0 || revenueDatabaseDuplicates.length > 0 || revenueInFileDuplicates.length > 0) {
      let totalExistingRevenues = 0;
      if (revenueIds.length > 0) {
        const { data: revenuesData, error: revenuesError } = await supabase
          .from('project_revenues')
          .select('id, amount')
          .in('id', revenueIds);
        
        if (!revenuesError && revenuesData) {
          totalExistingRevenues = revenuesData.reduce((sum, rev) => sum + Math.abs(rev.amount || 0), 0);
        }
      }
      
      let totalDuplicateAmount = 0;
      for (const dup of [...revenueDatabaseDuplicates, ...revenueInFileDuplicates]) {
        const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$()]/g, '') || '0');
        totalDuplicateAmount += Math.abs(amount);
      }
      
      const difference = Math.abs(totalExistingRevenues - totalDuplicateAmount);
      const isAligned = difference <= revenueReconciliation.threshold;
      
      revenueReconciliation = {
        totalExistingRevenues,
        totalDuplicateAmount,
        difference,
        isAligned,
        threshold: revenueReconciliation.threshold
      };
    }
    // === END revenue reconciliation calculation ===
    
    return {
      matchedProjects,
      unmatchedProjects,
      matchedPayees,
      unmatchedPayees,
      unmatchedProjectNumbers: Array.from(unmatchedProjectNumbers),
      unmatchedPayeeNames: Array.from(unmatchedPayeeNames),
      databaseDuplicatesSkipped: databaseDuplicates.length,
      databaseDuplicates,
      inFileDuplicatesSkipped: inFileDuplicates.length,
      inFileDuplicates,
      reconciliation,
      revenueReconciliation,
      revenueDatabaseDuplicatesSkipped: revenueDatabaseDuplicates.length,
      revenueDatabaseDuplicates,
      revenueInFileDuplicatesSkipped: revenueInFileDuplicates.length,
      revenueInFileDuplicates
    };
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setSelectedFile(file);
    setErrors([]);
    
    try {
      const result = await parseTransactionCSV(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setCsvData(result.data);
        setHeaders(result.headers);
        
        // Run validation to check matches
        const validation = await validateMatches(result.data);
        setValidationResults(validation);
        
        setStep('preview');
        setErrors([]);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      setErrors([`Failed to parse CSV file: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(f => f.name.endsWith('.csv') || f.type === 'text/csv');
    
    if (csvFile) {
      handleFileSelect(csvFile);
    } else {
      setErrors(['Please select a CSV file']);
    }
  }, []);

  /**
   * Step 1: Process the CSV and decide whether to show payee resolution or import directly
   */
  const handleProcessCSV = async () => {
    if (!csvData.length || selectedRows.size === 0) return;

    setIsImporting(true);
    
    try {
      // Filter to selected rows only
      const selectedData = csvData.filter((_, index) => selectedRows.has(index));

      // Build overrideDedup set from selected duplicate rows
      const overrideKeys = new Set<string>();
      allCategorized.forEach(tx => {
        if (tx.status === 'duplicate' && selectedRows.has(tx.originalIndex) && tx.matchKey) {
          overrideKeys.add(tx.matchKey);
        }
      });

      // Create import batch record
      const { data: userData } = await supabase.auth.getUser();
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert([{
          file_name: selectedFile?.name || 'unknown.csv',
          imported_by: userData.user?.id,
          total_rows: selectedData.length,
          status: 'processing'
        }])
        .select('id')
        .single();

      if (batchError || !batch) {
        throw new Error(`Failed to create import batch: ${batchError?.message}`);
      }

      setCurrentBatchId(batch.id);
      const result = await processTransactionImport(selectedData, batch.id, {
        overrideDedup: overrideKeys.size > 0 ? overrideKeys : undefined
      });

      // Check if there are unmatched payees or clients that need user review
      const hasUnmatchedPayees = result.pendingPayeeReviews.length > 0;
      const hasUnmatchedClients = result.pendingClientReviews.length > 0;
      
      if (hasUnmatchedPayees || hasUnmatchedClients) {
        setProcessResult(result);
        
        if (hasUnmatchedPayees) {
          setPendingPayees(result.pendingPayeeReviews);
          const initialResolutions = new Map<string, { action: 'create_new' | 'match_existing' | 'skip'; matchedPayeeId?: string }>();
          result.pendingPayeeReviews.forEach(review => {
            initialResolutions.set(review.qbName, { action: 'create_new' });
          });
          setPayeeResolutions(initialResolutions);
        }
        
        if (hasUnmatchedClients) {
          setPendingClients(result.pendingClientReviews);
          const initialClientResolutions = new Map<string, { action: 'create_new' | 'match_existing' | 'skip'; matchedClientId?: string }>();
          result.pendingClientReviews.forEach(review => {
            initialClientResolutions.set(review.qbName, { action: 'skip' });
          });
          setClientResolutions(initialClientResolutions);
        }
        
        setStep('resolve_payees');
      } else {
        // No pending payees or clients — proceed directly to final import
        await handleFinalImport(result, batch.id);
      }
    } catch (error) {
      console.error('Import processing failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to process transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Step 2: Apply payee resolutions, insert expenses/revenues, finalize batch
   */
  const handleFinalImport = async (result?: TransactionImportResult, batchId?: string) => {
    const theResult = result || processResult;
    const theBatchId = batchId || currentBatchId;
    
    if (!theResult) return;

    setIsImporting(true);

    try {
      // Build a map of qbName -> payee_id from resolutions
      const resolvedPayeeMap = new Map<string, string>();
      const createdPayees: Array<{ qbName: string; payeeId: string; payeeType: string }> = [];

      for (const [qbName, resolution] of payeeResolutions.entries()) {
        if (resolution.action === 'create_new') {
          const review = pendingPayees.find(p => p.qbName === qbName);
          const createdId = await createPayeeFromTransaction(qbName, review?.accountFullName);
          if (createdId) {
            resolvedPayeeMap.set(qbName, createdId);
            createdPayees.push({
              qbName,
              payeeId: createdId,
              payeeType: review?.suggestedPayeeType || 'other',
            });
          }
        } else if (resolution.action === 'match_existing' && resolution.matchedPayeeId) {
          resolvedPayeeMap.set(qbName, resolution.matchedPayeeId);
        }
        // 'skip' — leave payee_id undefined
      }

      // Apply resolved payee_ids to expenses
      for (const expense of theResult.expenses) {
        if (!expense.payee_id) {
          // Extract the name portion from description "type - Name (Unassigned)"
          const descMatch = expense.description.match(/^.+?\s*-\s*(.+?)(?:\s*\(|$)/i);
          const expenseName = descMatch ? descMatch[1].trim() : '';
          const resolvedId = resolvedPayeeMap.get(expenseName);
          if (resolvedId) {
            expense.payee_id = resolvedId;
          }
        }
      }

      // Insert expenses
      let expenseSuccessCount = 0;
      let revenueSuccessCount = 0;
      const errorMessages: string[] = [...theResult.errors];

      if (theResult.expenses.length > 0) {
        for (const expense of theResult.expenses) {
          try {
            const { error } = await supabase
              .from('expenses')
              .insert([expense]);

            if (error) {
              errorMessages.push(`Failed to import expense "${expense.description}": ${error.message}`);
            } else {
              expenseSuccessCount++;
            }
          } catch (err) {
            errorMessages.push(`Failed to import expense "${expense.description}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      // Insert revenues
      if (theResult.revenues.length > 0) {
        for (const revenue of theResult.revenues) {
          try {
            const { error } = await supabase
              .from('project_revenues')
              .insert([revenue]);

            if (error) {
              errorMessages.push(`Failed to import revenue "${revenue.description}": ${error.message}`);
            } else {
              revenueSuccessCount++;
            }
          } catch (err) {
            errorMessages.push(`Failed to import revenue "${revenue.description}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      // Update batch record with final stats
      const successCount = expenseSuccessCount + revenueSuccessCount;
      const duplicatesSkipped = (theResult.databaseDuplicatesSkipped || 0) + 
                                (theResult.inFileDuplicatesSkipped || 0) + 
                                (theResult.revenueDatabaseDuplicatesSkipped || 0) + 
                                (theResult.revenueInFileDuplicatesSkipped || 0);
      
      if (theBatchId) {
        await supabase
          .from('import_batches')
          .update({
            expenses_imported: expenseSuccessCount,
            revenues_imported: revenueSuccessCount,
            duplicates_skipped: duplicatesSkipped,
            errors: errorMessages.length,
            status: 'completed',
            match_log: theResult.matchLog || []
          })
          .eq('id', theBatchId);
      }

      const finalResults = {
        expenses: theResult.expenses,
        revenues: theResult.revenues,
        unassociated_expenses: theResult.unassociated_expenses,
        unassociated_revenues: theResult.unassociated_revenues,
        category_mappings_used: theResult.category_mappings_used,
        errors: errorMessages,
        successCount,
        databaseDuplicatesSkipped: theResult.databaseDuplicatesSkipped,
        inFileDuplicatesSkipped: theResult.inFileDuplicatesSkipped,
        revenueDatabaseDuplicatesSkipped: theResult.revenueDatabaseDuplicatesSkipped,
        revenueInFileDuplicatesSkipped: theResult.revenueInFileDuplicatesSkipped,
        fuzzyMatches: theResult.fuzzyMatches,
        autoCreatedPayees: createdPayees.map(p => ({
          qbName: p.qbName,
          payeeId: p.payeeId,
          payeeType: p.payeeType as any,
        })),
        autoCreatedCount: createdPayees.length,
        mappingStats: theResult.mappingStats,
        unmappedAccounts: theResult.unmappedAccounts,
        revenueReconciliation: theResult.revenueReconciliation,
        reimportedDuplicateCount: theResult.reimportedDuplicates?.length || 0,
        skippedNotSelectedCount: csvData.length - selectedRows.size,
      };

      setImportResults(finalResults);
      setStep('complete');

      if (successCount > 0) {
        const duplicateInfo = [];
        if (finalResults.databaseDuplicatesSkipped && finalResults.databaseDuplicatesSkipped > 0) {
          duplicateInfo.push(`${finalResults.databaseDuplicatesSkipped} expense database duplicate(s)`);
        }
        if (finalResults.inFileDuplicatesSkipped && finalResults.inFileDuplicatesSkipped > 0) {
          duplicateInfo.push(`${finalResults.inFileDuplicatesSkipped} expense in-file duplicate(s)`);
        }
        if (finalResults.revenueDatabaseDuplicatesSkipped && finalResults.revenueDatabaseDuplicatesSkipped > 0) {
          duplicateInfo.push(`${finalResults.revenueDatabaseDuplicatesSkipped} revenue database duplicate(s)`);
        }
        if (finalResults.revenueInFileDuplicatesSkipped && finalResults.revenueInFileDuplicatesSkipped > 0) {
          duplicateInfo.push(`${finalResults.revenueInFileDuplicatesSkipped} revenue in-file duplicate(s)`);
        }
        const duplicateText = duplicateInfo.length > 0 ? ` Skipped ${duplicateInfo.join(', ')}.` : '';
        const reimportText = (finalResults.reimportedDuplicateCount || 0) > 0
          ? ` Re-imported ${finalResults.reimportedDuplicateCount} duplicate(s).`
          : '';
        const createdText = createdPayees.length > 0 
          ? ` Created ${createdPayees.length} payee(s).` 
          : '';
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} transaction${successCount === 1 ? '' : 's'}.${reimportText}${duplicateText}${createdText}${errorMessages.length > 0 ? ` ${errorMessages.length} failed.` : ''}`,
          variant: errorMessages.length > 0 ? "destructive" : "default"
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to import transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const previewData = csvData.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription className="sr-only">
            Upload and review a QuickBooks CSV file to import transactions
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">

        {step === 'upload' && (
          <div className="space-y-4">
            <ImportStepper currentStep={step} />
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => document.getElementById('expense-csv-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Drop your QuickBooks YTD export here
              </p>
              <p className="text-sm text-gray-500 mt-2">
                We'll automatically detect which transactions are new
              </p>
              <input
                id="expense-csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
            
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span className="text-gray-400">({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
            
            {isUploading && (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Analyzing transactions...</p>
              </div>
            )}

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col h-[calc(90vh-120px)]">
            {/* Stepper */}
            <ImportStepper currentStep={step} />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              
              {/* Main Summary Card - The Key Message */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">YTD Import Summary</h3>
                    <p className="text-sm text-blue-600 mt-1">
                      {csvData.length} transactions in file
                    </p>
                  </div>
                </div>
                
                {/* The Breakdown - Visual Flow */}
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <div className="bg-white rounded-lg px-4 py-3 border border-blue-200 text-center min-w-[100px]">
                    <div className="text-2xl font-bold text-gray-400">{categorizeTransactions.alreadyImported.length}</div>
                    <div className="text-gray-500 text-xs">Already Imported</div>
                  </div>
                  
                  <div className="text-gray-400 text-xl">→</div>
                  
                  <div className="bg-white rounded-lg px-4 py-3 border-2 border-green-400 text-center min-w-[100px] shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{categorizeTransactions.newRecords.length}</div>
                    <div className="text-green-700 text-xs font-medium">New to Import</div>
                  </div>
                  
                  <div className="ml-auto flex gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{categorizeTransactions.newExpenses.length}</div>
                      <div className="text-blue-600 text-xs">Expenses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-emerald-600">{categorizeTransactions.newRevenues.length}</div>
                      <div className="text-emerald-600 text-xs">Revenues</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Records Status - Only show if there ARE new records */}
              {categorizeTransactions.newRecords.length > 0 && (
                <div className={cn(
                  "rounded-lg border p-4",
                  newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                )}>
                  <h4 className={cn(
                    "font-medium mb-3 flex items-center gap-2",
                    newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0
                      ? "text-green-800"
                      : "text-amber-800"
                  )}>
                    {newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0 ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        All {categorizeTransactions.newRecords.length} new records ready to import
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5" />
                        New Records Summary
                      </>
                    )}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Project Assignment Status */}
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Project Assignment</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{newRecordIssues.assignedProjects} assigned to projects</span>
                      </div>
                      {newRecordIssues.unassignedProjects > 0 && (
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle className="h-4 w-4" />
                          <span>{newRecordIssues.unassignedProjects} → 000-UNASSIGNED</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Payee Status */}
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Payee Status</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{newRecordIssues.matchedPayees} matched to existing</span>
                      </div>
                      {newRecordIssues.newPayees > 0 && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Info className="h-4 w-4" />
                          <span>{newRecordIssues.newPayees} will need review</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {(newRecordIssues.unassignedProjects > 0 || newRecordIssues.newPayees > 0) && (
                    <Collapsible className="mt-3">
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        <ChevronRight className="h-3 w-3" />
                        View details
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 text-xs space-y-2">
                        {newRecordIssues.unassignedProjects > 0 && (
                          <div>
                            <span className="font-medium">Unassigned project codes: </span>
                            <span className="text-gray-600">
                              {newRecordIssues.unassignedProjectNames.slice(0, 5).join(', ')}
                              {newRecordIssues.unassignedProjectNames.length > 5 && 
                                ` +${newRecordIssues.unassignedProjectNames.length - 5} more`}
                            </span>
                          </div>
                        )}
                        {newRecordIssues.newPayees > 0 && (
                          <div>
                            <span className="font-medium">New payees: </span>
                            <span className="text-gray-600">
                              {newRecordIssues.newPayeeNames.slice(0, 5).join(', ')}
                              {newRecordIssues.newPayeeNames.length > 5 && 
                                ` +${newRecordIssues.newPayeeNames.length - 5} more`}
                            </span>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}

              {/* Unmatched Projects Warning */}
              {validationResults && validationResults.unmatchedProjectNumbers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-amber-800">
                      {validationResults.unmatchedProjectNumbers.length} Unmatched Project{validationResults.unmatchedProjectNumbers.length > 1 ? 's' : ''}
                    </h4>
                  </div>
                  <p className="text-xs text-amber-700">
                    These project codes from the CSV could not be matched. Transactions will be assigned to "UNASSIGNED".
                  </p>
                  <div className="space-y-1">
                    {validationResults.unmatchedProjectNumbers.slice(0, 10).map((proj: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-white/50 rounded px-2 py-1.5">
                        <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">{proj || '(blank)'}</Badge>
                        <span className="text-gray-500">→ will be UNASSIGNED</span>
                      </div>
                    ))}
                    {validationResults.unmatchedProjectNumbers.length > 10 && (
                      <p className="text-xs text-amber-600">
                        +{validationResults.unmatchedProjectNumbers.length - 10} more unmatched projects
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Before/After Snapshot */}
              {categorizeTransactions.newRecords.length > 0 && financialSnapshot && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600">Financial Impact</h4>
                  <FinancialSnapshot 
                    expenses={financialSnapshot.expenses} 
                    revenues={financialSnapshot.revenues} 
                  />
                </div>
              )}

              {/* Transaction Selection — replaces old New/Already Imported tabs */}
              {allCategorized.length > 0 && (
                <div className="space-y-3">
                  <TransactionSelectionControls
                    totalNew={selectionCounts.totalNew}
                    totalDuplicates={selectionCounts.totalDuplicates}
                    totalErrors={selectionCounts.totalErrors}
                    totalUnassigned={selectionCounts.totalUnassigned}
                    selectedCount={selectedRows.size}
                    totalSelectable={selectionCounts.totalSelectable}
                    onSelectAllNew={selectAllNew}
                    onSelectAllDuplicates={selectAllDuplicates}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                    statusFilter={txStatusFilter}
                    onStatusFilterChange={setTxStatusFilter}
                    searchQuery={txSearchQuery}
                    onSearchChange={setTxSearchQuery}
                  />
                  <TransactionSelectionTable
                    transactions={allCategorized}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    statusFilter={txStatusFilter}
                    searchQuery={txSearchQuery}
                  />
                </div>
              )}

              {/* Reconciliation - Only show if there's a meaningful difference */}
              {validationResults?.reconciliation && 
               !validationResults.reconciliation.isAligned && 
               Math.abs(validationResults.reconciliation.difference) > 10 && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          Reconciliation variance: {formatCurrency(Math.abs(validationResults.reconciliation.difference))}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-amber-600" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-amber-50 border border-amber-200 border-t-0 rounded-b-lg p-3 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-amber-700">System total:</span>
                        <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalExistingNonLaborExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700">File total (matched):</span>
                        <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalDuplicateAmount)}</span>
                      </div>
                      <p className="text-xs text-amber-600 pt-2 border-t border-amber-200">
                        This may indicate some transactions were modified after import. 
                        Review if the difference is significant.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('upload')} className="min-h-[48px]">
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                {selectedRows.size > 0 ? (
                  <>
                    <span className="text-sm text-gray-500">
                      {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''} selected
                      {selectionCounts.selectedDuplicateCount > 0 && (
                        <span className="text-amber-600 ml-1">
                          ({selectionCounts.selectedDuplicateCount} re-import{selectionCounts.selectedDuplicateCount !== 1 ? 's' : ''})
                        </span>
                      )}
                    </span>
                    <Button
                      onClick={handleProcessCSV}
                      disabled={isImporting}
                      className="min-w-[160px] min-h-[48px]"
                    >
                      {isImporting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Importing...
                        </>
                      ) : (
                        <>Import {selectedRows.size} Transaction{selectedRows.size !== 1 ? 's' : ''}</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">
                      No transactions selected
                    </span>
                    <Button variant="secondary" onClick={handleClose} className="min-h-[48px]">
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'resolve_payees' && (
          <div className="flex flex-col h-[calc(90vh-120px)]">
            <ImportStepper currentStep={step} />

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-amber-900">
                  Resolve Unmatched Entities
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {pendingPayees.length > 0 && `${pendingPayees.length} payee${pendingPayees.length !== 1 ? 's' : ''}`}
                  {pendingPayees.length > 0 && pendingClients.length > 0 && ' and '}
                  {pendingClients.length > 0 && `${pendingClients.length} client${pendingClients.length !== 1 ? 's' : ''}`}
                  {' weren\'t found in your system. Choose how to handle each one before importing.'}
                </p>
              </div>

              {pendingPayees.length > 0 && (
                <h4 className="text-sm font-semibold text-gray-700">Unmatched Payees</h4>
              )}

              {pendingPayees.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-medium">CSV Name</TableHead>
                      <TableHead className="text-xs font-medium">Suggested Type</TableHead>
                      <TableHead className="text-xs font-medium">Best Match</TableHead>
                      <TableHead className="text-xs font-medium">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayees.map((review, index) => {
                      const resolution = payeeResolutions.get(review.qbName);
                      const topSuggestion = review.suggestions[0];
                      return (
                        <TableRow key={index}>
                          <TableCell className="text-sm py-3 font-medium max-w-[180px] truncate">
                            {review.qbName}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs capitalize">
                              {review.suggestedPayeeType.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-sm">
                            {topSuggestion ? (
                              <span className="text-gray-700">
                                {topSuggestion.payee.payee_name}{' '}
                                <span className="text-xs text-gray-400">({topSuggestion.confidence}%)</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">No matches found</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-1">
                                <Button
                                  variant={resolution?.action === 'create_new' ? 'default' : 'outline'}
                                  size="sm"
                                  className="min-h-[48px] min-w-[48px] text-xs"
                                  onClick={() => {
                                    const next = new Map(payeeResolutions);
                                    next.set(review.qbName, { action: 'create_new' });
                                    setPayeeResolutions(next);
                                  }}
                                >
                                  Create New
                                </Button>
                                <Button
                                  variant={resolution?.action === 'skip' ? 'default' : 'outline'}
                                  size="sm"
                                  className="min-h-[48px] min-w-[48px] text-xs"
                                  onClick={() => {
                                    const next = new Map(payeeResolutions);
                                    next.set(review.qbName, { action: 'skip' });
                                    setPayeeResolutions(next);
                                  }}
                                >
                                  Skip
                                </Button>
                              </div>
                              {review.suggestions.length > 0 && (
                                <select
                                  className={cn(
                                    "min-h-[48px] text-xs border rounded-md px-2 py-1 w-full",
                                    resolution?.action === 'match_existing' 
                                      ? "border-blue-500 bg-blue-50" 
                                      : "border-gray-300"
                                  )}
                                  value={resolution?.action === 'match_existing' ? resolution.matchedPayeeId || '' : ''}
                                  onChange={(e) => {
                                    const payeeId = e.target.value;
                                    if (payeeId) {
                                      const next = new Map(payeeResolutions);
                                      next.set(review.qbName, { action: 'match_existing', matchedPayeeId: payeeId });
                                      setPayeeResolutions(next);
                                    }
                                  }}
                                >
                                  <option value="">Match Existing...</option>
                                  {review.suggestions.map((s, si) => (
                                    <option key={si} value={s.payee.id}>
                                      {s.payee.payee_name} ({s.confidence}%)
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              )}

              {/* Unmatched Clients Section */}
              {pendingClients.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mt-4">Unmatched Clients</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-medium">CSV Name</TableHead>
                          <TableHead className="text-xs font-medium">Best Match</TableHead>
                          <TableHead className="text-xs font-medium">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingClients.map((review, index) => {
                          const resolution = clientResolutions.get(review.qbName);
                          const topSuggestion = review.suggestions[0];
                          return (
                            <TableRow key={index}>
                              <TableCell className="text-sm py-3 font-medium max-w-[180px] truncate">
                                {review.qbName}
                              </TableCell>
                              <TableCell className="py-3 text-sm">
                                {topSuggestion ? (
                                  <span className="text-gray-700">
                                    {topSuggestion.client.client_name}{' '}
                                    <span className="text-xs text-gray-400">({topSuggestion.confidence}%)</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">No matches found</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-1">
                                    <Button
                                      variant={resolution?.action === 'create_new' ? 'default' : 'outline'}
                                      size="sm"
                                      className="min-h-[48px] min-w-[48px] text-xs"
                                      onClick={() => {
                                        const next = new Map(clientResolutions);
                                        next.set(review.qbName, { action: 'create_new' });
                                        setClientResolutions(next);
                                      }}
                                    >
                                      Create New
                                    </Button>
                                    <Button
                                      variant={resolution?.action === 'skip' ? 'default' : 'outline'}
                                      size="sm"
                                      className="min-h-[48px] min-w-[48px] text-xs"
                                      onClick={() => {
                                        const next = new Map(clientResolutions);
                                        next.set(review.qbName, { action: 'skip' });
                                        setClientResolutions(next);
                                      }}
                                    >
                                      Skip
                                    </Button>
                                  </div>
                                  {review.suggestions.length > 0 && (
                                    <select
                                      className={cn(
                                        "min-h-[48px] text-xs border rounded-md px-2 py-1 w-full",
                                        resolution?.action === 'match_existing' 
                                          ? "border-blue-500 bg-blue-50" 
                                          : "border-gray-300"
                                      )}
                                      value={resolution?.action === 'match_existing' ? resolution.matchedClientId || '' : ''}
                                      onChange={(e) => {
                                        const clientId = e.target.value;
                                        if (clientId) {
                                          const next = new Map(clientResolutions);
                                          next.set(review.qbName, { action: 'match_existing', matchedClientId: clientId });
                                          setClientResolutions(next);
                                        }
                                      }}
                                    >
                                      <option value="">Match Existing...</option>
                                      {review.suggestions.map((s, si) => (
                                        <option key={si} value={s.client.id}>
                                          {s.client.client_name} ({s.confidence}%)
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Unmapped Accounts Section */}
              {processResult && processResult.unmappedAccounts.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mt-4">Unmapped Accounts</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Assign categories to these accounts. Mappings will be saved for future imports.
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-medium">Account Name</TableHead>
                          <TableHead className="text-xs font-medium">Transactions</TableHead>
                          <TableHead className="text-xs font-medium">Total</TableHead>
                          <TableHead className="text-xs font-medium">Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processResult.unmappedAccounts.map((acct, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-sm py-3 font-medium max-w-[200px] truncate">
                              {acct.accountFullName}
                            </TableCell>
                            <TableCell className="py-3 text-sm text-gray-600">
                              {acct.transactionCount}
                            </TableCell>
                            <TableCell className="py-3 text-sm text-gray-600">
                              {formatCurrency(acct.totalAmount)}
                            </TableCell>
                            <TableCell className="py-3">
                              <select
                                className="min-h-[48px] text-xs border rounded-md px-2 py-1 w-full border-gray-300"
                                value={accountCategoryMappings.get(acct.accountFullName) || acct.suggestedCategory || ''}
                                onChange={(e) => {
                                  const next = new Map(accountCategoryMappings);
                                  if (e.target.value) {
                                    next.set(acct.accountFullName, e.target.value as ExpenseCategory);
                                  } else {
                                    next.delete(acct.accountFullName);
                                  }
                                  setAccountCategoryMappings(next);
                                }}
                              >
                                <option value="">No mapping</option>
                                {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {accountCategoryMappings.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 min-h-[48px]"
                      onClick={async () => {
                        const mappings = Array.from(accountCategoryMappings.entries()).map(([name, category]) => ({
                          qb_account_name: name.split(':').pop()?.trim() || name,
                          qb_account_full_path: name,
                          app_category: category,
                          is_active: true,
                        }));
                        const { error } = await supabase.from('quickbooks_account_mappings').upsert(mappings, {
                          onConflict: 'qb_account_full_path'
                        });
                        if (!error) {
                          toast({ title: `Saved ${mappings.length} account mapping(s)` });
                        } else {
                          toast({ title: 'Error saving mappings', description: error.message, variant: 'destructive' });
                        }
                      }}
                    >
                      Save {accountCategoryMappings.size} Mapping{accountCategoryMappings.size !== 1 ? 's' : ''}
                    </Button>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-blue-600 mt-1"
                    onClick={() => setShowMappingsManager(true)}
                  >
                    Manage All Mappings →
                  </Button>
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {pendingPayees.length + pendingClients.length} entit{(pendingPayees.length + pendingClients.length) !== 1 ? 'ies' : 'y'} to resolve
                </span>
                <Button
                  onClick={() => handleFinalImport()}
                  disabled={isImporting || !Array.from(payeeResolutions.values()).every(r => r.action)}
                  className="min-h-[48px] min-w-[160px]"
                >
                  {isImporting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Importing...
                    </>
                  ) : (
                    <>Confirm & Import</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div className="space-y-4">
            {/* Stepper */}
            <ImportStepper currentStep={step} />
            
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Import Complete</h3>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Import Results</h4>

              {/* Primary summary breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-green-700">{importResults.successCount || 0}</span>
                    <span className="text-gray-600 ml-1">
                      new transaction{(importResults.successCount || 0) !== 1 ? 's' : ''} imported
                    </span>
                  </div>
                </div>
                {(importResults.reimportedDuplicateCount || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold text-amber-700">{importResults.reimportedDuplicateCount}</span>
                      <span className="text-gray-600 ml-1">
                        duplicate{importResults.reimportedDuplicateCount !== 1 ? 's' : ''} re-imported
                      </span>
                    </div>
                  </div>
                )}
                {(importResults.skippedNotSelectedCount || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <CheckCircle2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold text-gray-500">{importResults.skippedNotSelectedCount}</span>
                      <span className="text-gray-600 ml-1">
                        transaction{importResults.skippedNotSelectedCount !== 1 ? 's' : ''} skipped (not selected)
                      </span>
                    </div>
                  </div>
                )}
                {importResults.errors.length > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold text-red-700">{importResults.errors.length}</span>
                      <span className="text-gray-600 ml-1">
                        error{importResults.errors.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail breakdown */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Expenses Imported:</span> {importResults.expenses.length}
                </div>
                <div>
                  <span className="font-medium">Revenues Imported:</span> {importResults.revenues.length}
                </div>
                <div>
                  <span className="font-medium">Unassigned to "000-UNASSIGNED":</span> {importResults.unassociated_expenses + importResults.unassociated_revenues}
                </div>
                {importResults.autoCreatedCount !== undefined && importResults.autoCreatedCount > 0 && (
                  <div>
                    <span className="font-medium">Payees Auto-Created:</span> {importResults.autoCreatedCount}
                  </div>
                )}
                {importResults.fuzzyMatches && importResults.fuzzyMatches.length > 0 && (
                  <div>
                    <span className="font-medium">Fuzzy Matches Applied:</span> {importResults.fuzzyMatches.length}
                  </div>
                )}
              </div>
              
              {/* Mapping Statistics */}
              {importResults.mappingStats && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h5 className="font-medium text-sm mb-2">Category Mapping Statistics</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Database Mappings: {importResults.mappingStats.databaseMapped}</div>
                    <div>Static Mappings: {importResults.mappingStats.staticMapped}</div>
                    <div>Description-Based: {importResults.mappingStats.descriptionMapped}</div>
                    <div>Unmapped: {importResults.mappingStats.unmapped}</div>
                  </div>
                </div>
              )}
              
              {/* Auto-Created Payees */}
              {importResults.autoCreatedPayees && importResults.autoCreatedPayees.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h5 className="font-medium text-sm mb-2">Auto-Created Payees</h5>
                  <div className="text-xs space-y-1">
                    {importResults.autoCreatedPayees.slice(0, 5).map((payee, idx) => (
                      <div key={idx} className="text-green-700">
                        • {payee.qbName}
                      </div>
                    ))}
                    {importResults.autoCreatedPayees.length > 5 && (
                      <div className="text-green-600 italic">
                        ...and {importResults.autoCreatedPayees.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Unmapped Accounts */}
              {importResults.unmappedAccounts && importResults.unmappedAccounts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h5 className="font-medium text-sm mb-2">Unmapped Accounts ({importResults.unmappedAccounts.length})</h5>
                  <div className="text-xs text-amber-700 space-y-1">
                    {importResults.unmappedAccounts.slice(0, 5).map((acct, i) => (
                      <div key={i}>
                        {acct.accountFullName} ({acct.transactionCount} txns, {formatCurrency(acct.totalAmount)})
                        {acct.suggestedCategory && <span className="text-green-600"> — suggested: {acct.suggestedCategory}</span>}
                      </div>
                    ))}
                    {importResults.unmappedAccounts.length > 5 && (
                      <div>+{importResults.unmappedAccounts.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
              
              {(importResults.unassociated_expenses + importResults.unassociated_revenues) > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>{importResults.unassociated_expenses + importResults.unassociated_revenues}</strong> transactions 
                    without Project/WO # assignments have been imported to the "000-UNASSIGNED" project. 
                    You can reassign them to proper projects from the Projects or Expenses page.
                  </p>
                </div>
              )}
            </div>

            {importResults.errors && importResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Import Errors:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {importResults.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li>... and {importResults.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {(importResults.unassociated_expenses + importResults.unassociated_revenues) > 0 && (
                <Button onClick={() => {
                  handleClose();
                  // Navigate to projects page to view the unassigned project
                  window.location.href = '/projects';
                }}>
                  View Unassigned Project
                </Button>
              )}
            </div>
          </div>
        )}
        </div>
      </DialogContent>

      {/* Account Mappings Manager Sheet */}
      <Sheet open={showMappingsManager} onOpenChange={setShowMappingsManager}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Account Mappings Manager</SheetTitle>
            <SheetDescription>
              Manage QuickBooks account to category mappings for all imports.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
              <AccountMappingsManagerLazy />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
};