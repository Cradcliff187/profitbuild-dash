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
  activeGrossMargin: number;
  activeGrossMarginPercent: number;
}

export function ProjectStatusCard({ 
  statusCounts,
  activeContractValue,
  activeEstimatedCosts,
  completedContractValue,
  activeGrossMargin,
  activeGrossMarginPercent
}: ProjectStatusCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="p-2 pb-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          <CardTitle className="text-xs font-semibold">Project Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 space-y-2">
        <div className="space-y-0.5">
          {statusCounts.map((item) => (
            <button
              key={item.status}
              onClick={() => navigate(`/projects?status=${item.status}`)}
              className="flex items-center justify-between w-full px-1.5 py-1 rounded hover:bg-muted text-left transition-colors h-7"
            >
              <span className="text-xs">{item.label}</span>
              <span className="text-xs font-semibold">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="pt-1.5 border-t space-y-1.5">
          <div className="flex items-start gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">Active Contract Value</div>
              <div className="text-xs font-semibold truncate">{formatCurrency(activeContractValue)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">Active Est. Costs</div>
              <div className="text-xs font-semibold truncate">{formatCurrency(activeEstimatedCosts)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">Active Projected Margin</div>
              <div className="text-xs font-semibold truncate">
                {formatCurrency(activeGrossMargin)}
                <span className={`ml-1.5 text-[10px] ${
                  activeGrossMarginPercent >= 20 ? 'text-green-600' :
                  activeGrossMarginPercent >= 10 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  ({activeGrossMarginPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">Completed Value</div>
              <div className="text-xs font-semibold text-green-600 truncate">{formatCurrency(completedContractValue)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
