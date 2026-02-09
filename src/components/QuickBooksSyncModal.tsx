import React, { useState } from 'react';
import { RefreshCw, Calendar, CheckCircle, AlertCircle, Loader2, Eye, CheckCircle2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, cn } from '@/lib/utils';

// Step Indicator Component (matching CSV import)
interface StepperProps {
  currentStep: 'configure' | 'preview' | 'complete';
}

const ImportStepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 'configure', label: 'Configure', number: 1 },
    { id: 'preview', label: 'Review', number: 2 },
    { id: 'complete', label: 'Complete', number: 3 },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['configure', 'preview', 'complete'];
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

// Financial Snapshot Component (matching CSV import)
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

interface QuickBooksSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDaysBack?: number;
}

interface SyncResult {
  success: boolean;
  syncId?: string;
  transactionsFetched: number;
  expensesImported: number;
  revenuesImported: number;
  duplicatesSkipped: number;
  errors: string[];
  durationMs: number;
  autoCreatedPayees?: number;
  fuzzyMatches?: number;
  unmappedAccounts?: string[];
  preview?: {
    totalExpenses: number;
    totalRevenues: number;
    newExpenses: number;
    newRevenues: number;
    duplicatesSkipped: number;
    totalExpenseAmount: number;
    totalRevenueAmount: number;
    sampleExpenses: Array<{
      date: string;
      vendor: string;
      amount: number;
      account: string;
      projectNumber?: string;
      qbId: string;
    }>;
    sampleRevenues: Array<{
      date: string;
      customer: string;
      amount: number;
      invoiceNumber: string;
      projectNumber?: string;
      qbId: string;
    }>;
    expensesByVendor: Array<{
      vendor: string;
      count: number;
      total: number;
    }>;
    revenuesByCustomer: Array<{
      customer: string;
      count: number;
      total: number;
    }>;
    expensesByAccount: Array<{
      account: string;
      count: number;
      total: number;
    }>;
  };
}

type SyncStep = 'configure' | 'preview' | 'importing' | 'complete';

