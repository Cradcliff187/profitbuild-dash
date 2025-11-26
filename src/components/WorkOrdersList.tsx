import { Project } from "@/types/project";
import WorkOrderCard from "./WorkOrderCard";

interface WorkOrderWithDetails extends Project {
  has_estimate: boolean;
  is_auto_generated_estimate: boolean;
  total_expenses: number;
  expense_count: number;
  estimate_amount: number | null;
}

interface WorkOrdersListProps {
  workOrders: WorkOrderWithDetails[];
  onUpdate: () => void;
}

const WorkOrdersList = ({ workOrders, onUpdate }: WorkOrdersListProps) => {
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
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

export default WorkOrdersList;