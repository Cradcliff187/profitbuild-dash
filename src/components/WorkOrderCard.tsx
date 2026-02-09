import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarDays, DollarSign, FileText, Plus, CheckCircle, Trash2 } from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from '@/lib/utils';

interface WorkOrderCardProps {
  workOrder: Project & {
    has_estimate: boolean;
    is_auto_generated_estimate: boolean;
    total_expenses: number;
    expense_count: number;
    estimate_amount: number | null;
  };
  onUpdate: () => void;
}

const WorkOrderCard = ({ workOrder, onUpdate }: WorkOrderCardProps) => {
  const navigate = useNavigate();
  // Removed - now using ProjectStatusBadge component

  const handleAddExpense = () => {
    navigate(`/expenses?project=${workOrder.id}`);
  };

  const handleViewEstimate = () => {
    // If estimate is auto-generated, treat it as no estimate and navigate to create
    if (workOrder.has_estimate && !workOrder.is_auto_generated_estimate) {
      navigate(`/estimates?project=${workOrder.id}`);
    } else {
      navigate(`/estimates?create=true&project=${workOrder.id}`);
    }
  };

  const handleMarkComplete = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'complete' })
        .eq('id', workOrder.id);

      if (error) {
        toast.error("Failed to update work order status");
        return;
      }

      toast.success("Work order marked as complete");
      onUpdate();
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeleteWorkOrder = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', workOrder.id);

      if (error) {
        toast.error("Failed to delete work order");
        return;
      }

      toast.success("Work order deleted successfully");
      onUpdate();
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {workOrder.project_number}
              {workOrder.project_type === 'work_order' && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  WORK ORDER
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workOrder.project_name}
            </p>
          </div>
          <ProjectStatusBadge status={workOrder.status} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Client</p>
            <p className="font-medium">{workOrder.client_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Has Estimate</p>
            {workOrder.has_estimate ? (
              workOrder.is_auto_generated_estimate ? (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                  System
                </Badge>
              ) : (
                <Badge variant="default">Yes</Badge>
              )
            ) : (
              <Badge variant="secondary">No</Badge>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Total Expenses</p>
            <p className="font-medium">{formatCurrency(workOrder.total_expenses)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Start Date</p>
            <p className="font-medium flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {workOrder.start_date ? new Date(workOrder.start_date).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddExpense}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Expense
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewEstimate}
            className="gap-1"
          >
            <FileText className="h-3 w-3" />
            {workOrder.has_estimate && !workOrder.is_auto_generated_estimate ? 'View Estimate' : 'Create Estimate'}
          </Button>
          
          {workOrder.status !== 'complete' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkComplete}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Mark Complete
                    </Button>
          )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this work order? 
                            This action will also remove all associated estimates and expenses.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteWorkOrder}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkOrderCard;