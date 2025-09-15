import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import WorkOrdersList from "@/components/WorkOrdersList";
import CreateWorkOrderModal from "@/components/CreateWorkOrderModal";

const WorkOrders = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">Manage your work orders and track progress</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Work Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Work Orders</CardTitle>
          <CardDescription>
            Track and manage your work orders with optional estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkOrdersList />
        </CardContent>
      </Card>

      <CreateWorkOrderModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};

export default WorkOrders;