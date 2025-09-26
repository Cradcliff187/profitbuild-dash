import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/lib/utils';

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
  };

  const handleClose = () => {
    resetState();
    onClose();
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
        successCount
      };

      setImportResults(finalResults);
      setStep('complete');

      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} transaction${successCount === 1 ? '' : 's'}${errorMessages.length > 0 ? ` with ${errorMessages.length} error${errorMessages.length === 1 ? '' : 's'}` : ''}`,
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
                <div>
                  <span className="font-medium">Will be Unassigned:</span> {csvData.filter(row => !row['Project/WO #'] || row['Project/WO #'].trim() === '').length}
                </div>
              </div>
              
              {csvData.filter(row => !row['Project/WO #'] || row['Project/WO #'].trim() === '').length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Transactions without Project/WO # will be imported to the "000-UNASSIGNED" project and can be reassigned later.
                  </p>
                </div>
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
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importing...' : `Import ${csvData.length} Transactions`}
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
              </div>
              
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