import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [overrideDuplicates, setOverrideDuplicates] = useState({
    expenseDatabase: false,
    expenseInFile: false,
    revenueDatabase: false,
    revenueInFile: false
  });
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
    setOverrideDuplicates({
      expenseDatabase: false,
      expenseInFile: false,
      revenueDatabase: false,
      revenueInFile: false
    });
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
      
      // Process overridden duplicates if any
      let overrideExpenses: ExpenseImportData[] = [];
      let overrideRevenues: RevenueImportData[] = [];
      
      if (overrideDuplicates.expenseDatabase && validationResults?.databaseDuplicates && validationResults.databaseDuplicates.length > 0) {
        const overrideResult = await processTransactionImport(
          validationResults.databaseDuplicates.map(d => d.transaction)
        );
        overrideExpenses.push(...overrideResult.expenses);
      }
      
      if (overrideDuplicates.expenseInFile && validationResults?.inFileDuplicates && validationResults.inFileDuplicates.length > 0) {
        const overrideResult = await processTransactionImport(
          validationResults.inFileDuplicates.map(d => d.transaction)
        );
        overrideExpenses.push(...overrideResult.expenses);
      }
      
      if (overrideDuplicates.revenueDatabase && validationResults?.revenueDatabaseDuplicates && validationResults.revenueDatabaseDuplicates.length > 0) {
        const overrideResult = await processTransactionImport(
          validationResults.revenueDatabaseDuplicates.map(d => d.transaction)
        );
        overrideRevenues.push(...overrideResult.revenues);
      }
      
      if (overrideDuplicates.revenueInFile && validationResults?.revenueInFileDuplicates && validationResults.revenueInFileDuplicates.length > 0) {
        const overrideResult = await processTransactionImport(
          validationResults.revenueInFileDuplicates.map(d => d.transaction)
        );
        overrideRevenues.push(...overrideResult.revenues);
      }
      
      // Combine regular results with overridden duplicates
      const allExpenses = [...result.expenses, ...overrideExpenses];
      const allRevenues = [...result.revenues, ...overrideRevenues];
      
      // Import expenses
      let successCount = 0;
      const errorMessages: string[] = [...result.errors];

      if (allExpenses.length > 0) {
        for (const expense of allExpenses) {
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
      if (allRevenues.length > 0) {
        for (const revenue of allRevenues) {
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
        expenses: allExpenses,
        revenues: allRevenues,
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

  const previewData = csvData.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => document.getElementById('expense-csv-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Drop CSV file here or click to select</p>
              <p className="text-sm text-gray-500 mt-2">
                Expected columns: Date, Transaction Type, Amount, Name, Project/WO #, Account Full Name
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
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span className="text-gray-500">({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
            
            {isUploading && (
              <div className="text-center">
                <p>Processing CSV file...</p>
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
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Preview Import Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Showing first {Math.min(10, csvData.length)} of {csvData.length} transactions. 
                Transactions will be automatically categorized by Account Full Name and split into revenues and expenses by Transaction Type.
              </p>
            </div>

            <div className="space-y-3">
              {/* Basic Stats */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Import Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Transactions:</span> {csvData.length}
                  </div>
                  <div>
                    <span className="font-medium">Revenues (Invoice):</span> {csvData.filter(row => row['Transaction type'] === 'Invoice').length}
                  </div>
                  <div>
                    <span className="font-medium">Expenses (Bill/Check/Expense):</span> {csvData.filter(row => row['Transaction type'] !== 'Invoice').length}
                  </div>
                </div>
              </div>
              
              {/* Matching Results */}
              {validationResults && (
                <>
                  {/* Project Matching */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    validationResults.unmatchedProjects === 0 
                      ? "bg-green-50 border-green-200" 
                      : "bg-amber-50 border-amber-200"
                  )}>
                    <div className="flex items-start gap-2 mb-2">
                      {validationResults.unmatchedProjects === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">Project Assignment</h4>
                        <p className="text-sm mt-1">
                          <span className="font-medium text-green-700">{validationResults.matchedProjects} assigned</span>
                          {validationResults.unmatchedProjects > 0 && (
                            <span className="font-medium text-amber-700"> • {validationResults.unmatchedProjects} unassigned</span>
                          )}
                        </p>
                        {validationResults.unmatchedProjectNumbers.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded border border-amber-300">
                            <p className="text-xs font-medium mb-1">Unassigned Project Numbers:</p>
                            <p className="text-xs text-amber-800">
                              {validationResults.unmatchedProjectNumbers.join(', ')}
                            </p>
                            <p className="text-xs text-amber-700 mt-1 italic">
                              These will be imported to "000-UNASSIGNED" project
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payee Matching */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    validationResults.unmatchedPayees === 0 
                      ? "bg-green-50 border-green-200" 
                      : "bg-blue-50 border-blue-200"
                  )}>
                    <div className="flex items-start gap-2 mb-2">
                      {validationResults.unmatchedPayees === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">Payee Assignment</h4>
                        <p className="text-sm mt-1">
                          <span className="font-medium text-green-700">{validationResults.matchedPayees} assigned</span>
                          {validationResults.unmatchedPayees > 0 && (
                            <span className="font-medium text-blue-700"> • {validationResults.unmatchedPayees} unassigned</span>
                          )}
                        </p>
                        {validationResults.unmatchedPayeeNames.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded border border-blue-300">
                            <p className="text-xs font-medium mb-1">Unassigned Payee Names:</p>
                            <p className="text-xs text-blue-800">
                              {validationResults.unmatchedPayeeNames.slice(0, 5).join(', ')}
                              {validationResults.unmatchedPayeeNames.length > 5 && ` +${validationResults.unmatchedPayeeNames.length - 5} more`}
                            </p>
                            <p className="text-xs text-blue-700 mt-1 italic">
                              These expenses will import without payee assignment
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* In-File Duplicates Warning */}
                  {validationResults.inFileDuplicatesSkipped !== undefined && validationResults.inFileDuplicatesSkipped > 0 && (
                    <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">Duplicate Transactions in File</h4>
                          <p className="text-sm mt-1">
                            <span className="font-medium text-orange-700">
                              {validationResults.inFileDuplicatesSkipped} transaction(s)
                            </span>
                            {' '}appear multiple times in the uploaded file and will be skipped.
                          </p>
                        </div>
                      </div>
                      
                      {validationResults.inFileDuplicates && validationResults.inFileDuplicates.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-orange-700 hover:underline">
                            View duplicate transactions
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white rounded border border-orange-200 p-2">
                            {validationResults.inFileDuplicates.slice(0, 10).map((dup, idx) => (
                              <div key={idx} className="py-1 border-b border-orange-100 last:border-0">
                                {dup.transaction['Date']} - {dup.transaction['Name']} - {formatCurrency(parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0'))}
                              </div>
                            ))}
                            {validationResults.inFileDuplicates.length > 10 && (
                              <div className="pt-1 text-orange-600">
                                ...and {validationResults.inFileDuplicates.length - 10} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                      
                      {/* Override checkbox */}
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={overrideDuplicates.expenseInFile}
                            onCheckedChange={(checked) => setOverrideDuplicates(prev => ({
                              ...prev,
                              expenseInFile: checked === true
                            }))}
                          />
                          <span className="text-orange-800 font-medium">Import these duplicates anyway</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Database Duplicates Warning */}
                  {validationResults.databaseDuplicatesSkipped !== undefined && validationResults.databaseDuplicatesSkipped > 0 && (
                    <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">Existing Transactions Found</h4>
                          <p className="text-sm mt-1">
                            <span className="font-medium text-amber-700">
                              {validationResults.databaseDuplicatesSkipped} transaction(s)
                            </span>
                            {' '}already exist in the database and will be skipped.
                          </p>
                          <p className="text-xs text-amber-600 mt-1 italic">
                            These were likely imported in a previous upload.
                          </p>
                        </div>
                      </div>
                      
                      {/* Optional: Expandable list of duplicates */}
                      {validationResults.databaseDuplicates && validationResults.databaseDuplicates.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-amber-700 hover:underline">
                            View duplicate transactions
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white rounded border border-amber-200 p-2">
                            {validationResults.databaseDuplicates.slice(0, 10).map((dup, idx) => (
                              <div key={idx} className="py-1 border-b border-amber-100 last:border-0">
                                {dup.transaction['Date']} - {dup.transaction['Name']} - {formatCurrency(parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0'))}
                              </div>
                            ))}
                            {validationResults.databaseDuplicates.length > 10 && (
                              <div className="pt-1 text-amber-600">
                                ...and {validationResults.databaseDuplicates.length - 10} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                      
                      {/* Override checkbox */}
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={overrideDuplicates.expenseDatabase}
                            onCheckedChange={(checked) => setOverrideDuplicates(prev => ({
                              ...prev,
                              expenseDatabase: checked === true
                            }))}
                          />
                          <span className="text-amber-800 font-medium">Import these duplicates anyway</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Revenue Database Duplicates Warning */}
                  {validationResults.revenueDatabaseDuplicatesSkipped && validationResults.revenueDatabaseDuplicatesSkipped > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-amber-800 text-sm">
                            {validationResults.revenueDatabaseDuplicatesSkipped} invoice(s) already exist in the system
                          </h4>
                          <p className="text-sm text-amber-700 mt-1">
                            These invoices will be skipped during import.
                          </p>
                          <p className="text-xs text-amber-600 mt-1 italic">
                            These were likely imported in a previous upload.
                          </p>
                        </div>
                      </div>
                      
                      {validationResults.revenueDatabaseDuplicates && validationResults.revenueDatabaseDuplicates.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-amber-700 hover:underline">
                            View duplicate invoices
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white rounded border border-amber-200 p-2">
                            {validationResults.revenueDatabaseDuplicates.slice(0, 10).map((dup, idx) => (
                              <div key={idx} className="py-1 border-b border-amber-100 last:border-0">
                                {dup.transaction['Date']} - {dup.transaction['Name']} - {formatCurrency(parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0'))}
                              </div>
                            ))}
                            {validationResults.revenueDatabaseDuplicates.length > 10 && (
                              <div className="pt-1 text-amber-600">
                                ...and {validationResults.revenueDatabaseDuplicates.length - 10} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                      
                      {/* Override checkbox */}
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={overrideDuplicates.revenueDatabase}
                            onCheckedChange={(checked) => setOverrideDuplicates(prev => ({
                              ...prev,
                              revenueDatabase: checked === true
                            }))}
                          />
                          <span className="text-amber-800 font-medium">Import these duplicates anyway</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Reconciliation Display */}
                  {validationResults.reconciliation && (validationResults.reconciliation.totalDuplicateAmount > 0 || validationResults.reconciliation.totalExistingNonLaborExpenses > 0) && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      validationResults.reconciliation.isAligned
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}>
                      <div className="flex items-start gap-2 mb-2">
                        {validationResults.reconciliation.isAligned ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {validationResults.reconciliation.isAligned ? 'Reconciliation Aligned' : 'Reconciliation Failed'}
                          </h4>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Matching Expenses in System:</span>
                              <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalExistingNonLaborExpenses)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Duplicate Amount:</span>
                              <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalDuplicateAmount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span className={cn(
                                "font-medium",
                                validationResults.reconciliation.isAligned ? "text-green-700" : "text-red-700"
                              )}>
                                Difference:
                              </span>
                              <span className={cn(
                                "font-bold",
                                validationResults.reconciliation.isAligned ? "text-green-700" : "text-red-700"
                              )}>
                                {formatCurrency(validationResults.reconciliation.difference)}
                              </span>
                            </div>
                          </div>
                          {!validationResults.reconciliation.isAligned && (
                            <p className="text-xs text-red-600 mt-2 italic">
                              Reconciliation failed: Totals do not match. Please review duplicates before importing.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Revenue/Invoice Reconciliation Display */}
                  {validationResults.revenueReconciliation && (validationResults.revenueReconciliation.totalDuplicateAmount > 0 || validationResults.revenueReconciliation.totalExistingRevenues > 0) && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      validationResults.revenueReconciliation.isAligned
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}>
                      <div className="flex items-start gap-2 mb-2">
                        {validationResults.revenueReconciliation.isAligned ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {validationResults.revenueReconciliation.isAligned ? 'Invoice Reconciliation Aligned' : 'Invoice Reconciliation Failed'}
                          </h4>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Matching Invoices in System:</span>
                              <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalExistingRevenues)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Duplicate Invoice Amount:</span>
                              <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalDuplicateAmount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span className={cn(
                                "font-medium",
                                validationResults.revenueReconciliation.isAligned ? "text-green-700" : "text-red-700"
                              )}>
                                Difference:
                              </span>
                              <span className={cn(
                                "font-bold",
                                validationResults.revenueReconciliation.isAligned ? "text-green-700" : "text-red-700"
                              )}>
                                {formatCurrency(validationResults.revenueReconciliation.difference)}
                              </span>
                            </div>
                          </div>
                          {!validationResults.revenueReconciliation.isAligned && (
                            <p className="text-xs text-red-600 mt-2 italic">
                              Invoice reconciliation failed: Totals do not match. Please review duplicate invoices before importing.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Project/WO #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.Date}</TableCell>
                    <TableCell>
                      <Badge variant={row['Transaction type'] === 'Invoice' ? 'default' : 'secondary'}>
                        {row['Transaction type']}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Math.abs(parseFloat(row.Amount || '0')))}</TableCell>
                    <TableCell>{row.Name}</TableCell>
                    <TableCell>{row['Project/WO #'] || <span className="text-gray-400">Unassociated</span>}</TableCell>
                    <TableCell className="text-xs">{row['Account Full Name']}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row['Transaction type'] === 'Invoice' ? 'Revenue' : 'Expense'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || (
                  // Disable only if expense reconciliation failed AND no overrides are checked at all
                  validationResults?.reconciliation && 
                  !validationResults.reconciliation.isAligned &&
                  !overrideDuplicates.expenseDatabase &&
                  !overrideDuplicates.expenseInFile &&
                  !overrideDuplicates.revenueDatabase &&
                  !overrideDuplicates.revenueInFile
                )}
              >
                {(() => {
                  if (isImporting) return 'Importing...';
                  
                  // Calculate how many duplicates will actually be skipped (accounting for overrides)
                  let expenseDBSkipped = validationResults?.databaseDuplicatesSkipped || 0;
                  let expenseInFileSkipped = validationResults?.inFileDuplicatesSkipped || 0;
                  let revenueDBSkipped = validationResults?.revenueDatabaseDuplicatesSkipped || 0;
                  let revenueInFileSkipped = validationResults?.revenueInFileDuplicatesSkipped || 0;
                  
                  if (overrideDuplicates.expenseDatabase) expenseDBSkipped = 0;
                  if (overrideDuplicates.expenseInFile) expenseInFileSkipped = 0;
                  if (overrideDuplicates.revenueDatabase) revenueDBSkipped = 0;
                  if (overrideDuplicates.revenueInFile) revenueInFileSkipped = 0;
                  
                  const totalSkipped = expenseDBSkipped + expenseInFileSkipped + revenueDBSkipped + revenueInFileSkipped;
                  const actualImportCount = csvData.length - totalSkipped;
                  
                  const overrideCount = [
                    overrideDuplicates.expenseDatabase && validationResults?.databaseDuplicatesSkipped,
                    overrideDuplicates.expenseInFile && validationResults?.inFileDuplicatesSkipped,
                    overrideDuplicates.revenueDatabase && validationResults?.revenueDatabaseDuplicatesSkipped,
                    overrideDuplicates.revenueInFile && validationResults?.revenueInFileDuplicatesSkipped
                  ].filter(Boolean).length;
                  
                  if (overrideCount > 0) {
                    return totalSkipped > 0
                      ? `Import ${actualImportCount} Transactions (${totalSkipped} duplicates skipped, ${overrideCount} override${overrideCount > 1 ? 's' : ''})`
                      : `Import ${actualImportCount} Transactions (${overrideCount} override${overrideCount > 1 ? 's' : ''})`;
                  }
                  
                  return totalSkipped > 0 
                    ? `Import ${actualImportCount} Transactions (${totalSkipped} duplicates skipped)`
                    : `Import ${actualImportCount} Transactions`;
                })()}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
};