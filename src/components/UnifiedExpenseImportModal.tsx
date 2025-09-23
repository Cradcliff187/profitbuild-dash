import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Upload, Receipt, ArrowRight } from "lucide-react";
import { TransactionImportModal } from "./TransactionImportModal";
import { EnhancedTransactionImportModal } from "./EnhancedTransactionImportModal";
import { ExpenseUpload } from "./ExpenseUpload";
import { Expense } from "@/types/expense";

interface UnifiedExpenseImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpensesImported: (expenses: Expense[]) => void;
  estimates: any[];
}

type ImportMethod = 'select' | 'quickbooks' | 'csv' | 'transactions';

export const UnifiedExpenseImportModal = ({
  open,
  onOpenChange,
  onExpensesImported,
  estimates
}: UnifiedExpenseImportModalProps) => {
  const [currentMethod, setCurrentMethod] = useState<ImportMethod>('select');
  const [showTransactionImport, setShowTransactionImport] = useState(false);
  const [showEnhancedImport, setShowEnhancedImport] = useState(false);

  const handleClose = () => {
    setCurrentMethod('select');
    onOpenChange(false);
  };

  const handleMethodSelect = (method: ImportMethod) => {
    if (method === 'transactions') {
      setShowTransactionImport(true);
      handleClose();
    } else if (method === 'quickbooks') {
      setShowEnhancedImport(true);
      handleClose();
    } else {
      setCurrentMethod(method);
    }
  };

  const handleBackToSelect = () => {
    setCurrentMethod('select');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Expenses</span>
            </DialogTitle>
          </DialogHeader>

          {currentMethod === 'select' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Choose your import method based on your data source:
              </p>
              
              <div className="grid gap-4">
                <Card 
                  className="cursor-pointer transition-colors hover:bg-accent/50 border-primary/20"
                  onClick={() => handleMethodSelect('quickbooks')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span>QuickBooks Export</span>
                          <div className="text-xs text-primary font-normal">Recommended for QB users</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>
                      For CSV files exported directly from QuickBooks. Includes both revenue and expenses with automatic entity matching and project correlation.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleMethodSelect('csv')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                          <Upload className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <span>Standard CSV File</span>
                          <div className="text-xs text-muted-foreground font-normal">Expense-only imports</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>
                      For basic expense CSV files from other sources. Requires manual column mapping to expense fields.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleMethodSelect('transactions')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <FileDown className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <span>Bank Transactions</span>
                          <div className="text-xs text-muted-foreground font-normal">Direct bank imports</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>
                      Import transaction files directly from your bank or financial institution for expense tracking.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Not sure which to choose?</strong> If you exported data from QuickBooks, use "QuickBooks Export". For other expense files, use "Standard CSV File".
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentMethod === 'csv' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToSelect}
                  className="p-0 h-auto"
                >
                  ← Back to options
                </Button>
              </div>
              <ExpenseUpload
                onExpensesImported={(expenses) => {
                  onExpensesImported(expenses);
                  handleClose();
                }}
                estimates={estimates}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TransactionImportModal
        open={showTransactionImport}
        onOpenChange={setShowTransactionImport}
        onTransactionsImported={() => {
          // Transaction import modal will handle its own success callback
          onExpensesImported([]);
        }}
      />
      
      <EnhancedTransactionImportModal
        open={showEnhancedImport}
        onOpenChange={setShowEnhancedImport}
        onTransactionsImported={() => {
          // Enhanced import modal handles both expenses and revenues internally
          onExpensesImported([]);
        }}
      />
    </>
  );
};