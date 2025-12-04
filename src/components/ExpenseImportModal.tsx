import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, CheckCircle2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  TransactionCSVRow, 
  TransactionImportResult,
  ExpenseImportData,
  RevenueImportData
} from '@/utils/enhancedTransactionImporter';
import { ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';
import { formatCurrency, cn } from '@/lib/utils';

interface StepperProps {
  currentStep: 'upload' | 'preview' | 'complete';
}

const ImportStepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 'upload', label: 'Upload', number: 1 },
    { id: 'preview', label: 'Review', number: 2 },
    { id: 'complete', label: 'Complete', number: 3 },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['upload', 'preview', 'complete'];
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
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
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
    unmappedAccounts?: string[];
    revenueReconciliation?: {
      totalExistingRevenues: number;
      totalDuplicateAmount: number;
      difference: number;
      isAligned: boolean;
      threshold: number;
    };
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

  // Separate transactions into new vs already-imported
  const categorizeTransactions = useMemo(() => {
    if (!validationResults || !csvData.length) {
      return {
        newRecords: csvData,
        alreadyImported: [],
        newExpenses: [],
        newRevenues: [],
        existingExpenses: [],
        existingRevenues: [],
      };
    }

    // Get all duplicate indices
    const duplicateIndices = new Set<number>();
    
    // In-file duplicates
    validationResults.inFileDuplicates?.forEach((d: any) => {
      const idx = csvData.findIndex(row => 
        row.Date === d.transaction.Date && 
        row.Amount === d.transaction.Amount && 
        row.Name === d.transaction.Name
      );
      if (idx >= 0) duplicateIndices.add(idx);
    });

    // Database duplicates (expenses)
    validationResults.databaseDuplicates?.forEach((d: any) => {
      const idx = csvData.findIndex(row => 
        row.Date === d.transaction.Date && 
        row.Amount === d.transaction.Amount && 
        row.Name === d.transaction.Name
      );
      if (idx >= 0) duplicateIndices.add(idx);
    });

    // Database duplicates (revenues)
    validationResults.revenueDatabaseDuplicates?.forEach((d: any) => {
      const idx = csvData.findIndex(row => 
        row.Date === d.transaction.Date && 
        row.Amount === d.transaction.Amount && 
        row.Name === d.transaction.Name
      );
      if (idx >= 0) duplicateIndices.add(idx);
    });

    // Revenue in-file duplicates
    validationResults.revenueInFileDuplicates?.forEach((d: any) => {
      const idx = csvData.findIndex(row => 
        row.Date === d.transaction.Date && 
        row.Amount === d.transaction.Amount && 
        row.Name === d.transaction.Name
      );
      if (idx >= 0) duplicateIndices.add(idx);
    });

    // Separate new from existing
    const newRecords: TransactionCSVRow[] = [];
    const alreadyImported: TransactionCSVRow[] = [];

    csvData.forEach((row, index) => {
      if (duplicateIndices.has(index)) {
        alreadyImported.push(row);
      } else {
        newRecords.push(row);
      }
    });

    // Further categorize new records
    const newExpenses = newRecords.filter(r => r['Transaction type'] !== 'Invoice');
    const newRevenues = newRecords.filter(r => r['Transaction type'] === 'Invoice');
    const existingExpenses = alreadyImported.filter(r => r['Transaction type'] !== 'Invoice');
    const existingRevenues = alreadyImported.filter(r => r['Transaction type'] === 'Invoice');

    return {
      newRecords,
      alreadyImported,
      newExpenses,
      newRevenues,
      existingExpenses,
      existingRevenues,
    };
  }, [csvData, validationResults]);

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
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateMatches = async (data: TransactionCSVRow[]) => {
    // Fetch all projects and payees for matching
    const { data: projects } = await supabase.from('projects').select('project_number, project_name, id');
    const { data: payees } = await supabase.from('payees').select('payee_name, full_name, id');
    
    const projectNumbers = new Set(projects?.map(p => p.project_number.toLowerCase().trim()) || []);
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
      
      const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
      const name = row['Name']?.trim().toLowerCase() || '';
      
      // Create key: date|amount|name
      const key = `${date}|${normalizedAmount}|${name}`.toLowerCase();
      
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
        .select('id, expense_date, amount, payee_id, description')
        .gte('expense_date', minDate.toISOString().split('T')[0])
        .lte('expense_date', maxDate.toISOString().split('T')[0])
        .eq('is_split', false);
      
      if (!error && existingExpensesData) {
        const payeeMap = new Map<string, string>();
        payees?.forEach(payee => {
          payeeMap.set(payee.id, payee.payee_name.toLowerCase().trim());
        });
        
        for (const expense of existingExpensesData) {
          const primaryKey = `${expense.expense_date}|${Math.round(expense.amount * 100) / 100}|${expense.payee_id || 'null'}`.toLowerCase();
          existingExpenses.set(primaryKey, { 
            id: expense.id, 
            description: expense.description || '' 
          });
          
          if (!expense.payee_id && expense.description) {
            const normalizedDesc = expense.description.toLowerCase().trim().substring(0, 50);
            const secondaryKey = `desc|${expense.expense_date}|${Math.round(expense.amount * 100) / 100}|${normalizedDesc}`;
            existingExpenses.set(secondaryKey, { 
              id: expense.id, 
              description: expense.description 
            });
          }
        }
      }
    }
    
    data.forEach(row => {
      const projectWO = row['Project/WO #']?.trim().toLowerCase();
      const name = row['Name']?.trim().toLowerCase();
      
      // Check project match
      if (projectWO) {
        if (projectNumbers.has(projectWO)) {
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
        const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
        const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
        const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
        
        // Find payee ID for this row
        let payeeId: string | null = null;
        if (name) {
          const foundPayee = payees?.find(p => 
            p.payee_name.toLowerCase().trim() === name || 
            p.full_name?.toLowerCase().trim() === name
          );
          payeeId = foundPayee?.id || null;
        }
        
        const primaryKey = `${date}|${normalizedAmount}|${payeeId || 'null'}`.toLowerCase();
        const descriptionKey = `desc|${date}|${normalizedAmount}|${name.substring(0, 50).toLowerCase()}`;
        
        const existingByPrimaryKey = existingExpenses.get(primaryKey);
        const existingByDescription = !payeeId ? existingExpenses.get(descriptionKey) : null;
        const existingExpense = existingByPrimaryKey || existingByDescription;
        
        if (existingExpense) {
          databaseDuplicates.push({
            transaction: row,
            existingExpenseId: existingExpense.id,
            matchKey: existingByPrimaryKey ? primaryKey : descriptionKey
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
        const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0');
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
      
      const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
      const invoiceNumber = row['Invoice #']?.trim() || '';
      const name = row['Name']?.trim() || '';
      
      // Create key: amount|date|invoice#|description (matching database constraint)
      const key = `${normalizedAmount}|${date}|${invoiceNumber}|${name}`.toLowerCase();
      
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
        .select('id, invoice_date, amount, invoice_number, description')
        .gte('invoice_date', minDate.toISOString().split('T')[0])
        .lte('invoice_date', maxDate.toISOString().split('T')[0]);
      
      if (!revenuesError && existingRevenuesData) {
        for (const revenue of existingRevenuesData) {
          const normalizedAmount = Math.round(Math.abs(revenue.amount) * 100) / 100;
          const key = `${normalizedAmount}|${revenue.invoice_date}|${revenue.invoice_number || ''}|${revenue.description || ''}`.toLowerCase();
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
        
        const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
        const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
        const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
        const invoiceNumber = row['Invoice #']?.trim() || '';
        const name = row['Name']?.trim() || '';
        const projectWO = row['Project/WO #']?.trim() || '';
        
        // Build description the same way as the importer does (matches database format)
        const isUnassigned = !projectWO || !projectNumbers.has(projectWO.toLowerCase());
        const description = `Invoice from ${name}${isUnassigned ? ' (Unassigned)' : ''}`;
        
        // Use description in key to match database format (same as fetchExistingRevenues)
        const key = `${normalizedAmount}|${date}|${invoiceNumber}|${description}`.toLowerCase();
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
        const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0');
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
      setErrors(['Failed to parse CSV file']);
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

  const handleImport = async () => {
    if (!csvData.length) return;

    setIsImporting(true);
    
    try {
      const result = await processTransactionImport(csvData);
      
      // Import expenses
      let successCount = 0;
      const errorMessages: string[] = [...result.errors];

      if (result.expenses.length > 0) {
        for (const expense of result.expenses) {
          try {
            const { error } = await supabase
              .from('expenses')
              .insert([expense]);

            if (error) {
              errorMessages.push(`Failed to import expense "${expense.description}": ${error.message}`);
            } else {
              successCount++;
            }
          } catch (err) {
            errorMessages.push(`Failed to import expense "${expense.description}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      // Import revenues
      if (result.revenues.length > 0) {
        for (const revenue of result.revenues) {
          try {
            const { error } = await supabase
              .from('project_revenues')
              .insert([revenue]);

            if (error) {
              errorMessages.push(`Failed to import revenue "${revenue.description}": ${error.message}`);
            } else {
              successCount++;
            }
          } catch (err) {
            errorMessages.push(`Failed to import revenue "${revenue.description}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      const finalResults = {
        expenses: result.expenses,
        revenues: result.revenues,
        unassociated_expenses: result.unassociated_expenses,
        unassociated_revenues: result.unassociated_revenues,
        category_mappings_used: result.category_mappings_used,
        errors: errorMessages,
        successCount,
        databaseDuplicatesSkipped: result.databaseDuplicatesSkipped,
        inFileDuplicatesSkipped: result.inFileDuplicatesSkipped,
        revenueDatabaseDuplicatesSkipped: result.revenueDatabaseDuplicatesSkipped,
        revenueInFileDuplicatesSkipped: result.revenueInFileDuplicatesSkipped,
        fuzzyMatches: result.fuzzyMatches,
        autoCreatedPayees: result.autoCreatedPayees,
        autoCreatedCount: result.autoCreatedCount,
        mappingStats: result.mappingStats,
        unmappedAccounts: result.unmappedAccounts,
        revenueReconciliation: result.revenueReconciliation
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
        const autoCreatedText = finalResults.autoCreatedCount && finalResults.autoCreatedCount > 0 
          ? ` Auto-created ${finalResults.autoCreatedCount} payee(s).` 
          : '';
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} transaction${successCount === 1 ? '' : 's'}.${duplicateText}${autoCreatedText}${errorMessages.length > 0 ? ` ${errorMessages.length} failed.` : ''}`,
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

  const calculateImportCount = useCallback(() => {
    return categorizeTransactions.newRecords.length;
  }, [categorizeTransactions.newRecords.length]);

  const previewData = csvData.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Import Transactions from CSV</DialogTitle>
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
                          <span>{newRecordIssues.newPayees} will be auto-created</span>
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

              {/* No New Records Message */}
              {categorizeTransactions.newRecords.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-700">All caught up!</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    All {csvData.length} transactions in this file are already in the system.
                  </p>
                </div>
              )}

              {/* Tabs - Simplified */}
              {categorizeTransactions.newRecords.length > 0 && (
                <Tabs defaultValue="new" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      New Records ({categorizeTransactions.newRecords.length})
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Already Imported ({categorizeTransactions.alreadyImported.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* New Records Tab */}
                  <TabsContent value="new" className="mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs font-medium">Date</TableHead>
                            <TableHead className="text-xs font-medium">Type</TableHead>
                            <TableHead className="text-xs font-medium">Amount</TableHead>
                            <TableHead className="text-xs font-medium">Name</TableHead>
                            <TableHead className="text-xs font-medium">Project</TableHead>
                            <TableHead className="text-xs font-medium">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categorizeTransactions.newRecords.slice(0, 10).map((row, index) => {
                            const isRevenue = row['Transaction type'] === 'Invoice';
                            const hasProject = row['Project/WO #']?.trim();
                            const projectExists = hasProject && validationResults?.unmatchedProjectNumbers && 
                              !validationResults.unmatchedProjectNumbers.includes(hasProject);
                            
                            return (
                              <TableRow key={index}>
                                <TableCell className="text-xs py-2">{row.Date}</TableCell>
                                <TableCell className="text-xs py-2">
                                  <Badge 
                                    variant={isRevenue ? "default" : "secondary"} 
                                    className="text-xs"
                                  >
                                    {isRevenue ? 'Revenue' : 'Expense'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 font-mono">{row.Amount}</TableCell>
                                <TableCell className="text-xs py-2 max-w-[150px] truncate">{row.Name}</TableCell>
                                <TableCell className="text-xs py-2">
                                  {hasProject ? (
                                    <span className={projectExists ? "text-gray-900" : "text-amber-600"}>
                                      {hasProject}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  {projectExists ? (
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                      Ready
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                      Unassigned
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {categorizeTransactions.newRecords.length > 10 && (
                        <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                          Showing 10 of {categorizeTransactions.newRecords.length} new records
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Already Imported Tab */}
                  <TabsContent value="existing" className="mt-4">
                    <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600">
                        These {categorizeTransactions.alreadyImported.length} transactions are already in your system 
                        and will be skipped automatically. This is normal for YTD imports.
                      </p>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs font-medium">Date</TableHead>
                            <TableHead className="text-xs font-medium">Type</TableHead>
                            <TableHead className="text-xs font-medium">Amount</TableHead>
                            <TableHead className="text-xs font-medium">Name</TableHead>
                            <TableHead className="text-xs font-medium">Project</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categorizeTransactions.alreadyImported.slice(0, 10).map((row, index) => {
                            const isRevenue = row['Transaction type'] === 'Invoice';
                            return (
                              <TableRow key={index} className="text-gray-400">
                                <TableCell className="text-xs py-2">{row.Date}</TableCell>
                                <TableCell className="text-xs py-2">
                                  <Badge variant="outline" className="text-xs opacity-50">
                                    {isRevenue ? 'Revenue' : 'Expense'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 font-mono">{row.Amount}</TableCell>
                                <TableCell className="text-xs py-2 max-w-[150px] truncate">{row.Name}</TableCell>
                                <TableCell className="text-xs py-2">{row['Project/WO #'] || '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {categorizeTransactions.alreadyImported.length > 10 && (
                        <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                          Showing 10 of {categorizeTransactions.alreadyImported.length} already imported
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                {categorizeTransactions.newRecords.length > 0 ? (
                  <>
                    <span className="text-sm text-gray-500">
                      {categorizeTransactions.newRecords.length} new record{categorizeTransactions.newRecords.length !== 1 ? 's' : ''} will be imported
                    </span>
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="min-w-[160px]"
                    >
                      {isImporting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Importing...
                        </>
                      ) : (
                        <>Import {categorizeTransactions.newRecords.length} New Records</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">
                      No new records to import
                    </span>
                    <Button variant="secondary" onClick={handleClose}>
                      Close
                    </Button>
                  </>
                )}
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Successfully Imported:</span> {importResults.successCount || 0}
                </div>
                <div>
                  <span className="font-medium">Revenues Imported:</span> {importResults.revenues.length}
                </div>
                <div>
                  <span className="font-medium">Expenses Imported:</span> {importResults.expenses.length}
                </div>
                <div>
                  <span className="font-medium">Unassigned to "000-UNASSIGNED":</span> {importResults.unassociated_expenses + importResults.unassociated_revenues}
                </div>
                {importResults.databaseDuplicatesSkipped !== undefined && importResults.databaseDuplicatesSkipped > 0 && (
                  <div>
                    <span className="font-medium">Expense DB Duplicates Skipped:</span> {importResults.databaseDuplicatesSkipped}
                  </div>
                )}
                {importResults.inFileDuplicatesSkipped !== undefined && importResults.inFileDuplicatesSkipped > 0 && (
                  <div>
                    <span className="font-medium">Expense In-File Duplicates Skipped:</span> {importResults.inFileDuplicatesSkipped}
                  </div>
                )}
                {importResults.revenueDatabaseDuplicatesSkipped !== undefined && importResults.revenueDatabaseDuplicatesSkipped > 0 && (
                  <div>
                    <span className="font-medium">Revenue DB Duplicates Skipped:</span> {importResults.revenueDatabaseDuplicatesSkipped}
                  </div>
                )}
                {importResults.revenueInFileDuplicatesSkipped !== undefined && importResults.revenueInFileDuplicatesSkipped > 0 && (
                  <div>
                    <span className="font-medium">Revenue In-File Duplicates Skipped:</span> {importResults.revenueInFileDuplicatesSkipped}
                  </div>
                )}
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
                  <h5 className="font-medium text-sm mb-2">Unmapped Accounts</h5>
                  <div className="text-xs text-amber-700">
                    {importResults.unmappedAccounts.slice(0, 5).join(', ')}
                    {importResults.unmappedAccounts.length > 5 && ` +${importResults.unmappedAccounts.length - 5} more`}
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
    </Dialog>
  );
};