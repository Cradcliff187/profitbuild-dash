import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProjectStatusMetrics {
  estimating: { count: number; value: number };
  quoted: { count: number; value: number };
  approved: { count: number; value: number };
  in_progress: { count: number; value: number };
  complete: { count: number; value: number };
  on_hold: { count: number; value: number };
  cancelled: { count: number; value: number };
}

interface ProjectStatusCardProps {
  metrics: ProjectStatusMetrics;
}

export function ProjectStatusCard({ metrics }: ProjectStatusCardProps) {
  const navigate = useNavigate();

  const totalActive = {
    count: metrics.in_progress.count + metrics.approved.count,
    value: metrics.in_progress.value + metrics.approved.value,
  };

  const hasActiveProjects = totalActive.count > 0;
  const hasPipeline = metrics.estimating.count > 0 || metrics.quoted.count > 0;
  const hasCompleted = metrics.complete.count > 0;
  const hasOther = metrics.on_hold.count > 0 || metrics.cancelled.count > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStatusClick = (status: string) => {
    navigate(`/projects?status=${status}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Project Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasActiveProjects && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Active Projects
            </div>
            <div className="space-y-1">
              {metrics.in_progress.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("in_progress")}
                >
                  <span className="text-sm">In Progress:</span>
                  <span className="text-sm font-medium">
                    {metrics.in_progress.count}
                    <span className="ml-3 text-muted-foreground">{formatCurrency(metrics.in_progress.value)}</span>
                  </span>
                </div>
              )}
              {metrics.approved.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("approved")}
                >
                  <span className="text-sm">Approved:</span>
                  <span className="text-sm font-medium">
                    {metrics.approved.count}
                    <span className="ml-3 text-muted-foreground">{formatCurrency(metrics.approved.value)}</span>
                  </span>
                </div>
              )}
              <div className="border-t border-border my-2"></div>
              <div className="flex justify-between items-center py-1.5 px-2 bg-accent/50 rounded font-semibold">
                <span className="text-sm">Total Active:</span>
                <span className="text-sm">
                  {totalActive.count}
                  <span className="ml-3">{formatCurrency(totalActive.value)}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {hasPipeline && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pipeline</div>
            <div className="space-y-1">
              {metrics.estimating.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("estimating")}
                >
                  <span className="text-sm">Estimating:</span>
                  <span className="text-sm font-medium">{metrics.estimating.count}</span>
                </div>
              )}
              {metrics.quoted.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("quoted")}
                >
                  <span className="text-sm">Quoted:</span>
                  <span className="text-sm font-medium">{metrics.quoted.count}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {hasCompleted && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Completed</div>
            <div className="space-y-1">
              <div
                className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                onClick={() => handleStatusClick("complete")}
              >
                <span className="text-sm">Complete:</span>
                <span className="text-sm font-medium">
                  {metrics.complete.count}
                  <span className="ml-3 text-muted-foreground">{formatCurrency(metrics.complete.value)}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {hasOther && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Other</div>
            <div className="space-y-1">
              {metrics.on_hold.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("on_hold")}
                >
                  <span className="text-sm">On Hold:</span>
                  <span className="text-sm font-medium">{metrics.on_hold.count}</span>
                </div>
              )}
              {metrics.cancelled.count > 0 && (
                <div
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleStatusClick("cancelled")}
                >
                  <span className="text-sm">Cancelled:</span>
                  <span className="text-sm font-medium">{metrics.cancelled.count}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
