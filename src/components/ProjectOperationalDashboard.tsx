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
  DollarSign,
  FileSignature,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, cn } from '@/lib/utils';
import { getMarginThresholdStatus, getThresholdStatusColor } from '@/utils/thresholdUtils';
import { calculateBudgetStatus, calculateScheduleStatus, getExpiringQuotes, getProjectScheduleDates } from '@/utils/projectDashboard';
import { getContingencyColor } from '@/utils/financialColors';
import type { Project } from '@/types/project';
import type { Estimate } from '@/types/estimate';
import type { Quote } from '@/types/quote';
import type { Expense } from '@/types/expense';
import type { ChangeOrder } from '@/types/changeOrder';
import { ProjectNotesTimeline } from './ProjectNotesTimeline';
import { supabase } from '@/integrations/supabase/client';

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

  // Data freshness tracking
  const [dataFreshness, setDataFreshness] = useState<{
    lastExpenseDays: number | null;
    lastTimeDays: number | null;
  }>({ lastExpenseDays: null, lastTimeDays: null });

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

  // Load data freshness for active projects
  useEffect(() => {
    async function checkFreshness() {
      if (!project.id) return;

      // Last non-labor expense by expense_date (not created_at)
      const { data: lastExpense } = await supabase
        .from('expenses')
        .select('expense_date')
        .eq('project_id', project.id)
        .neq('category', 'labor_internal')
        .order('expense_date', { ascending: false })
        .limit(1)
        .single();

      // Last time entry (labor_internal expense) by expense_date
      const { data: lastTime } = await supabase
        .from('expenses')
        .select('expense_date')
        .eq('project_id', project.id)
        .eq('category', 'labor_internal')
        .order('expense_date', { ascending: false })
        .limit(1)
        .single();

      const now = new Date();
      setDataFreshness({
        lastExpenseDays: lastExpense?.expense_date
          ? Math.floor((now.getTime() - new Date(lastExpense.expense_date).getTime()) / 86400000)
          : null,
        lastTimeDays: lastTime?.expense_date
          ? Math.floor((now.getTime() - new Date(lastTime.expense_date).getTime()) / 86400000)
          : null,
      });
    }

    // Only check freshness for active projects — irrelevant for estimating/complete
    if (['in_progress', 'approved'].includes(project.status)) {
      checkFreshness();
    }
  }, [project.id, project.status]);

  // Labor cushion data from estimate_financial_summary
  const [laborCushion, setLaborCushion] = useState<{
    cushionHoursCapacity: number | null;
    totalLaborCapacity: number | null;
    totalLaborHours: number | null;
    scheduleBufferPercent: number | null;
  } | null>(null);

  useEffect(() => {
    async function fetchCushionData() {
      if (!project.id) return;

      // Step 1: Find the current version estimate for this project.
      // Prefer is_current_version = true; fall back to most recent approved.
      let estimateId: string | null = null;

      const { data: currentEstimate } = await supabase
        .from('estimates')
        .select('id')
        .eq('project_id', project.id)
        .eq('is_current_version', true)
        .limit(1)
        .maybeSingle();

      if (currentEstimate) {
        estimateId = currentEstimate.id;
      } else {
        // Fallback: most recent approved estimate
        const { data: approvedEstimate } = await supabase
          .from('estimates')
          .select('id')
          .eq('project_id', project.id)
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (approvedEstimate) {
          estimateId = approvedEstimate.id;
        }
      }

      if (!estimateId) return;

      // Step 2: Fetch financial summary for the resolved estimate
      const { data } = await supabase
        .from('estimate_financial_summary')
        .select('cushion_hours_capacity, total_labor_capacity, total_labor_hours, schedule_buffer_percent')
        .eq('estimate_id', estimateId)
        .maybeSingle();

      if (data) {
        setLaborCushion({
          cushionHoursCapacity: data.cushion_hours_capacity,
          totalLaborCapacity: data.total_labor_capacity,
          totalLaborHours: data.total_labor_hours,
          scheduleBufferPercent: data.schedule_buffer_percent,
        });
      }
    }

    if (['approved', 'in_progress'].includes(project.status)) {
      fetchCushionData();
    }
  }, [project.id, project.status]);

  // Actual hours from time entries (expenses.category = 'labor_internal')
  // project.actual_hours may not be populated, so aggregate from source.
  const [actualHoursFromEntries, setActualHoursFromEntries] = useState<number | null>(null);

  useEffect(() => {
    async function fetchActualHours() {
      if (!project.id) return;

      const { data } = await supabase
        .from('expenses')
        .select('hours')
        .eq('project_id', project.id)
        .eq('category', 'labor_internal');

      if (data) {
        const total = data.reduce((sum, entry) => sum + (entry.hours ?? 0), 0);
        setActualHoursFromEntries(total);
      }
    }

    if (['approved', 'in_progress'].includes(project.status)) {
      fetchActualHours();
    }
  }, [project.id, project.status]);

  // Owner name for reference card
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOwner() {
      if (!project.owner_id) return;
      const { data } = await supabase
        .from('payees')
        .select('payee_name')
        .eq('id', project.owner_id)
        .single();
      if (data) setOwnerName(data.payee_name);
    }
    fetchOwner();
  }, [project.owner_id]);

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
    
    // DNE Warning — check if expenses approaching do_not_exceed
    if (project.do_not_exceed && project.do_not_exceed > 0) {
      const totalExpenses = (project as any).total_expenses ?? 0;
      const utilizationPct = (totalExpenses / project.do_not_exceed) * 100;
      if (utilizationPct >= 80) {
        const remaining = project.do_not_exceed - totalExpenses;
        items.push({
          type: 'dne_warning',
          label: `DNE: ${formatCurrency(remaining)} of ${formatCurrency(project.do_not_exceed)} remaining (${utilizationPct.toFixed(0)}% used)`,
          count: 1,
          color: utilizationPct >= 95 ? 'red' : 'orange',
          icon: AlertTriangle,
          onClick: () => navigate(`/projects/${project.id}/expenses`),
        });
      }
    }
    
    // Contingency Warning
    const contingencyAmount = project.contingency_amount ?? 0;
    const contingencyRemaining = project.contingency_remaining ?? 0;
    if (contingencyAmount > 0) {
      const remainingPct = (contingencyRemaining / contingencyAmount) * 100;
      if (remainingPct <= 25) {
        items.push({
          type: 'contingency_warning',
          label: `Contingency: ${formatCurrency(contingencyRemaining)} left (${remainingPct.toFixed(0)}%)`,
          count: 1,
          color: remainingPct <= 10 ? 'red' : 'orange',
          icon: AlertTriangle,
          onClick: () => navigate(`/projects/${project.id}/change-orders`),
        });
      }
    }
    
    // Data Freshness Warning — only for active projects with stale data
    if (['in_progress', 'approved'].includes(project.status)) {
      if (dataFreshness.lastExpenseDays !== null && dataFreshness.lastExpenseDays > 14) {
        items.push({
          type: 'stale_expenses',
          label: `No material/sub expenses in ${dataFreshness.lastExpenseDays} days`,
          count: 1,
          color: 'orange',
          icon: Clock,
          onClick: () => navigate(`/projects/${project.id}/expenses`),
        });
      }
      if (dataFreshness.lastTimeDays !== null && dataFreshness.lastTimeDays > 7) {
        items.push({
          type: 'stale_time',
          label: `No time entries in ${dataFreshness.lastTimeDays} days`,
          count: 1,
          color: 'orange',
          icon: Clock,
          onClick: () => navigate('/time-entries'),
        });
      }
    }
    
    return items;
  }, [pendingTimeEntries, pendingReceipts, changeOrders, quotes, project, navigate, dataFreshness]);

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
          label1: 'Estimate Value',
          value1: contractValue || estimateValue,
          label2: 'Estimated Costs',
          value2: adjustedEstCosts || estimatedCosts,
          marginLabel: 'Est. Margin',
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
      {/* Project Reference Card */}
      {(project.start_date || project.end_date || project.customer_po_number || project.do_not_exceed || ownerName) && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project Details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {ownerName && (
              <>
                <span className="text-muted-foreground text-xs">Owner</span>
                <span className="font-medium text-xs">{ownerName}</span>
              </>
            )}
            {project.start_date && (
              <>
                <span className="text-muted-foreground text-xs">Start</span>
                <span className="font-medium text-xs">{format(new Date(project.start_date), 'MMM d, yyyy')}</span>
              </>
            )}
            {project.end_date && (
              <>
                <span className="text-muted-foreground text-xs">End</span>
                <span className="font-medium text-xs">{format(new Date(project.end_date), 'MMM d, yyyy')}</span>
              </>
            )}
            {project.customer_po_number && (
              <>
                <span className="text-muted-foreground text-xs">Customer PO</span>
                <span className="font-mono font-medium text-xs">{project.customer_po_number}</span>
              </>
            )}
            {project.do_not_exceed != null && project.do_not_exceed > 0 && (
              <>
                <span className="text-muted-foreground text-xs">DNE Cap</span>
                <span className="font-mono font-medium text-xs">{formatCurrency(project.do_not_exceed)}</span>
              </>
            )}
          </div>
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
                {project.status !== 'estimating' ? 'Original Margin' : 'Est. Margin %'}
              </div>
              <div className="text-base sm:text-xl font-bold text-foreground">
                {project.status !== 'estimating'
                  ? formatCurrency(project.original_margin ?? 0)
                  : financialDisplay.marginPct
                    ? `${financialDisplay.marginPct.toFixed(1)}%`
                    : '—'}
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
          {/* Navigation to Cost Tracking */}
          {project.status !== 'estimating' && (
            <button
              onClick={() => navigate(`/projects/${project.id}/control`)}
              className="mt-3 pt-2 border-t text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 w-full"
            >
              View Cost Tracking
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Budget Status + Contingency */}
      {financialDisplay.showBudgetStatus && project.status !== 'cancelled' && (
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
                <button
                  onClick={() => navigate(`/projects/${project.id}/expenses`)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {budgetStatus.percentSpent.toFixed(1)}% spent →
                </button>
                <span className="font-medium">{formatCurrency(budgetStatus.remaining)} remaining</span>
              </div>
              {/* Contingency — inside Budget Status card, below existing progress bar */}
              {(project.contingency_amount ?? 0) > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Contingency</span>
                    <span
                      className={getContingencyColor(
                        ((project.contingency_remaining ?? 0) /
                          (project.contingency_amount ?? 0)) *
                          100
                      )}
                    >
                      {formatCurrency(project.contingency_remaining ?? 0)} left
                    </span>
                  </div>
                  <Progress
                    value={
                      ((project.contingency_remaining ?? 0) /
                        (project.contingency_amount ?? 0)) *
                      100
                    }
                    className="h-1.5"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && project.status !== 'cancelled' && (
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

      {/* Labor + Schedule */}
      {(() => {
        // Effective estimated hours: project.estimated_hours may never be populated,
        // so fall back to laborCushion.totalLaborHours from the current estimate.
        const effectiveEstimatedHours = (project.estimated_hours ?? 0) > 0
          ? (project.estimated_hours ?? 0)
          : (laborCushion?.totalLaborHours ?? 0);
        // Effective actual hours: project.actual_hours may never be populated,
        // so fall back to aggregated time entry hours.
        const effectiveActualHours = (project.actual_hours ?? 0) > 0
          ? (project.actual_hours ?? 0)
          : (actualHoursFromEntries ?? 0);
        const showLabor = ['approved', 'in_progress'].includes(project.status) && effectiveEstimatedHours > 0;
        const showSchedule = project.status !== 'estimating' || !!scheduleDates.start || !!scheduleDates.end;

        if (!showLabor && !showSchedule) return null;

        return (
          <div className={cn(
            "grid gap-3",
            showLabor && showSchedule
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1"
          )}>
            {/* Labor — enhanced with cushion visibility */}
            {showLabor && (
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Labor
                  </span>
                </div>
                <div className="space-y-2">
                  {/* Hours breakdown — 3-tier display */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Hours</span>
                      <span className="font-mono font-semibold">
                        {effectiveEstimatedHours.toFixed(0)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual Hours</span>
                      <span className={cn(
                        "font-mono font-semibold",
                        effectiveActualHours <= effectiveEstimatedHours
                          ? "text-foreground"
                          : laborCushion?.totalLaborCapacity && effectiveActualHours <= laborCushion.totalLaborCapacity
                            ? "text-yellow-600"
                            : laborCushion?.totalLaborCapacity && effectiveActualHours > laborCushion.totalLaborCapacity
                              ? "text-red-600"
                              : "text-foreground"
                      )}>
                        {effectiveActualHours.toFixed(0)}h
                      </span>
                    </div>

                    <Separator className="my-1" />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled Remaining</span>
                      <span className="font-mono font-semibold">
                        {Math.max(0, effectiveEstimatedHours - effectiveActualHours).toFixed(0)}h
                      </span>
                    </div>

                    {/* Cushion buffer — only if data available */}
                    {laborCushion?.cushionHoursCapacity != null && laborCushion.cushionHoursCapacity > 0 && (
                      <div className="flex justify-between text-yellow-600">
                        <span>+ Cushion Buffer</span>
                        <span className="font-mono font-semibold">
                          +{laborCushion.cushionHoursCapacity.toFixed(0)}h
                        </span>
                      </div>
                    )}

                    {/* Total remaining capacity */}
                    {laborCushion?.totalLaborCapacity != null && laborCushion.totalLaborCapacity > 0 && (
                      <>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Capacity Remaining</span>
                          <span className="font-mono">
                            {Math.max(0, laborCushion.totalLaborCapacity - effectiveActualHours).toFixed(0)}h
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress bar — use total capacity as denominator when available */}
                  {(() => {
                    const denominator = laborCushion?.totalLaborCapacity ?? effectiveEstimatedHours;
                    const actual = effectiveActualHours;
                    const pct = denominator > 0 ? (actual / denominator) * 100 : 0;
                    const estimatedPct = denominator > 0 ? (effectiveEstimatedHours / denominator) * 100 : 0;

                    const inCushionZone = actual > effectiveEstimatedHours && laborCushion?.totalLaborCapacity;
                    const overCapacity = laborCushion?.totalLaborCapacity && actual > laborCushion.totalLaborCapacity;

                    return (
                      <div className="space-y-1">
                        <div className="relative">
                          <Progress
                            value={Math.min(pct, 100)}
                            className={cn(
                              "h-2",
                              overCapacity
                                ? "[&>div]:bg-destructive"
                                : inCushionZone
                                  ? "[&>div]:bg-yellow-500"
                                  : "[&>div]:bg-primary"
                            )}
                          />
                          {/* Estimated hours marker when cushion exists */}
                          {laborCushion?.totalLaborCapacity && laborCushion.totalLaborCapacity > effectiveEstimatedHours && (
                            <div
                              className="absolute top-0 h-2 w-px bg-foreground/40"
                              style={{ left: `${estimatedPct}%` }}
                              title={`Estimated: ${effectiveEstimatedHours.toFixed(0)}h`}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {pct.toFixed(0)}% of {laborCushion?.totalLaborCapacity ? 'capacity' : 'estimate'} used
                          </span>
                          {laborCushion?.scheduleBufferPercent != null && (
                            <span>{laborCushion.scheduleBufferPercent.toFixed(0)}% buffer</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Data freshness */}
                  {dataFreshness.lastTimeDays !== null && (
                    <div className="text-xs text-muted-foreground">
                      Last time entry:{' '}
                      {dataFreshness.lastTimeDays === 0
                        ? 'Today'
                        : `${dataFreshness.lastTimeDays}d ago`}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Schedule */}
            {showSchedule && (
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
                        <span className="text-muted-foreground">Start</span>
                        <span>{scheduleDates.start ? new Date(scheduleDates.start).toLocaleDateString() : 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">End</span>
                        <span>{scheduleDates.end ? new Date(scheduleDates.end).toLocaleDateString() : 'Not set'}</span>
                      </div>
                      {scheduleStatus.totalDays > 0 && (
                        <Progress value={scheduleStatus.percentComplete} className="h-1.5" />
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {scheduleStatus.percentComplete.toFixed(0)}% elapsed
                        </span>
                        <span className={`text-xs font-medium ${
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
                  {/* Navigate to Schedule page */}
                  <button
                    onClick={() => navigate(`/projects/${project.id}/schedule`)}
                    className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    View Schedule
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Change Orders */}
      {changeOrders.length > 0 && (
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
            <button
              onClick={() => navigate(`/projects/${project.id}/changes`)}
              className="mt-2 pt-2 border-t text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 w-full"
            >
              View Change Orders
              <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      {(project.status !== 'estimating' || mediaCounts.photos > 0 || mediaCounts.videos > 0 || pendingReceipts > 0 || documentCount > 0) && (
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
      )}

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
  );
}
