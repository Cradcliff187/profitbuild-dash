import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Upload, FileDown, CheckCircle, XCircle, AlertTriangle, Settings, Filter, Save } from "lucide-react";
import { parseQuickBooksCSV, mapQuickBooksToExpenses, QBParseResult, QBImportResult, PayeeMatchInfo, QBTransaction } from "@/utils/csvParser";
import { Expense, ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from "@/types/expense";
import { PartialPayee } from "@/utils/fuzzyPayeeMatcher";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types for preview functionality
interface PreviewTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  name: string;
  account_path?: string;
  originalCategory: ExpenseCategory;
  currentCategory: ExpenseCategory;
  mappingSource: 'database' | 'static' | 'description' | 'preference' | 'default';
  matchedPayee?: PartialPayee;
  payeeMatchConfidence?: number;
}

interface ImportPreferences {
  accountMappings: Record<string, ExpenseCategory>;
  lastUpdated: string;
  version: number;
}

interface TransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionsImported: (expenses: Expense[]) => void;
}

type Step = 'upload' | 'processing' | 'preview' | 'importing' | 'results';

export const TransactionImportModal: React.FC<TransactionImportModalProps> = ({
  open,
  onOpenChange,
  onTransactionsImported
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<QBParseResult | null>(null);
  const [importResult, setImportResult] = useState<QBImportResult | null>(null);
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // User preferences utilities
  const loadImportPreferences = (): ImportPreferences => {
    try {
      const stored = localStorage.getItem('qb-import-preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { accountMappings: {}, lastUpdated: new Date().toISOString(), version: 1 };
  };

  const saveImportPreferences = (preferences: ImportPreferences) => {
    try {
      localStorage.setItem('qb-import-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const applyPreferencesToTransactions = (transactions: QBTransaction[]): ExpenseCategory[] => {
    const preferences = loadImportPreferences();
    return transactions.map(transaction => {
      // Check if user has a preference for this account path
      if (transaction.account_path && preferences.accountMappings[transaction.account_path]) {
        return preferences.accountMappings[transaction.account_path];
      }
      // Fall back to automatic categorization using inline logic
      const desc = (transaction.description || transaction.name || '').toLowerCase();
      
      // Simple categorization logic
      if (desc.includes('labor') || desc.includes('wage')) {
        return ExpenseCategory.LABOR;
      }
      if (desc.includes('contractor') || desc.includes('subcontractor')) {
        return ExpenseCategory.SUBCONTRACTOR;
      }
      if (desc.includes('material') || desc.includes('supply')) {
        return ExpenseCategory.MATERIALS;
      }
      if (desc.includes('equipment') || desc.includes('rental')) {
        return ExpenseCategory.EQUIPMENT;
      }
      if (desc.includes('permit') || desc.includes('fee')) {
        return ExpenseCategory.PERMITS;
      }
      if (desc.includes('management') || desc.includes('admin')) {
        return ExpenseCategory.MANAGEMENT;
      }
      
      return ExpenseCategory.OTHER;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsImporting(true);
    setStep('processing');
    setProgress(20);

    try {
      // Parse QuickBooks CSV
      const result = await parseQuickBooksCSV(file);
      setParseResult(result);
      setProgress(40);

      if (result.errors.length > 0) {
        toast({
          title: "Parsing Errors",
          description: `${result.errors.length} errors found during parsing.`,
          variant: "destructive",
        });
      }

      setProgress(60);

      // Create preview transactions with applied preferences
      const categoryMappings = applyPreferencesToTransactions(result.data);
      const preview: PreviewTransaction[] = result.data.map((transaction, index) => ({
        id: crypto.randomUUID(),
        date: transaction.date,
        description: transaction.description || transaction.name || 'Unknown transaction',
        amount: typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount,
        name: transaction.name,
        account_path: transaction.account_path,
        originalCategory: categoryMappings[index],
        currentCategory: categoryMappings[index],
        mappingSource: transaction.account_path && loadImportPreferences().accountMappings[transaction.account_path]
          ? 'preference' 
          : 'default'
      }));

      setPreviewTransactions(preview);
      setProgress(100);
      setStep('preview');

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle proceeding from preview to actual import
  const handleProceedWithImport = async () => {
    if (!file || !parseResult) return;

    setIsImporting(true);
    setStep('importing');
    setProgress(20);

    try {
      // Convert preview transactions back to QB format for processing
      const qbTransactions: QBTransaction[] = previewTransactions.map(preview => ({
        date: preview.date,
        description: preview.description,
        amount: preview.amount.toString(),
        name: preview.name,
        account_path: preview.account_path || '',
        transaction_type: 'expense',
        project_wo_number: ''
      }));

      // Process with updated categories
      const importResult = await mapQuickBooksToExpenses(qbTransactions, file.name);
      setProgress(60);

      // Apply category changes from preview
      importResult.expenses.forEach((expense, index) => {
        if (index < previewTransactions.length) {
          expense.category = previewTransactions[index].currentCategory;
        }
      });

      setProgress(80);

      // Save to database
      const expensesToInsert = importResult.expenses.map(expense => ({
        project_id: expense.project_id,
        description: expense.description,
        category: expense.category,
        transaction_type: expense.transaction_type,
        amount: expense.amount,
        expense_date: expense.expense_date.toISOString().split('T')[0],
        payee_id: expense.payee_id,
        is_planned: false
      }));

      const { data: insertedExpenses, error } = await supabase
        .from('expenses')
        .insert(expensesToInsert)
        .select();

      if (error) throw error;

      setProgress(100);
      setImportResult(importResult);
      setStep('results');

      // Transform and notify parent
      const transformedExpenses: Expense[] = (insertedExpenses || []).map(expense => ({
        ...expense,
        category: expense.category as ExpenseCategory,
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
      }));

      onTransactionsImported(transformedExpenses);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${importResult.successful} transactions.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle category changes in preview
  const handleCategoryChange = (transactionId: string, newCategory: ExpenseCategory) => {
    setPreviewTransactions(prev => 
      prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, currentCategory: newCategory, mappingSource: 'preference' }
          : transaction
      )
    );
  };

  // Handle bulk category change
  const handleBulkCategoryChange = (accountPath: string, newCategory: ExpenseCategory) => {
    setPreviewTransactions(prev =>
      prev.map(transaction =>
        transaction.account_path === accountPath
          ? { ...transaction, currentCategory: newCategory, mappingSource: 'preference' }
          : transaction
      )
    );
  };

  // Save user preferences
  const handleSavePreferences = () => {
    const preferences = loadImportPreferences();
    const newMappings: Record<string, ExpenseCategory> = {};
    
    previewTransactions.forEach(transaction => {
      if (transaction.account_path && transaction.mappingSource === 'preference') {
        newMappings[transaction.account_path] = transaction.currentCategory;
      }
    });

    const updatedPreferences: ImportPreferences = {
      ...preferences,
      accountMappings: { ...preferences.accountMappings, ...newMappings },
      lastUpdated: new Date().toISOString()
    };

    saveImportPreferences(updatedPreferences);
    
    toast({
      title: "Preferences Saved",
      description: "Your category preferences have been saved for future imports.",
    });
  };

  // Filter transactions for preview
  const filteredTransactions = previewTransactions.filter(transaction => {
    const matchesSearch = !searchFilter || 
      transaction.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      transaction.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (transaction.account_path && transaction.account_path.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || transaction.currentCategory === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique account paths for bulk operations
  const uniqueAccountPaths = Array.from(new Set(
    previewTransactions
      .map(t => t.account_path)
      .filter(Boolean)
  ));

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    setPreviewTransactions([]);
    setSelectedTransactions(new Set());
    setSearchFilter('');
    setCategoryFilter('all');
    setProgress(0);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This import is designed for QuickBooks transaction exports. Make sure your CSV file includes the first 4 header rows that QuickBooks automatically adds.
        </AlertDescription>
      </Alert>

      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">
          {file ? file.name : 'Upload QuickBooks CSV'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop your file here, or click to browse
        </p>
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={!file}>
          Import Transactions
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileDown className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Processing Transactions</h3>
        <p className="text-sm text-muted-foreground">
          Parsing QuickBooks format and applying categorization rules...
        </p>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="text-center text-sm text-muted-foreground">
        {progress < 40 && "Parsing CSV file..."}
        {progress >= 40 && progress < 60 && "Validating data..."}
        {progress >= 60 && "Preparing preview..."}
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Review & Adjust Categories</h3>
          <p className="text-sm text-muted-foreground">
            Review the categorized transactions and make adjustments before importing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSavePreferences}>
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">Transactions ({previewTransactions.length})</TabsTrigger>
          <TabsTrigger value="accounts">Account Mapping ({uniqueAccountPaths.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value: ExpenseCategory | 'all') => setCategoryFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.name}</div>
                        <div className="text-sm text-muted-foreground">{transaction.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{transaction.account_path || 'N/A'}</div>
                    </TableCell>
                    <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={transaction.currentCategory}
                        onValueChange={(value: ExpenseCategory) => 
                          handleCategoryChange(transaction.id, value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transaction.mappingSource === 'preference' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.mappingSource}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Bulk Account Mapping</h4>
            <p className="text-sm text-muted-foreground">
              Assign categories to all transactions from specific QuickBooks accounts.
            </p>
          </div>
          
          <div className="space-y-2">
            {uniqueAccountPaths.map(accountPath => {
              const transactionsForAccount = previewTransactions.filter(t => t.account_path === accountPath);
              const currentCategory = transactionsForAccount[0]?.currentCategory;
              
              return (
                <Card key={accountPath}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="font-medium">{accountPath}</div>
                      <div className="text-sm text-muted-foreground">
                        {transactionsForAccount.length} transactions
                      </div>
                    </div>
                    <Select
                      value={currentCategory}
                      onValueChange={(value: ExpenseCategory) => 
                        handleBulkCategoryChange(accountPath, value)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back to Upload
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleProceedWithImport}>
            Proceed with Import
          </Button>
        </div>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileDown className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Importing Transactions</h3>
        <p className="text-sm text-muted-foreground">
          Saving transactions to database with your category selections...
        </p>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="text-center text-sm text-muted-foreground">
        {progress < 40 && "Processing transactions..."}
        {progress >= 40 && progress < 80 && "Matching projects and payees..."}
        {progress >= 80 && "Saving to database..."}
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Import Complete</h3>
      </div>

      {importResult && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{importResult.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Successfully Imported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
            </CardContent>
          </Card>
          
          {importResult.failed > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
              </CardContent>
            </Card>
          )}

          {importResult.autoCreatedCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Auto-Created Payees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{importResult.autoCreatedCount}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {importResult && importResult.unmatchedProjects.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Unmatched Projects:</strong> {importResult.unmatchedProjects.join(', ')}
            <br />
            These transactions were assigned to a default project. Review and reassign as needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Created Payees */}
      {importResult && importResult.autoCreatedPayees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Auto-Created Payees ({importResult.autoCreatedPayees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {importResult.autoCreatedPayees.map((payee, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{payee.qbName}</span>
                  <Badge variant="outline" className="text-xs">
                    {payee.payeeType}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fuzzy Match Results */}
      {importResult && importResult.fuzzyMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Payee Matches Found ({importResult.fuzzyMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {importResult.fuzzyMatches.map((match, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{match.qbName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">→</span>
                    <span>{match.matchedPayee.payee_name}</span>
                    <Badge 
                      variant={match.confidence >= 85 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {Math.round(match.confidence)}%
                      {match.matchType === 'exact' ? ' exact' : 
                       match.matchType === 'auto' ? ' auto' : ' fuzzy'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && importResult.unmatchedPayees.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Unmatched Payees:</strong> {importResult.unmatchedPayees.join(', ')}
            <br />
            These payees could not be automatically created or matched. Consider adding them manually.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={resetModal}>
          Import Another File
        </Button>
        <Button onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import QuickBooks Transactions</DialogTitle>
        </DialogHeader>
        
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
        {step === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};