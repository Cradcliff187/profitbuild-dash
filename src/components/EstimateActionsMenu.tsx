import React, { useState } from "react";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Clock,
  Copy,
  FileText,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { EstimateStatus } from "@/types/estimate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type EstimateWithQuotes = {
  id: string;
  estimate_number: string;
  status: EstimateStatus;
  lineItems?: any[];
  total_amount: number;
};

interface EstimateActionsMenuProps {
  estimate: EstimateWithQuotes;
  onView: (estimate: EstimateWithQuotes) => void;
  onEdit: (estimate: EstimateWithQuotes) => void;
  onDelete: (id: string) => void;
  onStatusUpdate?: (estimateId: string, newStatus: EstimateStatus) => void;
  className?: string;
}

export const EstimateActionsMenu = ({ 
  estimate, 
  onView, 
  onEdit, 
  onDelete,
  onStatusUpdate,
  className 
}: EstimateActionsMenuProps) => {
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
        .eq('id', estimate.id);

      if (error) throw error;

      onStatusUpdate?.(estimate.id, newStatus);
      
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

  const createVersion = async () => {
    try {
      const { data, error } = await supabase.rpc('create_estimate_version', {
        source_estimate_id: estimate.id
      });

      if (error) throw error;

      toast({
        title: "Version Created",
        description: "New estimate version created successfully",
      });

      // Refresh or navigate to new version
      window.location.reload();
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Error",
        description: "Failed to create new version",
        variant: "destructive"
      });
    }
  };

  const createQuote = () => {
    // Navigate to quotes page with estimate pre-selected
    window.location.href = `/quotes?estimateId=${estimate.id}`;
  };

  const getStatusActions = () => {
    const actions = [];
    
    switch (estimate.status) {
      case 'draft':
        actions.push({
          action: () => updateStatus('sent'),
          label: 'Send Estimate',
          icon: <Send className="h-4 w-4" />
        });
        break;
      case 'sent':
        actions.push(
          {
            action: () => updateStatus('approved'),
            label: 'Mark Approved',
            icon: <CheckCircle className="h-4 w-4" />
          },
          {
            action: () => updateStatus('rejected'),
            label: 'Mark Rejected',
            icon: <XCircle className="h-4 w-4" />
          },
          {
            action: () => updateStatus('expired'),
            label: 'Mark Expired',
            icon: <Clock className="h-4 w-4" />
          }
        );
        break;
      case 'approved':
      case 'rejected':
        actions.push({
          action: () => updateStatus('draft'),
          label: 'Reopen as Draft',
          icon: <RotateCcw className="h-4 w-4" />
        });
        break;
      case 'expired':
        actions.push(
          {
            action: () => updateStatus('draft'),
            label: 'Reopen as Draft',
            icon: <RotateCcw className="h-4 w-4" />
          },
          {
            action: () => updateStatus('sent'),
            label: 'Mark as Sent',
            icon: <Send className="h-4 w-4" />
          }
        );
        break;
    }
    
    return actions;
  };

  const hasLineItems = estimate.lineItems && estimate.lineItems.length > 0;
  const hasAmount = estimate.total_amount > 0;
  const hasDataIssue = !hasLineItems && hasAmount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          className={cn(
            "h-8 w-8 p-0 hover:bg-muted/50",
            className
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {estimate.estimate_number}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* View & Edit Actions */}
        <DropdownMenuItem onClick={() => onView(estimate)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onEdit(estimate)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Estimate
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Line Items & Quote Actions */}
        <DropdownMenuItem 
          onClick={() => onEdit(estimate)}
          className={cn(hasDataIssue && "text-amber-600")}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Line Items
          {hasDataIssue && (
            <AlertTriangle className="h-3 w-3 ml-auto text-amber-500" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={createQuote}
          disabled={!hasLineItems}
          className={cn(!hasLineItems && "opacity-50")}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Create Quote
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Versioning Actions */}
        <DropdownMenuItem onClick={createVersion}>
          <Copy className="h-4 w-4 mr-2" />
          Create New Version
        </DropdownMenuItem>

        {/* Status Update Actions */}
        {getStatusActions().length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Status Actions
            </DropdownMenuLabel>
            {getStatusActions().map((statusAction, index) => (
              <DropdownMenuItem 
                key={index}
                onClick={statusAction.action}
                disabled={isUpdating}
              >
                {statusAction.icon}
                <span className="ml-2">{statusAction.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        {/* Danger Zone */}
        <DropdownMenuItem 
          onClick={() => onDelete(estimate.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Estimate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};