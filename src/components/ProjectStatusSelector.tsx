import React, { useState } from "react";
import { Check, AlertTriangle, ChevronDown } from "lucide-react";
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
import { ProjectStatus, PROJECT_STATUSES } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProjectStatusSelectorProps {
  projectId: string;
  currentStatus: ProjectStatus;
  projectName: string;
  hasApprovedEstimate?: boolean;
  estimateStatus?: string;
  onStatusChange?: (newStatus: ProjectStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export const ProjectStatusSelector = ({
  projectId,
  currentStatus,
  projectName,
  hasApprovedEstimate = false,
  estimateStatus,
  onStatusChange,
  disabled = false,
  showLabel = false
}: ProjectStatusSelectorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);

  const getStatusBadge = (status: ProjectStatus) => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize px-2 py-0.5",
          status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
          status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
          status === 'quoted' && 'border-blue-200 text-blue-700 bg-blue-50',
          status === 'in_progress' && 'border-purple-200 text-purple-700 bg-purple-50',
          status === 'complete' && 'border-green-200 text-green-700 bg-green-50',
          status === 'on_hold' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
          status === 'cancelled' && 'border-red-200 text-red-700 bg-red-50'
        )}
      >
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getStatusWarning = (targetStatus: ProjectStatus) => {
    switch (targetStatus) {
      case 'approved':
        if (!hasApprovedEstimate) {
          return {
            title: "Estimate Approval Required",
            message: "This project doesn't have an approved estimate. Would you like to approve the project anyway? This will prevent accurate financial tracking.",
            severity: "error" as const
          };
        }
        break;
      case 'in_progress':
        if (currentStatus !== 'approved') {
          return {
            title: "Project Not Approved",
            message: "Starting a project that isn't approved yet. Consider approving it first for proper workflow tracking.",
            severity: "warning" as const
          };
        }
        break;
      case 'complete':
        return {
          title: "Mark Project Complete",
          message: "This will mark the project as finished. Ensure all work is completed and documented.",
          severity: "info" as const
        };
      case 'cancelled':
        return {
          title: "Cancel Project",
          message: "This will cancel the project. This action affects financial reporting and cannot be easily undone.",
          severity: "error" as const
        };
    }
    return null;
  };

  const getWorkflowGuidance = () => {
    if (!hasApprovedEstimate && estimateStatus) {
      const estimateLabel = estimateStatus === 'draft' ? 'draft' : 
                           estimateStatus === 'sent' ? 'sent to client' : estimateStatus;
      
      return (
        <div className="text-xs text-muted-foreground mt-1">
          Estimate is {estimateLabel} • Approve estimate first for accurate financials
        </div>
      );
    }
    return null;
  };

  const handleStatusSelect = (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus) return;

    const warning = getStatusWarning(newStatus);
    if (warning) {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: ProjectStatus) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      onStatusChange?.(newStatus);
      
      toast({
        title: "Status Updated",
        description: `Project "${projectName}" is now ${newStatus.replace(/_/g, ' ')}.`
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status. Please try again.",
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

  const statusExplanations = {
    'estimating': 'Project is being estimated and scoped',
    'quoted': 'Project has been quoted and waiting for client approval', 
    'approved': 'Project approved by client, ready to start work',
    'in_progress': 'Project is currently active and ongoing',
    'complete': 'Project has been finished and delivered',
    'on_hold': 'Project is temporarily paused or delayed',
    'cancelled': 'Project has been cancelled or terminated'
  };

  const warning = pendingStatus ? getStatusWarning(pendingStatus) : null;

  return (
    <>
      <div className="space-y-1">
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
                    {PROJECT_STATUSES.map((status) => (
                      <DropdownMenuItem
                        key={status.value}
                        onClick={() => handleStatusSelect(status.value)}
                        className="flex items-center justify-between"
                      >
                        <span>{status.label}</span>
                        {status.value === currentStatus && (
                          <Check className="h-3 w-3 text-success" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Workflow: Estimating → Quoted → Approved → In Progress → Complete
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p><strong>Current:</strong> {statusExplanations[currentStatus]}</p>
                {!hasApprovedEstimate && (
                  <p className="text-warning"><strong>Note:</strong> No approved estimate for accurate financials</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {getWorkflowGuidance()}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {warning?.severity === 'error' && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {warning?.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
              {warning?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {warning?.message}
              
              {pendingStatus === 'approved' && !hasApprovedEstimate && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>Recommendation:</strong> Go to the Estimates section first and approve an estimate. 
                    This ensures accurate financial tracking and margin calculations.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusUpdate}
              className={cn(
                warning?.severity === 'error' && 'bg-destructive hover:bg-destructive/90'
              )}
            >
              {warning?.severity === 'error' ? 'Update Anyway' : 'Confirm Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};