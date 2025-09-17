import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileDown, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { parseQuickBooksCSV, mapQuickBooksToExpenses, QBParseResult, QBImportResult, PayeeMatchInfo } from "@/utils/csvParser";
import { PartialPayee } from "@/utils/fuzzyPayeeMatcher";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionsImported: (expenses: Expense[]) => void;
}

type Step = 'upload' | 'processing' | 'results';

export const TransactionImportModal: React.FC<TransactionImportModalProps> = ({
  open,
  onOpenChange,
  onTransactionsImported
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<QBParseResult | null>(null);
  const [importResult, setImportResult] = useState<QBImportResult | null>(null);
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

      // Process and import transactions
      const importResult = await mapQuickBooksToExpenses(result.data, file.name);
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

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setImportResult(null);
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
          Parsing QuickBooks format and matching projects and vendors...
        </p>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="text-center text-sm text-muted-foreground">
        {progress < 40 && "Parsing CSV file..."}
        {progress >= 40 && progress < 60 && "Validating data..."}
        {progress >= 60 && progress < 80 && "Matching projects and vendors..."}
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

      {/* Fuzzy Match Results */}
      {importResult && importResult.fuzzyMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Vendor Matches Found ({importResult.fuzzyMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {importResult.fuzzyMatches.map((match, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{match.qbName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">→</span>
                    <span>{match.matchedPayee.vendor_name}</span>
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

      {/* Low Confidence Matches */}
      {importResult && importResult.lowConfidenceMatches.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Potential Vendor Matches:</strong>
            <div className="mt-2 space-y-2">
              {importResult.lowConfidenceMatches.map((item, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{item.qbName}</span>
                  <div className="ml-4 mt-1">
                    {item.suggestions.map((suggestion, suggestionIndex) => (
                      <div key={suggestionIndex} className="flex items-center gap-2">
                        <span className="text-muted-foreground">• {suggestion.payee.vendor_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs">
              Review these potential matches and update your vendor records as needed.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {importResult && importResult.unmatchedVendors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>New Vendors Found:</strong> {importResult.unmatchedVendors.join(', ')}
            <br />
            These vendors were not found in your system. Consider adding them to your vendor list.
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import QuickBooks Transactions</DialogTitle>
        </DialogHeader>
        
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};