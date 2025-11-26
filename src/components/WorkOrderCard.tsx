import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'estimating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quoted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
        toast({
          title: "Error",
          description: "Failed to update work order status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Work order marked as complete",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkOrder = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', workOrder.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete work order",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
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
          <Badge className={getStatusColor(workOrder.status)}>
            {workOrder.status.replace('_', ' ').toUpperCase()}
          </Badge>
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