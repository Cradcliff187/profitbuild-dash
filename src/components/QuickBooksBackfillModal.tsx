import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface MatchedExpense {
  dbId: string;
  qbId: string;
  date: string;
  amount: number;
  vendor: string;
  confidence: 'exact' | 'fuzzy';
}

interface MatchedRevenue {
  dbId: string;
  qbId: string;
  date: string;
  amount: number;
  customer: string;
  confidence: 'exact';
}

interface BackfillResult {
  success: boolean;
  dryRun: boolean;
  expensesMatched: number;
  revenuesMatched: number;
  expensesUpdated: number;
  revenuesUpdated: number;
  unmatchedExpenses: number;
  unmatchedRevenues: number;
  matches: {
    expenses: MatchedExpense[];
    revenues: MatchedRevenue[];
  };
  errors: string[];
  durationMs: number;
}

interface QuickBooksBackfillModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'preview' | 'processing' | 'complete';

export const QuickBooksBackfillModal: React.FC<QuickBooksBackfillModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<BackfillResult | null>(null);
  const [finalResult, setFinalResult] = useState<BackfillResult | null>(null);

  const handleClose = () => {
    if (!isLoading) {
      setStep('preview');
      setPreviewResult(null);
      setFinalResult(null);
      onClose();
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);

    try {
      // Use Supabase client's invoke method instead of fetch
      const { data, error: invokeError } = await supabase.functions.invoke(
        'quickbooks-backfill-ids',
        {
          body: { dryRun: true }
        }
      );

      console.log('Invoke result:', { data, invokeError });

      if (invokeError) {
        console.error('Invoke error details:', invokeError);
        throw new Error(invokeError.message || invokeError.toString() || 'Preview failed');
      }

      if (!data) {
        throw new Error('No data returned from function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Preview failed');
      }

      setPreviewResult(data as BackfillResult);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error("Preview Failed", { description: error instanceof Error ? error.message : "Unknown error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBackfill = async () => {
    setIsLoading(true);
    setStep('processing');

    try {
      // Use Supabase client's invoke method instead of fetch
      const { data, error: invokeError } = await supabase.functions.invoke(
        'quickbooks-backfill-ids',
        {
          body: { dryRun: false }
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Backfill failed');
      }

      if (!data) {
        throw new Error('No data returned from function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Backfill failed');
      }

      const result = data as BackfillResult;
      setFinalResult(result);
      setStep('complete');
      
      toast.success("Backfill Complete", { description: `Updated ${result.expensesUpdated} expenses and ${result.revenuesUpdated} revenues` });

      onSuccess();
    } catch (error) {
      console.error('Backfill error:', error);
      toast.error("Backfill Failed", { description: error instanceof Error ? error.message : "Unknown error occurred" });
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewStep = () => {
    if (!previewResult) {
      return (
        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a <strong>one-time reconciliation tool</strong> to backfill QuickBooks transaction IDs onto existing database records. 
              This helps prevent duplicate imports when syncing from QuickBooks.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What This Does:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Fetches ALL transactions from QuickBooks (no date filter)</li>
              <li>Matches against database records without QuickBooks IDs</li>
              <li>Uses date + amount + vendor/customer name matching</li>
              <li>Excludes time entries (internal labor)</li>
              <li>Shows preview before making any changes</li>
            </ul>
          </div>

          <Button onClick={handlePreview} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Preview...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview Matches
              </>
            )}
          </Button>
        </div>
      );
    }

    const { matches } = previewResult;
    const allMatches = [
      ...matches.expenses.map(e => ({ ...e, type: 'Expense' as const })),
      ...matches.revenues.map(r => ({ ...r, type: 'Revenue' as const }))
    ];

    return (
      <div className="space-y-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Review the matches below. These records will be updated with QuickBooks IDs to prevent future duplicates.
          </AlertDescription>
        </Alert>

        {/* Summary Stats */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{previewResult.expensesMatched}</div>
              <div className="text-xs text-gray-600 mt-1">Expenses Matched</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{previewResult.revenuesMatched}</div>
              <div className="text-xs text-gray-600 mt-1">Revenues Matched</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{previewResult.unmatchedExpenses}</div>
              <div className="text-xs text-gray-600 mt-1">Unmatched Expenses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{previewResult.unmatchedRevenues}</div>
              <div className="text-xs text-gray-600 mt-1">Unmatched Revenues</div>
            </div>
          </div>
        </div>

        {/* Matches Table */}
        {allMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Sample Matches ({allMatches.length} shown, {previewResult.expensesMatched + previewResult.revenuesMatched} total)
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Type</TableHead>
                    <TableHead className="text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-xs font-medium">Name</TableHead>
                    <TableHead className="text-xs font-medium">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMatches.slice(0, 10).map((match, index) => {
                    const isRevenue = match.type === 'Revenue';
                    const name = 'vendor' in match ? match.vendor : match.customer;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-xs py-2">
                          {new Date(match.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge 
                            variant={isRevenue ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {match.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono">
                          {formatCurrency(match.amount)}
                        </TableCell>
                        <TableCell className="text-xs py-2 max-w-[200px] truncate">
                          {name}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge 
                            variant={match.confidence === 'exact' ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {match.confidence}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {allMatches.length > 10 && (
                <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                  Showing 10 of {allMatches.length} matches in preview
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Matches */}
        {allMatches.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-700">No Matches Found</h4>
            <p className="text-sm text-gray-500 mt-1">
              All existing records either already have QuickBooks IDs or don't match any QuickBooks transactions.
            </p>
          </div>
        )}

        {/* Warnings */}
        {previewResult.unmatchedExpenses > 0 || previewResult.unmatchedRevenues > 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Unmatched records may be manual entries or not present in QuickBooks. 
              These will remain without QuickBooks IDs and could potentially be re-imported during future syncs.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  };

  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Updating Records...</h3>
        <p className="text-sm text-gray-600">
          Backfilling QuickBooks IDs. This may take a few moments.
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!finalResult) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          {finalResult.success ? (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Backfill Complete!</h3>
              <p className="text-sm text-gray-600">
                Successfully updated {finalResult.expensesUpdated + finalResult.revenuesUpdated} records with QuickBooks IDs
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Backfill Completed with Errors</h3>
              <p className="text-sm text-gray-600">Some updates failed</p>
            </>
          )}
        </div>

        {/* Results Summary */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">Results Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Expenses Updated</div>
              <div className="text-2xl font-bold text-green-600">{finalResult.expensesUpdated}</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Revenues Updated</div>
              <div className="text-2xl font-bold text-green-600">{finalResult.revenuesUpdated}</div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {finalResult.success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">What's next?</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>QuickBooks sync will now detect these as duplicates</li>
                <li>Future syncs will only import new transactions</li>
                <li>This tool can be run again if needed</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {finalResult.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Errors ({finalResult.errors.length}):</strong>
              <div className="mt-1 max-h-20 overflow-y-auto text-xs">
                {finalResult.errors.slice(0, 3).map((error, idx) => (
                  <div key={idx}>• {error}</div>
                ))}
                {finalResult.errors.length > 3 && (
                  <div>... and {finalResult.errors.length - 3} more</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            QuickBooks ID Backfill
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'preview' && renderPreviewStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          {step === 'preview' && !previewResult && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === 'preview' && previewResult && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmBackfill} 
                disabled={isLoading || previewResult.expensesMatched + previewResult.revenuesMatched === 0}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirm Backfill ({previewResult.expensesMatched + previewResult.revenuesMatched} records)
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
