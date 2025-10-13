import React, { useState } from "react";
import { Check, AlertTriangle, ChevronDown, CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuoteStatus } from "@/types/quote";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuoteStatusSelectorProps {
  quoteId: string;
  currentStatus: QuoteStatus;
  quoteNumber: string;
  payeeName: string;
  projectId: string;
  totalAmount: number;
  onStatusChange?: (newStatus: QuoteStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export const QuoteStatusSelector = ({
  quoteId,
  currentStatus,
  quoteNumber,
  payeeName,
  projectId,
  totalAmount,
  onStatusChange,
  disabled = false,
  showLabel = false
}: QuoteStatusSelectorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<QuoteStatus | null>(null);

  const getStatusBadge = (status: QuoteStatus) => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize px-2 py-0.5",
          status === QuoteStatus.ACCEPTED && 'border-green-200 text-green-700 bg-green-50',
          status === QuoteStatus.PENDING && 'border-yellow-200 text-yellow-700 bg-yellow-50',
          status === QuoteStatus.REJECTED && 'border-red-200 text-red-700 bg-red-50',
          status === QuoteStatus.EXPIRED && 'border-gray-200 text-gray-700 bg-gray-50'
        )}
      >
        {status.toLowerCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.PENDING: return <Clock className="h-3 w-3" />;
      case QuoteStatus.ACCEPTED: return <CheckCircle className="h-3 w-3" />;
      case QuoteStatus.REJECTED: return <XCircle className="h-3 w-3" />;
      case QuoteStatus.EXPIRED: return <RotateCcw className="h-3 w-3" />;
      default: return null;
    }
  };

  const statusOptions: { value: QuoteStatus; label: string }[] = [
    { value: QuoteStatus.PENDING, label: 'Pending' },
    { value: QuoteStatus.ACCEPTED, label: 'Accepted' },
    { value: QuoteStatus.REJECTED, label: 'Rejected' },
    { value: QuoteStatus.EXPIRED, label: 'Expired' }
  ];

  const getStatusWarning = (targetStatus: QuoteStatus) => {
    if (targetStatus === QuoteStatus.ACCEPTED) {
      return {
        title: "Accept Quote",
        message: `Accepting this quote from ${payeeName} (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}) will:`,
        details: [
          "• Mark this quote as accepted",
          "• Record the acceptance date",
          "• Update project financial calculations",
          "• Show in 'Accepted Quotes' reports"
        ],
        severity: "info" as const
      };
    }
    return null;
  };

  const handleStatusSelect = (newStatus: QuoteStatus) => {
    if (newStatus === currentStatus) return;

    if (newStatus === QuoteStatus.REJECTED) {
      // Show rejection reason dialog
      setPendingStatus(newStatus);
      setShowRejectionDialog(true);
    } else {
      const warning = getStatusWarning(newStatus);
      if (warning) {
        setPendingStatus(newStatus);
        setShowConfirmDialog(true);
      } else {
        updateStatus(newStatus);
      }
    }
  };

  const updateStatus = async (newStatus: QuoteStatus, reason?: string) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Handle status-specific updates
      if (newStatus === QuoteStatus.ACCEPTED) {
        updateData.accepted_date = new Date().toISOString();
        updateData.rejection_reason = null;
      } else if (newStatus === QuoteStatus.REJECTED) {
        updateData.accepted_date = null;
        updateData.rejection_reason = reason;
      } else {
        updateData.accepted_date = null;
        updateData.rejection_reason = null;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);

      if (error) throw error;

      // Trigger project margin recalculation
      await supabase.rpc('calculate_project_margins', { project_id_param: projectId });

      toast({
        title: "Status Updated",
        description: `Quote ${quoteNumber} status changed to ${newStatus.toLowerCase()}`,
      });

      onStatusChange?.(newStatus);
      
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: "Error",
        description: "Failed to update quote status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setShowRejectionDialog(false);
      setPendingStatus(null);
      setRejectionReason("");
    }
  };

  const confirmStatusUpdate = () => {
    if (pendingStatus) {
      updateStatus(pendingStatus);
    }
  };

  const confirmRejection = () => {
    if (rejectionReason.trim().length < 10) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason (at least 10 characters)",
        variant: "destructive"
      });
      return;
    }
    if (pendingStatus) {
      updateStatus(pendingStatus, rejectionReason.trim());
    }
  };

  const statusExplanations: Record<QuoteStatus, string> = {
    [QuoteStatus.PENDING]: 'Quote is awaiting review and decision',
    [QuoteStatus.ACCEPTED]: 'Quote has been accepted for this work',
    [QuoteStatus.REJECTED]: 'Quote was declined or not selected',
    [QuoteStatus.EXPIRED]: 'Quote validity period has expired'
  };

  const warning = pendingStatus ? getStatusWarning(pendingStatus) : null;

  return (
    <>
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isLoading}
                    className="h-auto p-1 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-1">
                      {getStatusBadge(currentStatus)}
                      {!disabled && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => handleStatusSelect(status.value)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.value)}
                        <span>{status.label}</span>
                      </div>
                      {status.value === currentStatus && (
                        <Check className="h-3 w-3 text-success" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Review quotes carefully before accepting
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p><strong>Current:</strong> {statusExplanations[currentStatus]}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              {warning?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>{warning?.message}</p>
                {warning?.details && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <div className="text-sm space-y-1">
                      {warning.details.map((detail, idx) => (
                        <p key={idx}>{detail}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusUpdate}>
              Accept Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Reject Quote
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quote from {payeeName}. This helps track vendor relationships and decision-making.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g., Price too high, timeline doesn't work, found better alternative..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRejection}
              disabled={rejectionReason.trim().length < 10}
            >
              Reject Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
