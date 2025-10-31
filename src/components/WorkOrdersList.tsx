import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import WorkOrderCard from "./WorkOrderCard";
import { BrandedLoader } from "@/components/ui/branded-loader";

interface WorkOrderWithDetails extends Project {
  has_estimate: boolean;
  total_expenses: number;
  expense_count: number;
  estimate_amount: number | null;
}

const WorkOrdersList = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          estimates!left (
            id,
            total_amount
          ),
          expenses!left (
            id,
            amount
          )
        `)
        .eq('project_type', 'work_order')
        .neq('project_number', 'SYS-000')
        .neq('project_number', '000-UNASSIGNED')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work orders:', error);
        return;
      }

      // Process the data to calculate totals and estimates
      const processedData = data?.map(project => {
        const estimates = project.estimates || [];
        const expenses = project.expenses || [];
        
        return {
          ...project,
          // Convert date strings to Date objects
          start_date: project.start_date ? new Date(project.start_date) : null,
          end_date: project.end_date ? new Date(project.end_date) : null,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
          has_estimate: estimates.length > 0,
          total_expenses: expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
          expense_count: expenses.length,
          estimate_amount: estimates.length > 0 ? estimates[0].total_amount : null
        };
      }) || [];

      setWorkOrders(processedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleWorkOrderUpdate = () => {
    fetchWorkOrders();
  };

  if (loading) {
    return <BrandedLoader message="Loading work orders..." />;
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No work orders found</p>
        <p className="text-sm text-muted-foreground">
          Create your first work order to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workOrders.map((workOrder) => (
        <WorkOrderCard
          key={workOrder.id}
          workOrder={workOrder}
          onUpdate={handleWorkOrderUpdate}
        />
      ))}
    </div>
  );
};

export default WorkOrdersList;