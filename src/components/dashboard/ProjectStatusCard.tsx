import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProjectStatusMetrics {
  inProgress: {
    count: number;
    value: number;
  };
  approved: {
    count: number;
    value: number;
  };
  activeTotal: {
    count: number;
    value: number;
  };
  estimating: { count: number };
  quoted: { count: number };
  complete: {
    count: number;
    value: number;
  };
  onHold: { count: number };
  cancelled: { count: number };
}

interface ProjectStatusCardProps {
  metrics: ProjectStatusMetrics;
}

interface StatusLineProps {
  label: string;
  count: number;
  value?: number;
  status?: string;
}

function StatusLine({ label, count, value, status }: StatusLineProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (status) {
      navigate(`/projects?status=${status}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center justify-between text-sm py-1 hover:bg-accent/50 px-2 rounded cursor-pointer transition-colors"
    >
      <span className="text-muted-foreground">
        {label}: {count}
      </span>
      {value !== undefined && <span className="font-mono font-medium">{formatCurrency(value)}</span>}
    </div>
  );
}

export function ProjectStatusCard({ metrics }: ProjectStatusCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Project Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Projects Section */}
        {(metrics.inProgress.count > 0 || metrics.approved.count > 0) && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              ACTIVE PROJECTS
            </h4>
            <div className="space-y-1">
              {metrics.inProgress.count > 0 && (
                <StatusLine
                  label="In Progress"
                  count={metrics.inProgress.count}
                  value={metrics.inProgress.value}
                  status="in_progress"
                />
              )}
              {metrics.approved.count > 0 && (
                <StatusLine
                  label="Approved"
                  count={metrics.approved.count}
                  value={metrics.approved.value}
                  status="approved"
                />
              )}
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between font-semibold bg-accent/50 p-2 rounded">
              <span className="text-sm">Total Active: {metrics.activeTotal.count}</span>
              <span className="text-sm font-mono">{formatCurrency(metrics.activeTotal.value)}</span>
            </div>
          </div>
        )}

        {/* Pipeline Section */}
        {(metrics.estimating.count > 0 || metrics.quoted.count > 0) && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">PIPELINE</h4>
            <div className="space-y-1">
              {metrics.estimating.count > 0 && (
                <StatusLine label="Estimating" count={metrics.estimating.count} status="estimating" />
              )}
              {metrics.quoted.count > 0 && <StatusLine label="Quoted" count={metrics.quoted.count} status="quoted" />}
            </div>
          </div>
        )}

        {/* Completed Section */}
        {metrics.complete.count > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">COMPLETED</h4>
            <div className="space-y-1">
              <StatusLine
                label="Complete"
                count={metrics.complete.count}
                value={metrics.complete.value}
                status="complete"
              />
            </div>
          </div>
        )}

        {/* Other Section */}
        {(metrics.onHold.count > 0 || metrics.cancelled.count > 0) && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">OTHER</h4>
            <div className="space-y-1">
              {metrics.onHold.count > 0 && <StatusLine label="On Hold" count={metrics.onHold.count} status="on_hold" />}
              {metrics.cancelled.count > 0 && (
                <StatusLine label="Cancelled" count={metrics.cancelled.count} status="cancelled" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
