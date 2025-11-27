import { Wrench, DollarSign, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface WorkOrderStatusCount {
  status: string;
  count: number;
  label: string;
}

interface WorkOrderStatusCardProps {
  statusCounts: WorkOrderStatusCount[];
  activeContractValue: number;
  activeWorkOrderCount: number;
  workOrdersWithoutEstimates?: number;
}

export function WorkOrderStatusCard({ 
  statusCounts,
  activeContractValue,
  activeWorkOrderCount,
  workOrdersWithoutEstimates = 0
}: WorkOrderStatusCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <CardTitle className="text-sm font-semibold">Work Orders</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          {statusCounts.map((item) => (
            <button
              key={item.status}
              onClick={() => navigate(`/work-orders?status=${item.status}`)}
              className="flex items-center justify-between w-full p-2 rounded hover:bg-muted text-left transition-colors h-8"
            >
              <span className="text-sm">{item.label}</span>
              <span className="text-sm font-semibold">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t space-y-2">
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Active WO Value</div>
              <div className="text-sm font-semibold truncate">{formatCurrency(activeContractValue)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Active Work Orders</div>
              <div className="text-sm font-semibold">{activeWorkOrderCount}</div>
            </div>
          </div>

          {workOrdersWithoutEstimates > 0 && (
            <button
              onClick={() => navigate('/work-orders')}
              className="flex items-start gap-2 w-full p-2 rounded hover:bg-muted text-left transition-colors"
            >
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Need Estimates</div>
                <div className="text-sm font-semibold text-amber-600">{workOrdersWithoutEstimates}</div>
              </div>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
