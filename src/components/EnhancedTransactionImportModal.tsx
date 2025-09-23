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
  parseEnhancedQuickBooksCSV, 
  processEnhancedQuickBooksImport, 
  EnhancedQBImportResult 
} from "@/utils/enhancedCsvParser";
import { Expense } from "@/types/expense";
import { ProjectRevenue } from "@/types/revenue";
import { useToast } from "@/hooks/use-toast";

interface EnhancedTransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionsImported: (expenses: Expense[], revenues: ProjectRevenue[]) => void;
}

type Step = 'upload' | 'processing' | 'review' | 'importing' | 'results';

export const EnhancedTransactionImportModal: React.FC<EnhancedTransactionImportModalProps> = ({
  open,
  onOpenChange,
  onTransactionsImported
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<EnhancedQBImportResult | null>(null);
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
      const parseResult = await parseEnhancedQuickBooksCSV(file);
      setProgress(40);

      if (parseResult.errors.length > 0) {
        toast({
          title: "Parsing Errors",
          description: `${parseResult.errors.length} errors found during parsing.`,
          variant: "destructive",
        });
      }

      setProgress(60);

      // Process transactions
      const result = await processEnhancedQuickBooksImport(parseResult.data, file.name);
      setImportResult(result);
      setProgress(80);

      // Set step based on results
      if (result.low_confidence_client_matches.length > 0 || result.low_confidence_payee_matches.length > 0) {
        setStep('review');
      } else {
        setStep('results');
        onTransactionsImported(result.expenses, result.revenues);
      }

      setProgress(100);

      toast({
        title: "Import Complete",
        description: `Processed ${result.revenue_transactions} invoices and ${result.expense_transactions} expenses.`,
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

  const handleCompleteImport = () => {
    if (importResult) {
      onTransactionsImported(importResult.expenses, importResult.revenues);
      setStep('results');
    }
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
          <strong>QuickBooks CSV files only:</strong> This import processes both invoices (revenue) and expenses from QuickBooks exports. 
          Make sure your file was exported directly from QuickBooks with standard headers and transaction types.
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
          Separating revenue and expenses, matching entities, and correlating with line items...
        </p>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="text-center text-sm text-muted-foreground">
        {progress < 40 && "Parsing QuickBooks format..."}
        {progress >= 40 && progress < 60 && "Validating transaction data..."}
        {progress >= 60 && progress < 80 && "Processing revenue and expenses..."}
        {progress >= 80 && "Finalizing import..."}
      </div>
    </div>
  );

  const renderReviewStep = () => {
    if (!importResult) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Review Entity Matches</h3>
            <p className="text-sm text-muted-foreground">
              Some clients and payees need manual review before import.
            </p>
          </div>
        </div>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList>
            <TabsTrigger value="clients">
              Client Matches ({importResult.low_confidence_client_matches.length})
            </TabsTrigger>
            <TabsTrigger value="payees">
              Payee Matches ({importResult.low_confidence_payee_matches.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clients" className="space-y-4">
            {importResult.low_confidence_client_matches.map((match, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">QuickBooks: {match.qbName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {match.suggestions.map((suggestion, sugIndex) => (
                      <div key={sugIndex} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{suggestion.client.client_name}</span>
                          {suggestion.client.company_name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({suggestion.client.company_name})
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary">{suggestion.confidence.toFixed(0)}% match</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="payees" className="space-y-4">
            {importResult.low_confidence_payee_matches.map((match, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">QuickBooks: {match.qbName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {match.suggestions.map((suggestion, sugIndex) => (
                      <div key={sugIndex} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{suggestion.payee.payee_name}</span>
                          {suggestion.payee.full_name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({suggestion.payee.full_name})
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary">{suggestion.confidence.toFixed(0)}% match</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCompleteImport}>
            Complete Import
          </Button>
        </div>
      </div>
    );
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
            Successfully processed {importResult.total} transactions
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
                Revenue ({importResult.successful_revenues} invoices)
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
                Expenses ({importResult.successful_expenses})
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
                {importResult.project_mapping_used.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Projects Affected
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entity Matching Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Auto-matched:</span>
                  <Badge variant="secondary">{importResult.client_matches.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Needs review:</span>
                  <Badge variant="outline">{importResult.low_confidence_client_matches.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Payee Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Auto-matched:</span>
                  <Badge variant="secondary">{importResult.payee_matches.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Needs review:</span>
                  <Badge variant="outline">{importResult.low_confidence_payee_matches.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Item Correlations */}
        <Card>
          <CardHeader>
            <CardTitle>Line Item Correlations</CardTitle>
            <CardDescription>
              How expenses were categorized against estimates and quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['estimated', 'quoted', 'unplanned', 'change_order'].map(type => {
                const count = importResult.line_item_correlations.filter(c => c.correlation_type === type).length;
                return (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{type.replace('_', ' ')}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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