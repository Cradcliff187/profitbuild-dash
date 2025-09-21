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
      const { error } = await supabase
        .from('estimates')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', estimateId);

      if (error) throw error;

      onStatusUpdate(newStatus);
      
      toast({
        title: "Status Updated",
        description: `Estimate status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating estimate status:', error);
      toast({
        title: "Error",
        description: "Failed to update estimate status",
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