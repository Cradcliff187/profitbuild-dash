import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  AlertCircle, 
  Clock, 
  FileText, 
  FileEdit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Camera,
  Video,
  Receipt,
  FileIcon,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { getMarginThresholdStatus, getThresholdStatusColor } from '@/utils/thresholdUtils';
import { calculateBudgetStatus, calculateScheduleStatus, getExpiringQuotes, getProjectScheduleDates } from '@/utils/projectDashboard';
import type { Project } from '@/types/project';
import type { Estimate } from '@/types/estimate';
import type { Quote } from '@/types/quote';
import type { Expense } from '@/types/expense';
import type { ChangeOrder } from '@/types/changeOrder';
import { ProjectNotesTimeline } from './ProjectNotesTimeline';

interface ProjectOperationalDashboardProps {
  project: Project;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
}

export function ProjectOperationalDashboard({
  project,
  estimates,
  quotes,
  expenses,
  changeOrders,
  pendingTimeEntries,
  pendingReceipts,
  mediaCounts,
  documentCount
}: ProjectOperationalDashboardProps) {
  const navigate = useNavigate();

  // State for schedule dates loaded from line items if needed
  const [scheduleDates, setScheduleDates] = useState<{ start: Date | null; end: Date | null }>({ 
    start: null, 
    end: null 
  });

  // Load schedule dates on mount
  useEffect(() => {
    const loadScheduleDates = async () => {
      const dates = await getProjectScheduleDates(
        project.id,
        project.start_date,
        project.end_date
      );
      setScheduleDates(dates);
    };
    loadScheduleDates();
  }, [project.id, project.start_date, project.end_date]);

  // Calculate operational metrics
  const needsAttention = useMemo(() => {
    const items = [];
    
    if (pendingTimeEntries > 0) {
      items.push({
        type: 'time_entries',
        label: 'Pending Time Entries',
        count: pendingTimeEntries,
        color: 'orange',
        icon: Clock,
        onClick: () => navigate('/time-entries?status=pending')
      });
    }
    
    if (pendingReceipts > 0) {
      items.push({
        type: 'receipts',
        label: 'Pending Receipts',
        count: pendingReceipts,
        color: 'blue',
        icon: FileText,
        onClick: () => navigate(`/time-entries?tab=receipts&project=${project.id}`)
      });
    }
    
    const pendingCOs = changeOrders.filter(co => co.status === 'pending');
    if (pendingCOs.length > 0) {
      items.push({
        type: 'change_orders',
        label: 'Pending Change Orders',
        count: pendingCOs.length,
        color: 'purple',
        icon: FileEdit,
        onClick: () => navigate(`/projects/${project.id}#change-orders`)
      });
    }
    
    const expiringQuotes = getExpiringQuotes(quotes, 7);
    if (expiringQuotes.length > 0) {
      items.push({
        type: 'expiring_quotes',
        label: 'Expiring Quotes (7 days)',
        count: expiringQuotes.length,
        color: 'red',
        icon: AlertTriangle,
        onClick: () => navigate(`/projects/${project.id}#quotes`)
      });
    }
    
    return items;
  }, [pendingTimeEntries, pendingReceipts, changeOrders, quotes, project.id, navigate]);

  const budgetStatus = useMemo(() => 
    calculateBudgetStatus(project.contracted_amount, expenses, project.adjusted_est_costs),
    [project.contracted_amount, expenses, project.adjusted_est_costs]
  );

  const scheduleStatus = useMemo(() => 
    calculateScheduleStatus(scheduleDates.start, scheduleDates.end, project.status),
    [scheduleDates.start, scheduleDates.end, project.status]
  );

  const changeOrderSummary = useMemo(() => {
    const pending = changeOrders.filter(co => co.status === 'pending').length;
    const approved = changeOrders.filter(co => co.status === 'approved');
    const rejected = changeOrders.filter(co => co.status === 'rejected').length;
    
    const totalRevenue = approved.reduce((sum, co) => sum + (co.client_amount || 0), 0);
    const totalCosts = approved.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const netImpact = totalRevenue - totalCosts;
    
    return {
      pending,
      approvedCount: approved.length,
      rejected,
      totalRevenue,
      totalCosts,
      netImpact
    };
  }, [changeOrders]);

  const financialDisplay = useMemo(() => {
    const status = project.status;
    const currentEstimate = estimates?.find(e => e.is_current_version);

    if (status === 'estimating') {
      const estimateValue = currentEstimate?.total_amount ?? 0;
      const estimatedCosts = currentEstimate?.total_cost ?? 0;
      const estimatedMargin = estimateValue - estimatedCosts;
      const estimatedMarginPct = estimateValue > 0 ? (estimatedMargin / estimateValue) * 100 : 0;
      
      // If project has adjusted values from quotes/COs, use those
      const contractValue = project.contracted_amount ?? 0;
      const adjustedEstCosts = project.adjusted_est_costs ?? 0;
      const adjustedMargin = project.adjusted_est_margin ?? project.projected_margin ?? 0;
      const adjustedMarginPct = contractValue > 0 ? (adjustedMargin / contractValue) * 100 : 0;
      
      if (contractValue > 0 || adjustedEstCosts > 0) {
        return {
          label1: 'Contract Value',
          value1: contractValue || estimateValue,
          label2: 'Adj. Est. Costs',
          value2: adjustedEstCosts || estimatedCosts,
          marginLabel: 'Adj. Est. Margin',
          marginValue: adjustedMargin || estimatedMargin,
          marginPct: adjustedMarginPct || estimatedMarginPct,
          showBudgetStatus: false,
          showVariance: false,
        };
      }
      
      // Fallback: pure estimate view
      return {
        label1: 'Estimate Value',
        value1: estimateValue,
        label2: 'Estimated Costs',
        value2: estimatedCosts,
        marginLabel: 'Estimated Margin',
        marginValue: estimatedMargin,
        marginPct: estimatedMarginPct,
        showBudgetStatus: false,
        showVariance: false,
      };
    }

    if (status === 'complete' || status === 'cancelled') {
      const totalInvoiced = (project as any).total_invoiced ?? 0;
      const totalExpenses = (project as any).total_expenses ?? 0;
      const actualMargin = project.actual_margin ?? 0;
      const actualMarginPct = totalInvoiced > 0 ? (actualMargin / totalInvoiced) * 100 : 0;
      const originalMargin = project.original_margin ?? 0;
      const varianceAmount = actualMargin - originalMargin;
      const variancePct = originalMargin !== 0
        ? ((actualMargin - originalMargin) / Math.abs(originalMargin)) * 100
        : 0;
      return {
        label1: 'Total Invoiced',
        value1: totalInvoiced,
        label2: 'Total Expenses',
        value2: totalExpenses,
        marginLabel: 'Actual Margin',
        marginValue: actualMargin,
        marginPct: actualMarginPct,
        showBudgetStatus: true,
        showVariance: true,
        varianceAmount,
        variancePct,
        originalMargin,
      };
    }

    return {
      label1: 'Contract Value',
      value1: project.contracted_amount ?? 0,
      label2: 'Adjusted Est. Costs',
      value2: project.adjusted_est_costs ?? 0,
      marginLabel: 'Adj. Est. Margin',
      marginValue: project.adjusted_est_margin ?? project.projected_margin ?? 0,
      marginPct: project.margin_percentage ?? 0,
      showBudgetStatus: true,
      showVariance: false,
    };
  }, [project, estimates, expenses]);

  const marginStatus = getMarginThresholdStatus(
    project.margin_percentage,
    project.minimum_margin_threshold,
    project.target_margin
  );

  const originalMarginPercent = project.original_margin && project.contracted_amount
    ? (project.original_margin / project.contracted_amount) * 100
    : null;

  const marginDelta = project.margin_percentage && originalMarginPercent
    ? project.margin_percentage - originalMarginPercent
    : null;

  return (
    <div className="space-y-3">
      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Needs Attention</h3>
              <Badge variant="destructive" className="h-5 text-xs">{needsAttention.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {needsAttention.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-left h-8"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <Badge variant="outline" className="h-5 text-xs">{item.count}</Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <h3 className="text-sm font-semibold">Financial Summary</h3>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{financialDisplay.label1}</div>
              <div className="text-base sm:text-xl font-bold">{formatCurrency(financialDisplay.value1)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{financialDisplay.label2}</div>
              <div className="text-base sm:text-xl font-bold text-foreground">
                {formatCurrency(financialDisplay.value2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {project.status !== 'estimating' ? 'Original Margin' : 'Target Margin'}
              </div>
              <div className="text-base sm:text-xl font-bold text-foreground">
                {project.status !== 'estimating'
                  ? formatCurrency(project.original_margin ?? 0)
                  : '20%'}
              </div>
              {project.status !== 'estimating' && originalMarginPercent != null && (
                <div className="text-xs text-muted-foreground">
                  {originalMarginPercent.toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{financialDisplay.marginLabel}</div>
              <div
                className="text-base sm:text-xl font-bold flex items-center gap-1"
                style={{ color: project.status === 'estimating' ? 'inherit' : getThresholdStatusColor(marginStatus) }}
              >
                {formatCurrency(financialDisplay.marginValue)}
                {project.status !== 'estimating' && marginDelta !== null && (
                  marginDelta >= 0
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="text-xs flex items-center gap-1">
                <span>{financialDisplay.marginPct.toFixed(1)}%</span>
                {project.status !== 'estimating' && marginDelta !== null && (
                  <span className={marginDelta >= 0 ? 'text-green-600' : 'text-destructive'}>
                    ({marginDelta >= 0 ? '+' : ''}{marginDelta.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          {financialDisplay.showVariance && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">vs Original Margin</span>
              <span className={cn(
                "font-semibold",
                (financialDisplay.varianceAmount ?? 0) >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {(financialDisplay.varianceAmount ?? 0) >= 0 ? '+' : ''}
                {formatCurrency(financialDisplay.varianceAmount ?? 0)}
                <span className="text-xs ml-1">
                  ({(financialDisplay.variancePct ?? 0) >= 0 ? '+' : ''}{(financialDisplay.variancePct ?? 0).toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Status & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {financialDisplay.showBudgetStatus && (
          <Card>
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Budget Status</h3>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Adjusted Est. Cost:</span>
                  <span className="font-medium">{formatCurrency(project.adjusted_est_costs)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Spent:</span>
                  <span className="font-medium">{formatCurrency(budgetStatus.totalSpent)}</span>
                </div>
                <Progress 
                  value={budgetStatus.percentSpent} 
                  className={`h-2 ${
                    budgetStatus.status === 'critical' ? '[&>div]:bg-destructive' :
                    budgetStatus.status === 'warning' ? '[&>div]:bg-warning' :
                    '[&>div]:bg-success'
                  }`}
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{budgetStatus.percentSpent.toFixed(1)}% spent</span>
                  <span className="font-medium">{formatCurrency(budgetStatus.remaining)} remaining</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Schedule</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {scheduleStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">
                    {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">
                    {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
                <Progress 
                  value={scheduleStatus.percentComplete} 
                  className={`h-2 ${
                    scheduleStatus.isComplete ? '[&>div]:bg-success' :
                    scheduleStatus.isOverdue ? '[&>div]:bg-destructive' : 
                    '[&>div]:bg-primary'
                  }`}
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {scheduleStatus.elapsedDays} of {scheduleStatus.totalDays} days
                  </span>
                  <span className={`font-medium ${
                    scheduleStatus.isComplete ? 'text-success' :
                    scheduleStatus.isOverdue ? 'text-destructive' : ''
                  }`}>
                    {scheduleStatus.isComplete 
                      ? 'Completed'
                      : scheduleStatus.isOverdue 
                        ? `Overdue by ${Math.abs(scheduleStatus.remainingDays)} days`
                        : `${scheduleStatus.remainingDays} days remaining`
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No schedule dates set</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Orders & Documentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Change Orders */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Change Orders</h3>
              <Badge variant="outline" className="h-5 text-xs">{changeOrders.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex gap-2">
              {changeOrderSummary.pending > 0 && (
                <Badge variant="outline" className="text-xs text-orange-600">
                  {changeOrderSummary.pending} Pending
                </Badge>
              )}
              {changeOrderSummary.approvedCount > 0 && (
                <Badge variant="outline" className="text-xs text-green-600">
                  {changeOrderSummary.approvedCount} Approved
                </Badge>
              )}
              {changeOrderSummary.rejected > 0 && (
                <Badge variant="outline" className="text-xs text-destructive">
                  {changeOrderSummary.rejected} Rejected
                </Badge>
              )}
            </div>
            {changeOrderSummary.approvedCount > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved Revenue:</span>
                  <span className="font-medium">{formatCurrency(changeOrderSummary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved Costs:</span>
                  <span className="font-medium">{formatCurrency(changeOrderSummary.totalCosts)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Net Impact:</span>
                  <span className={`font-semibold ${
                    changeOrderSummary.netImpact >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}>
                    {formatCurrency(changeOrderSummary.netImpact)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <h3 className="text-sm font-semibold">Documentation</h3>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents?tab=photos`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Camera className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">{mediaCounts.photos}</div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
              </button>
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents?tab=videos`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Video className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">{mediaCounts.videos}</div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
              </button>
              <button 
                onClick={() => navigate(`/time-entries?tab=receipts&project=${project.id}`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Receipt className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium">{pendingReceipts}</div>
                  <div className="text-xs text-muted-foreground">Pending Receipts</div>
                </div>
              </button>
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <FileIcon className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">{documentCount}</div>
                  <div className="text-xs text-muted-foreground">Documents</div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Project Notes Timeline */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <h3 className="text-sm font-semibold">Project Notes</h3>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ProjectNotesTimeline projectId={project.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