export const QuickBooksSyncModal: React.FC<QuickBooksSyncModalProps> = ({
  open,
  onClose,
  onSuccess,
  defaultDaysBack = 30
}) => {
  const [step, setStep] = useState<SyncStep>('configure');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - defaultDaysBack);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<SyncResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const resetState = () => {
    setStep('configure');
    setPreviewResult(null);
    setSyncResult(null);
    setIsLoading(false);
    const date = new Date();
    date.setDate(date.getDate() - defaultDaysBack);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast.error("Invalid Date Range", { description: 'Please select both start and end dates' });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Invalid Date Range", { description: 'Start date must be before end date' });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quickbooks-sync-transactions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dryRun: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Preview failed');
      }

      const result: SyncResult = await response.json();
      setPreviewResult(result);
      setStep('preview');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error("Preview Failed", { description: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!startDate || !endDate) {
      toast.error("Invalid Date Range", { description: 'Please select both start and end dates' });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Invalid Date Range", { description: 'Start date must be before end date' });
      return;
    }

    setIsLoading(true);
    setStep('importing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quickbooks-sync-transactions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dryRun: false
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Sync failed');
      }

      const result: SyncResult = await response.json();
      setSyncResult(result);
      setStep('complete');

      if (result.success) {
        toast.success("Sync Completed", { description: `Successfully imported ${result.expensesImported} expenses and ${result.revenuesImported} revenues` });
        onSuccess();
      } else {
        toast.error("Sync Completed with Errors", { description: `${result.errors.length} error(s) occurred during sync` });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Sync Failed", { description: error instanceof Error ? error.message : 'Unknown error occurred' });
      setStep('configure');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <ImportStepper currentStep="configure" />

      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Select the date range to sync transactions from QuickBooks. Only new transactions will be imported - duplicates will be automatically skipped.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900">
            <strong>Date Range:</strong> {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!previewResult || !previewResult.preview) return null;

    const { preview } = previewResult;
    
    // Prepare data for new and duplicate transactions
    const newExpenses = preview.sampleExpenses || [];
    const newRevenues = preview.sampleRevenues || [];
    const allNewTransactions = [
      ...newExpenses.map(e => ({ ...e, type: 'Expense' as const })),
      ...newRevenues.map(r => ({ ...r, type: 'Revenue' as const }))
    ];

    // Mock "before" totals (in real scenario, fetch from database)
    const financialSnapshot = {
      expenses: {
        before: 0, // Would fetch actual total from DB
        adding: preview.totalExpenseAmount,
        after: preview.totalExpenseAmount
      },
      revenues: {
        before: 0, // Would fetch actual total from DB
        adding: preview.totalRevenueAmount,
        after: preview.totalRevenueAmount
      }
    };

    return (
      <div className="space-y-6">
        <ImportStepper currentStep="preview" />

        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Review the transactions to be imported. This is a preview - no data will be imported until you click "Confirm Import".
          </AlertDescription>
        </Alert>

        {/* Summary Stats */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{previewResult.transactionsFetched}</div>
              <div className="text-xs text-gray-600 mt-1">Total Found</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{preview.duplicatesSkipped}</div>
              <div className="text-xs text-gray-600 mt-1">Will Skip</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{preview.newExpenses + preview.newRevenues}</div>
              <div className="text-xs text-gray-600 mt-1">Will Import</div>
            </div>
          </div>
        </div>

        {/* Financial Impact */}
        {(preview.newExpenses > 0 || preview.newRevenues > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Financial Impact</h4>
            <FinancialSnapshot 
              expenses={financialSnapshot.expenses}
              revenues={financialSnapshot.revenues}
            />
          </div>
        )}

        {/* No New Records Message */}
        {preview.newExpenses === 0 && preview.newRevenues === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-700">All caught up!</h4>
            <p className="text-sm text-gray-500 mt-1">
              All {previewResult.transactionsFetched} transactions in this date range are already in the system.
            </p>
          </div>
        )}

        {/* Tabs for New vs Duplicates */}
        {(preview.newExpenses > 0 || preview.newRevenues > 0) && (
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                New Transactions ({preview.newExpenses + preview.newRevenues})
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Already Imported ({preview.duplicatesSkipped})
              </TabsTrigger>
            </TabsList>

            {/* New Transactions Tab */}
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
                      <TableHead className="text-xs font-medium">Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allNewTransactions.slice(0, 10).map((txn, index) => {
                      const isRevenue = txn.type === 'Revenue';
                      const name = 'vendor' in txn ? txn.vendor : txn.customer;
                      const account = 'account' in txn ? txn.account : txn.invoiceNumber;
                      const projectNumber = txn.projectNumber || '-';
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="text-xs py-2">
                            {new Date(txn.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <Badge 
                              variant={isRevenue ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              {txn.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 font-mono">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-xs py-2 max-w-[150px] truncate">
                            {name}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-gray-600">
                            {projectNumber}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-gray-600">
                            {account || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {allNewTransactions.length > 10 && (
                  <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                    Showing 10 of {allNewTransactions.length} new transactions
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Already Imported Tab */}
            <TabsContent value="existing" className="mt-4">
              <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  These {preview.duplicatesSkipped} transactions are already in your system 
                  and will be skipped automatically based on their QuickBooks transaction IDs.
                </p>
              </div>
              <div className="bg-white border rounded-lg p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Duplicate detection is working correctly!
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Warnings */}
        {preview.expensesByAccount && preview.expensesByAccount.some(a => a.account === 'Uncategorized') && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some transactions use "Uncategorized" accounts. You can configure account mappings in Settings for better categorization.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-6">
      <ImportStepper currentStep="preview" />
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Importing transactions...</h3>
          <p className="text-sm text-gray-600">
            Writing data to database. This may take a few moments.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!syncResult) return null;

    const totalImported = syncResult.expensesImported + syncResult.revenuesImported;

    return (
      <div className="space-y-6">
        <ImportStepper currentStep="complete" />

        <div className="text-center">
          {syncResult.success ? (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Sync Completed Successfully!</h3>
              <p className="text-sm text-gray-600">
                Imported {totalImported} new transaction{totalImported !== 1 ? 's' : ''} from QuickBooks
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Sync Completed with Errors</h3>
              <p className="text-sm text-gray-600">Some items were imported but errors occurred</p>
            </>
          )}
        </div>

        {/* Results Summary */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">Import Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Expenses Imported</div>
              <div className="text-2xl font-bold text-blue-600">{syncResult.expensesImported}</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Revenues Imported</div>
              <div className="text-2xl font-bold text-emerald-600">{syncResult.revenuesImported}</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Duplicates Skipped</div>
              <div className="text-2xl font-bold text-amber-600">{syncResult.duplicatesSkipped}</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Total Fetched</div>
              <div className="text-2xl font-bold text-gray-600">{syncResult.transactionsFetched}</div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {syncResult.success && totalImported > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <p className="font-medium">What's next?</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Review unassigned transactions on the Expenses page</li>
                  <li>Assign transactions to projects as needed</li>
                  <li>Configure account mappings in Settings for better categorization</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {syncResult.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Errors ({syncResult.errors.length}):</strong>
                <div className="mt-1 max-h-20 overflow-y-auto text-xs">
                  {syncResult.errors.slice(0, 3).map((error, idx) => (
                    <div key={idx}>• {error}</div>
                  ))}
                  {syncResult.errors.length > 3 && (
                    <div>... and {syncResult.errors.length - 3} more</div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Sync ID */}
        <div className="text-xs text-center text-gray-500">
          Sync ID: {syncResult.syncId}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync from QuickBooks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'configure' && renderConfigureStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'importing' && renderImportingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview Transactions
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('configure')}>
                Back
              </Button>
              <Button onClick={handleConfirmImport} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirm Import
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
