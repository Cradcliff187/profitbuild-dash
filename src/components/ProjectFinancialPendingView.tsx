import React from "react";
import { AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";

interface ProjectFinancialPendingViewProps {
  project: Project;
  estimates: Estimate[];
  onViewEstimates?: () => void;
}

export const ProjectFinancialPendingView = ({ 
  project, 
  estimates, 
  onViewEstimates 
}: ProjectFinancialPendingViewProps) => {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Find the best available estimate (prioritize current version, then latest)
  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const currentEstimate = projectEstimates.find(e => e.is_current_version) || 
                         projectEstimates.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];

  const getEstimateStatus = () => {
    if (!currentEstimate) return { status: 'none', label: 'No Estimates', color: 'text-muted-foreground' };
    
    switch (currentEstimate.status) {
      case 'draft':
        return { status: 'draft', label: 'Draft', color: 'text-muted-foreground' };
      case 'sent':
        return { status: 'sent', label: 'Sent to Client', color: 'text-blue-600' };
      case 'approved':
        return { status: 'approved', label: 'Approved', color: 'text-green-600' };
      case 'rejected':
        return { status: 'rejected', label: 'Rejected', color: 'text-red-600' };
      default:
        return { status: 'unknown', label: 'Unknown', color: 'text-muted-foreground' };
    }
  };

  const estimateStatus = getEstimateStatus();

  const getRecommendedAction = () => {
    if (!currentEstimate) {
      return "Create an estimate to see projected financials";
    }
    
    switch (currentEstimate.status) {
      case 'draft':
        return "Send estimate to client to begin approval process";
      case 'sent':
        return "Waiting for client approval to unlock financial tracking";
      case 'rejected':
        return "Revise and resend estimate for client approval";
      default:
        return "Approve estimate to see detailed financial metrics";
    }
  };

  const showPendingData = currentEstimate && currentEstimate.status !== 'approved';

  return (
    <div className="space-y-4">
      {/* Status Alert */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-yellow-800">Limited Financial Data Available</h4>
                <Badge variant="outline" className={`${estimateStatus.color} border-current`}>
                  {estimateStatus.label}
                </Badge>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Financial calculations require an approved estimate. {getRecommendedAction()}
              </p>
              {onViewEstimates && (
                <button
                  onClick={onViewEstimates}
                  className="text-sm text-yellow-800 underline hover:no-underline font-medium"
                >
                  View Estimates →
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Financial Preview */}
      {showPendingData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Estimated Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(currentEstimate.total_amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pending client approval
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total estimate amount. Will become contracted amount when approved.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Contingency Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(currentEstimate.contingency_amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentEstimate.contingency_percent}% of estimate
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Contingency budget for unexpected costs. Available when estimate is approved.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Current Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-2xl font-bold">
                      {formatCurrency(project.current_margin ? 
                        (currentEstimate.total_amount || 0) - project.current_margin : 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Actual expenses to date
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expenses recorded for this project so far.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Estimate State */}
      {!currentEstimate && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Estimates Created</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create an estimate to see projected financials and enable margin tracking.
            </p>
            {onViewEstimates && (
              <button
                onClick={onViewEstimates}
                className="text-sm text-primary underline hover:no-underline font-medium"
              >
                Go to Estimates →
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};