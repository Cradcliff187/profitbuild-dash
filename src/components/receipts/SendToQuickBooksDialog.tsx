/**
 * Sidebar sheet shown after approving a receipt to optionally send to QuickBooks
 * Implements a 2-step wizard: Configure → Review & Send
 */

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksFeatureFlag } from '@/hooks/useFeatureFlag';
import { formatCurrency } from '@/lib/utils';

type WizardStep = 'configure' | 'review' | 'success';

interface SendToQuickBooksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
    id: string;
    amount: number;
    payee_name?: string;
    project_number?: string;
    project_name?: string;
    captured_at?: string;
    description?: string;
  };
  onComplete?: () => void;
}

export function SendToQuickBooksDialog({
  open,
  onOpenChange,
  receipt,
  onComplete,
}: SendToQuickBooksDialogProps) {
  const { data: featureFlag } = useQuickBooksFeatureFlag();
  const { isConnected, connection } = useQuickBooksConnection();
  const { preview, isPreviewing, previewData, sync, isSyncing } = useQuickBooksSync();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('configure');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('CreditCard');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      console.log('🔵 SendToQuickBooksDialog opening for receipt:', receipt.id);
      setCurrentStep('configure');
      setSelectedAccountId('');
      setSelectedPaymentType('CreditCard');
      setSyncError(null);
    }
  }, [open, receipt.id]);

  // Auto-load available accounts when dialog opens
  useEffect(() => {
    const loadInitialData = async () => {
      if (open && isConnected && !previewData) {
        try {
          console.log('🔵 Loading preview data for receipt:', receipt.id);
          const result = await preview({ 
            receiptId: receipt.id, 
            accountId: selectedAccountId || undefined, 
            paymentType: selectedPaymentType 
          });
          console.log('✅ Preview data loaded:', result);
          console.log('📊 Available accounts:', result?.availableAccounts?.length || 0);
        } catch (error) {
          console.error('❌ Failed to load initial data:', error);
        }
      }
    };
    
    loadInitialData();
  }, [open, isConnected, previewData, preview, receipt.id, selectedAccountId, selectedPaymentType]);

  // Set default account when preview loads
  useEffect(() => {
    if (previewData?.selectedAccount && !selectedAccountId) {
      setSelectedAccountId(previewData.selectedAccount.value);
    }
  }, [previewData, selectedAccountId]);

  // Don't show if feature is disabled
  if (!featureFlag?.enabled) {
    return null;
  }

  const handleLoadPreview = async () => {
    try {
      await preview({ 
        receiptId: receipt.id, 
        accountId: selectedAccountId || undefined, 
        paymentType: selectedPaymentType 
      });
    } catch (error) {
      console.error('❌ Failed to load preview:', error);
      toast.error('Failed to load QuickBooks accounts');
    }
  };

  const handleNextToReview = () => {
    if (!selectedAccountId || selectedAccountId === '') {
      toast.error('Please select a QuickBooks account');
      return;
    }

    // Preview data is already loaded - just move to review step
    setCurrentStep('review');
  };

  const handleBackToConfigure = () => {
    setCurrentStep('configure');
  };

  const handleSync = async () => {
    if (!selectedAccountId || selectedAccountId === '') {
      toast.error('Please select a QuickBooks account');
      return;
    }

    // Clear previous errors
    setSyncError(null);

    try {
      // Ensure minimum loading time for better UX (so user sees "Sending...")
      const startTime = Date.now();
      const minLoadingTime = 800; // ms

      const result = await sync({ 
        receiptId: receipt.id, 
        accountId: selectedAccountId, 
        paymentType: selectedPaymentType 
      });
      
      // Wait for minimum loading time if operation was too fast
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      if (result.success) {
        setCurrentStep('success');
        toast.success('✅ Receipt sent to QuickBooks!');
        // Show success screen for 4 seconds before auto-closing
        setTimeout(() => {
          onOpenChange(false);
          onComplete?.();
        }, 4000);
      } else {
        // Result came back but wasn't successful
        const errorMsg = result.error || 'Sync failed for unknown reason';
        console.error('❌ Sync failed:', errorMsg);
        setSyncError(errorMsg);
        toast.error(`QuickBooks Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Sync failed with exception:', error);
      const errorMessage = (error as Error).message || 'Failed to sync to QuickBooks';
      setSyncError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const getSelectedAccountName = () => {
    if (!previewData?.availableAccounts || !selectedAccountId || selectedAccountId === '') return 'Unknown';
    const account = previewData.availableAccounts.find(acc => acc.id === selectedAccountId);
    return account ? account.name : 'Unknown';
  };

  const getPaymentTypeLabel = () => {
    const labels: Record<string, string> = {
      'Cash': 'Cash',
      'CreditCard': 'Credit Card',
      'Check': 'Check',
      'DebitCard': 'Debit Card',
    };
    return labels[selectedPaymentType] || selectedPaymentType;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {/* Loading Overlay */}
        {isSyncing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Sending to QuickBooks...</p>
              <p className="text-xs text-muted-foreground">Please wait</p>
            </div>
          </div>
        )}
        
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {currentStep === 'configure' && 'Send to QuickBooks'}
            {currentStep === 'review' && 'Review Before Sending'}
            {currentStep === 'success' && 'Success!'}
          </SheetTitle>
          <SheetDescription>
            {currentStep === 'configure' && 'Configure how this receipt will be recorded in QuickBooks'}
            {currentStep === 'review' && 'Please review the details before sending'}
            {currentStep === 'success' && 'Receipt has been sent to QuickBooks'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">

        {/* Connection Warning */}
        {!isConnected && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              QuickBooks is not connected. Please connect in Settings first.
            </span>
          </div>
        )}

        {/* Step 1: Configure */}
        {currentStep === 'configure' && isConnected && (
          <div className="space-y-4">
            {/* Receipt Summary (Compact) */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium">{receipt.payee_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-base">{formatCurrency(receipt.amount)}</span>
              </div>
              {receipt.project_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{receipt.project_number}</span>
                </div>
              )}
              {receipt.captured_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {new Date(receipt.captured_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* QuickBooks Connection Badge */}
            {connection && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {connection.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
                </Badge>
                <span>→ {connection.company_name}</span>
              </div>
            )}

            {/* QuickBooks Account Selector */}
            <div className="space-y-2">
              <Label htmlFor="qb-account" className="text-sm font-medium">
                QuickBooks Expense Account <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={isPreviewing}
              >
                <SelectTrigger id="qb-account" className="w-full">
                  <SelectValue placeholder="Select an expense account..." />
                </SelectTrigger>
                <SelectContent>
                  {previewData?.availableAccounts && previewData.availableAccounts.length > 0 ? (
                    previewData.availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.name}</span>
                          {account.subAccount && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              Sub
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({account.type})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-accounts" disabled>
                      {isPreviewing ? 'Loading accounts...' : 'No accounts available'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!previewData?.availableAccounts && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {isPreviewing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading accounts...
                    </>
                  ) : (
                    'No accounts available'
                  )}
                </p>
              )}
            </div>

            {/* Payment Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="payment-type" className="text-sm font-medium">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPaymentType}
                onValueChange={setSelectedPaymentType}
                disabled={isPreviewing}
              >
                <SelectTrigger id="payment-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CreditCard">💳 Credit Card</SelectItem>
                  <SelectItem value="DebitCard">💳 Debit Card</SelectItem>
                  <SelectItem value="Check">📝 Check</SelectItem>
                  <SelectItem value="Cash">💵 Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {currentStep === 'review' && previewData && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <h4 className="font-semibold text-sm text-foreground/90">Receipt Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-medium">
                    {previewData.vendor?.name || receipt.payee_name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-base">{formatCurrency(receipt.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {receipt.captured_at 
                      ? new Date(receipt.captured_at).toLocaleDateString()
                      : 'Today'}
                  </span>
                </div>
                {previewData.projectNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project/WO#:</span>
                    <Badge variant="secondary" className="text-xs">
                      {previewData.projectNumber}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                Will be recorded in QuickBooks as:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium">{getPaymentTypeLabel()}</span>
                </div>
                {previewData.paymentSource && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Account:</span>
                    <span className="font-medium text-xs">
                      {previewData.paymentSource.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expense Category:</span>
                  <span className="font-medium text-xs">
                    {getSelectedAccountName()}
                  </span>
                </div>
                {previewData.projectNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Custom Field:</span>
                    <span className="font-medium text-xs">
                      Project/WO# = {previewData.projectNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {connection && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Badge variant="outline" className="text-[10px]">
                  {connection.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
                </Badge>
                <span>→ {connection.company_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {syncError && currentStep === 'review' && (
          <div className="flex items-start gap-2 text-red-700 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Failed to send to QuickBooks</p>
              <p className="text-xs mt-1">{syncError}</p>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <CheckCircle2 className="h-20 w-20 text-green-600 animate-in zoom-in duration-300" />
              <div className="absolute inset-0 h-20 w-20 rounded-full bg-green-600/20 animate-ping" style={{ animationDuration: '1s', animationIterationCount: '1' }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                Successfully Sent!
              </p>
              <p className="text-sm text-muted-foreground">
                Receipt has been recorded as a {getPaymentTypeLabel()} expense
              </p>
              {previewData?.projectNumber && (
                <Badge variant="secondary" className="text-xs mt-2">
                  Project: {previewData.projectNumber}
                </Badge>
              )}
            </div>
          </div>
        )}

        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-6 border-t">
          {currentStep === 'success' && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onComplete?.();
              }}
              className="w-full"
            >
              Close
            </Button>
          )}
          
          {currentStep === 'configure' && (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNextToReview}
                disabled={!selectedAccountId || selectedAccountId === '' || isPreviewing || !isConnected}
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Next: Review
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {currentStep === 'review' && (
            <>
              <Button
                variant="outline"
                onClick={handleBackToConfigure}
                disabled={isSyncing}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isSyncing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to QuickBooks
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
