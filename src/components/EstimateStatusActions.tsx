import React, { useState } from "react";
import { Send, CheckCircle, XCircle, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { EstimateStatus } from "@/types/estimate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EstimateStatusActionsProps {
  estimateId: string;
  currentStatus: EstimateStatus;
  onStatusUpdate: (newStatus: EstimateStatus) => void;
  className?: string;
}

export const EstimateStatusActions = ({ 
  estimateId, 
  currentStatus, 
  onStatusUpdate,
  className 
}: EstimateStatusActionsProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus: EstimateStatus) => {
    setIsUpdating(true);
    try {
      // First, get the current estimate data to access project_id and total_amount
      const { data: estimate, error: fetchError } = await supabase
        .from('estimates')
        .select('id, project_id, total_amount, status')
        .eq('id', estimateId)
        .single();

      if (fetchError) throw fetchError;

      // Update the estimate status
      const { error: updateError } = await supabase
        .from('estimates')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', estimateId);

      if (updateError) throw updateError;

      // Handle project contracted_amount and status updates
      if (newStatus === 'approved') {
        // When approving an estimate, set it as the contract value
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
          .eq('project_id', estimate.project_id)
          .eq('status', 'approved')
          .neq('id', estimateId);

        if (unApproveError) throw unApproveError;

        // Update project with contracted amount and move to in_progress status
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            contracted_amount: estimate.total_amount,
            status: 'in_progress' as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimate.project_id);

        if (projectError) throw projectError;

        toast({
          title: "Estimate Approved",
          description: `Estimate approved and set as contract value (${new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(estimate.total_amount)})`,
        });
      } else if (currentStatus === ('approved' as EstimateStatus) && newStatus !== ('approved' as EstimateStatus)) {
        // When un-approving an estimate, clear the contract value and current version
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
            status: 'quoted' as any, // Revert to quoted status
            updated_at: new Date().toISOString()
          })
          .eq('id', estimate.project_id);

        if (projectError) throw projectError;

        toast({
          title: "Status Updated",
          description: `Estimate status changed to ${newStatus} and contract value cleared`,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Estimate status changed to ${newStatus}`,
        });
      }

      onStatusUpdate(newStatus);
      
    } catch (error) {
      console.error('Error updating estimate status:', error);
      toast({
        title: "Error",
        description: "Failed to update estimate status and contract value",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: EstimateStatus) => {
    switch (status) {
      case 'sent': return <Send className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      case 'expired': return <Clock className="h-3 w-3" />;
      case 'draft': return <RotateCcw className="h-3 w-3" />;
      default: return null;
    }
  };

  const getAvailableActions = () => {
    switch (currentStatus) {
      case 'draft':
        return [
          { status: 'sent' as EstimateStatus, label: 'Send Estimate', icon: <Send className="h-3 w-3 mr-2" /> },
        ];
      case 'sent':
        return [
          { status: 'approved' as EstimateStatus, label: 'Mark Approved', icon: <CheckCircle className="h-3 w-3 mr-2" /> },
          { status: 'rejected' as EstimateStatus, label: 'Mark Rejected', icon: <XCircle className="h-3 w-3 mr-2" /> },
          { status: 'expired' as EstimateStatus, label: 'Mark Expired', icon: <Clock className="h-3 w-3 mr-2" /> },
        ];
      case 'approved':
      case 'rejected':
        return [
          { status: 'draft' as EstimateStatus, label: 'Reopen as Draft', icon: <RotateCcw className="h-3 w-3 mr-2" /> },
        ];
      case 'expired':
        return [
          { status: 'draft' as EstimateStatus, label: 'Reopen as Draft', icon: <RotateCcw className="h-3 w-3 mr-2" /> },
          { status: 'sent' as EstimateStatus, label: 'Mark as Sent', icon: <Send className="h-3 w-3 mr-2" /> },
        ];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  // If only one action available, show it as a direct button
  if (availableActions.length === 1) {
    const action = availableActions[0];
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateStatus(action.status)}
        disabled={isUpdating}
        className={className}
      >
        {action.icon}
        {action.label}
      </Button>
    );
  }

  // Multiple actions - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating}
          className={className}
        >
          {getStatusIcon(currentStatus)}
          Update Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableActions.map((action, index) => (
          <React.Fragment key={action.status}>
            <DropdownMenuItem 
              onClick={() => updateStatus(action.status)}
              disabled={isUpdating}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
            {index < availableActions.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};