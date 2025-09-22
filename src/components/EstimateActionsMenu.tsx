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
      // Create new version in DB
      const { data: newId, error } = await supabase.rpc('create_estimate_version', {
        source_estimate_id: estimate.id
      });
      if (error) throw error;

      // Fetch the newly created version
      const { data: newVersionData, error: fetchError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', newId)
        .single();
      if (fetchError || !newVersionData) throw fetchError;

      // Fetch its copied line items
      const { data: lineItemsData, error: liError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', newId)
        .order('sort_order');
      if (liError) throw liError;

      const lineItems = (lineItemsData || []).map((item: any) => ({
        id: item.id,
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        pricePerUnit: Number(item.price_per_unit ?? item.rate ?? 0),
        total: Number(item.total) || 0,
        unit: item.unit || '',
        sort_order: item.sort_order || 0,
        costPerUnit: Number(item.cost_per_unit) || 0,
        markupPercent: item.markup_percent,
        markupAmount: item.markup_amount,
        totalCost: Number(item.total_cost ?? (Number(item.quantity || 0) * Number(item.cost_per_unit || 0))) || 0,
        totalMarkup: Number(item.total_markup ?? (Number(item.quantity || 0) * (Number(item.price_per_unit ?? item.rate ?? 0) - Number(item.cost_per_unit || 0)))) || 0,
      }));

      const newVersion: any = {
        id: newVersionData.id,
        project_id: newVersionData.project_id,
        estimate_number: newVersionData.estimate_number,
        date_created: new Date(newVersionData.date_created),
        total_amount: Number(newVersionData.total_amount) || 0,
        status: newVersionData.status,
        notes: newVersionData.notes,
        valid_until: newVersionData.valid_until ? new Date(newVersionData.valid_until) : undefined,
        revision_number: newVersionData.revision_number,
        contingency_percent: Number(newVersionData.contingency_percent) || 10,
        contingency_amount: newVersionData.contingency_amount,
        contingency_used: Number(newVersionData.contingency_used) || 0,
        version_number: newVersionData.version_number || 1,
        parent_estimate_id: newVersionData.parent_estimate_id,
        is_current_version: !!newVersionData.is_current_version,
        valid_for_days: newVersionData.valid_for_days || 30,
        lineItems,
        created_at: new Date(newVersionData.created_at),
        updated_at: new Date(newVersionData.updated_at),
        defaultMarkupPercent: newVersionData.default_markup_percent || 15,
        targetMarginPercent: newVersionData.target_margin_percent || 20,
      };

      toast({
        title: "Version Created",
        description: "Opening new version with copied line items",
      });

      // Open the editor with the populated estimate instead of reloading
      onEdit(newVersion);
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