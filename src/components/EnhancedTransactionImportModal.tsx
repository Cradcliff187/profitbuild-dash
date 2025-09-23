import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileDown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
  Building2
} from "lucide-react";
import { 
  parseTransactionCSV, 
  processTransactionImport, 
  TransactionImportResult,
  ExpenseImportData,
  RevenueImportData
} from "@/utils/enhancedTransactionImporter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnhancedTransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionsImported: () => void;
}

type Step = 'upload' | 'processing' | 'review' | 'importing' | 'results';

export const EnhancedTransactionImportModal: React.FC<EnhancedTransactionImportModalProps> = ({
  open,
  onOpenChange,
  onTransactionsImported
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<TransactionImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

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
      // Parse CSV
      const parseResult = await parseTransactionCSV(file);
      setProgress(40);

      if (parseResult.errors.length > 0) {
        toast({
          title: "Parsing Errors",
          description: `${parseResult.errors.length} errors found during parsing.`,
          variant: "destructive",
        });
        return;
      }

      setProgress(60);

      // Process transactions
      const result = await processTransactionImport(parseResult.data);
      setImportResult(result);
      setProgress(80);

      // Import to database
      await importToDatabase(result);
      setProgress(100);

      setStep('results');

      toast({
        title: "Import Complete",
        description: `Processed ${result.revenues.length} invoices and ${result.expenses.length} expenses.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to process transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const importToDatabase = async (result: TransactionImportResult) => {
    // Import expenses
    if (result.expenses.length > 0) {
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert(result.expenses);
      
      if (expenseError) {
        console.error('Failed to import expenses:', expenseError);
        throw new Error('Failed to import expenses');
      }
    }

    // Import revenues  
    if (result.revenues.length > 0) {
      const { error: revenueError } = await supabase
        .from('project_revenues')
        .insert(result.revenues);
      
      if (revenueError) {
        console.error('Failed to import revenues:', revenueError);
        throw new Error('Failed to import revenues');
      }
    }

    onTransactionsImported();
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setImportResult(null);
    setProgress(0);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>QuickBooks Transaction Export:</strong> This import automatically separates invoices (revenue) and expenses based on transaction type. 
          Uses Account Full Name for categorization and Project/WO # for project assignment. Unassociated items can be assigned later.
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
          Drag and drop your transaction file here, or click to browse
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
          Process Transactions
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileDown className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Processing Financial Data</h3>
        <p className="text-sm text-muted-foreground">
          Separating invoices and expenses, matching clients/payees, and importing to database...
        </p>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="text-center text-sm text-muted-foreground">
        {progress < 40 && "Parsing transaction file..."}
        {progress >= 40 && progress < 60 && "Validating transaction data..."}
        {progress >= 60 && progress < 80 && "Processing revenue and expenses..."}
        {progress >= 80 && "Importing to database..."}
      </div>
    </div>
  );

  const renderReviewStep = () => {
    // This step is no longer needed since we auto-import
    return null;
  };

  const renderResultsStep = () => {
    if (!importResult) return null;

    const totalRevenue = importResult.revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = importResult.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Import Complete</h3>
          <p className="text-sm text-muted-foreground">
            Successfully processed {importResult.expenses.length + importResult.revenues.length} transactions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Revenue ({importResult.revenues.length} invoices)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Receipt className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </div>
              <div className="text-sm text-muted-foreground">
                Expenses ({importResult.expenses.length})
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </div>
              <div className="text-sm text-muted-foreground">
                Net Profit
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {importResult.unassociated_expenses + importResult.unassociated_revenues}
              </div>
              <div className="text-sm text-muted-foreground">
                Unassociated Items
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Mapping Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Category Mappings Used
            </CardTitle>
            <CardDescription>
              QuickBooks account paths mapped to expense categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(importResult.category_mappings_used).map(([account, category]) => (
                <div key={account} className="flex justify-between text-sm">
                  <span className="truncate">{account}</span>
                  <Badge variant="secondary">{category}</Badge>
                </div>
              ))}
              {Object.keys(importResult.category_mappings_used).length === 0 && (
                <p className="text-sm text-muted-foreground">No specific category mappings used</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unassociated Items Alert */}
        {(importResult.unassociated_expenses > 0 || importResult.unassociated_revenues > 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {importResult.unassociated_expenses > 0 && `${importResult.unassociated_expenses} expenses `}
              {importResult.unassociated_revenues > 0 && `${importResult.unassociated_revenues} revenues `}
              were imported without project assignments. You can assign them to projects in the matching interface.
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {importResult.errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {importResult.errors.length} errors occurred during import. Check the console for details.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Enhanced QuickBooks Import</DialogTitle>
        </DialogHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};