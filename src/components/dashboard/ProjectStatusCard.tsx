import { BarChart3, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ProjectStatusCount {
  status: string;
  count: number;
  label: string;
}

interface ProjectStatusCardProps {
  statusCounts: ProjectStatusCount[];
  activeContractValue: number;
  activeEstimatedCosts: number;
  completedContractValue: number;
}

export function ProjectStatusCard({ 
  statusCounts,
  activeContractValue,
  activeEstimatedCosts,
  completedContractValue
}: ProjectStatusCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          {statusCounts.map((item) => (
            <button
              key={item.status}
              onClick={() => navigate(`/projects?status=${item.status}`)}
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
              <div className="text-xs text-muted-foreground">Active Contract Value</div>
              <div className="text-sm font-semibold truncate">{formatCurrency(activeContractValue)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Active Est. Costs</div>
              <div className="text-sm font-semibold truncate">{formatCurrency(activeEstimatedCosts)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Completed Value</div>
              <div className="text-sm font-semibold text-green-600 truncate">{formatCurrency(completedContractValue)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
