import React, { useState } from "react";
import { Check, AlertTriangle, ChevronDown, Send, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EstimateStatus } from "@/types/estimate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EstimateStatusSelectorProps {
  estimateId: string;
  currentStatus: EstimateStatus;
  estimateNumber: string;
  projectId: string;
  totalAmount: number;
  onStatusChange?: (newStatus: EstimateStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export const EstimateStatusSelector = ({
  estimateId,
  currentStatus,
  estimateNumber,
  projectId,
  totalAmount,
  onStatusChange,
  disabled = false,
  showLabel = false
}: EstimateStatusSelectorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EstimateStatus | null>(null);

  const getStatusBadge = (status: EstimateStatus) => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize px-2 py-0.5",
          status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
          status === 'draft' && 'border-gray-200 text-gray-700 bg-gray-50',
          status === 'sent' && 'border-blue-200 text-blue-700 bg-blue-50',
          status === 'rejected' && 'border-red-200 text-red-700 bg-red-50',
          status === 'expired' && 'border-yellow-200 text-yellow-700 bg-yellow-50'
        )}
      >
        {status}
      </Badge>
    );
  };

  const getStatusIcon = (status: EstimateStatus) => {
    switch (status) {
      case 'draft': return <FileText className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      case 'expired': return <Clock className="h-3 w-3" />;
      default: return null;
    }
  };

  const statusOptions: { value: EstimateStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' }
  ];

  const getStatusWarning = (targetStatus: EstimateStatus) => {
    if (targetStatus === ('approved' as EstimateStatus)) {
      return {
        title: "Approve Estimate",
        message: `Approving this estimate will set it as the contracted amount (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}). This will:`,
        details: [
          "• Set this estimate as the project's contracted amount",
          "• Un-approve any other estimates for this project",
          "• Update the project status to 'approved'",
          "• Affect all financial calculations and margin tracking"
        ],
        severity: "warning" as const
      };
    }
    if (currentStatus === ('approved' as EstimateStatus) && targetStatus !== ('approved' as EstimateStatus)) {
      return {
        title: "Un-approve Estimate",
        message: "Changing from approved status will clear the project's contracted amount and revert the project status. This will affect financial tracking.",
        severity: "warning" as const
      };
    }
    return null;
  };

  const handleStatusSelect = (newStatus: EstimateStatus) => {
    if (newStatus === currentStatus) return;

    const warning = getStatusWarning(newStatus);
    if (warning) {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: EstimateStatus) => {
    setIsLoading(true);
    try {
      // Handle project contracted_amount and status updates
      if (newStatus === 'approved' as EstimateStatus) {
        // First, set THIS estimate as approved AND current version
        const { error: currentVersionError } = await supabase
          .from('estimates')
          .update({ 
            status: newStatus,
            is_current_version: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId);

        if (currentVersionError) throw currentVersionError;

        // Then, un-approve any other estimates for this project and mark as not current
        const { error: unApproveError } = await supabase
          .from('estimates')
          .update({ 
            status: 'sent',
            is_current_version: false
          })
          .eq('project_id', projectId)
          .eq('status', 'approved')
          .neq('id', estimateId);

        if (unApproveError) throw unApproveError;

        // Update project with contracted amount and status
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            contracted_amount: totalAmount,
            status: 'approved' as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (projectError) throw projectError;

        toast({
          title: "Estimate Approved",
          description: `${estimateNumber} approved and set as contract value`,
        });
      } else if (currentStatus === ('approved' as EstimateStatus) && newStatus !== ('approved' as EstimateStatus)) {
        // When un-approving, clear the contract value and current version
        const { error: estimateError } = await supabase
          .from('estimates')
          .update({
            status: newStatus,
            is_current_version: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId);

        if (estimateError) throw estimateError;

        const { error: projectError } = await supabase
          .from('projects')
          .update({
            contracted_amount: null,
            status: 'quoted' as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (projectError) throw projectError;

        toast({
          title: "Status Updated",
          description: `${estimateNumber} status changed to ${newStatus}`,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `${estimateNumber} status changed to ${newStatus}`,
        });
      } else {
        // For all other status changes (not involving approval)
        const { error: updateError } = await supabase
          .from('estimates')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId);

        if (updateError) throw updateError;

        toast({
          title: "Status Updated",
          description: `${estimateNumber} status changed to ${newStatus}`,
        });
      }

      onStatusChange?.(newStatus);
      
    } catch (error) {
      console.error('Error updating estimate status:', error);
      toast({
        title: "Error",
        description: "Failed to update estimate status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setPendingStatus(null);
    }
  };

  const confirmStatusUpdate = () => {
    if (pendingStatus) {
      updateStatus(pendingStatus);
    }
  };

  const statusExplanations: Record<EstimateStatus, string> = {
    'draft': 'Estimate is being created and not yet finalized',
    'sent': 'Estimate has been sent to client for review',
    'approved': 'Estimate approved by client - becomes contract value',
    'rejected': 'Estimate was rejected by client',
    'expired': 'Estimate validity period has expired'
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
                    Workflow: Draft → Sent → Approved
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
              <AlertTriangle className="h-4 w-4 text-warning" />
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
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
