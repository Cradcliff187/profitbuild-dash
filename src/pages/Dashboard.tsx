import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityFeedList } from '@/components/ActivityFeedList';
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard';
import { ProjectStatusCard } from '@/components/dashboard/ProjectStatusCard';
import { WorkOrderStatusCard } from '@/components/dashboard/WorkOrderStatusCard';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectStatusCount {
  status: string;
  count: number;
  label: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Operational metrics
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [projectStatusCounts, setProjectStatusCounts] = useState<ProjectStatusCount[]>([]);
  
  // Work Order metrics
  const [workOrderStatusCounts, setWorkOrderStatusCounts] = useState<ProjectStatusCount[]>([]);
  const [workOrderContractValue, setWorkOrderContractValue] = useState(0);
  const [workOrderEstimatedCosts, setWorkOrderEstimatedCosts] = useState(0);
  const [workOrderCompletedValue, setWorkOrderCompletedValue] = useState(0);
  const [workOrderProjectedMargin, setWorkOrderProjectedMargin] = useState(0);
  const [workOrderProjectedMarginPercent, setWorkOrderProjectedMarginPercent] = useState(0);
  const [workOrdersWithoutEstimates, setWorkOrdersWithoutEstimates] = useState(0);
  
  // Needs Attention metrics
  const [pendingApprovals, setPendingApprovals] = useState({
    timeEntries: 0,
    receipts: 0
  });
  const [pendingChangeOrders, setPendingChangeOrders] = useState(0);
  const [expiringQuotes, setExpiringQuotes] = useState(0);
  const [draftEstimates, setDraftEstimates] = useState(0);
  const [overdueWorkOrders, setOverdueWorkOrders] = useState(0);
  const [workOrdersOnHold, setWorkOrdersOnHold] = useState(0);
  const [workOrdersOverBudget, setWorkOrdersOverBudget] = useState(0);

  // Financial metrics
  const [activeContractValue, setActiveContractValue] = useState(0);
  const [activeEstimatedCosts, setActiveEstimatedCosts] = useState(0);
  const [completedContractValue, setCompletedContractValue] = useState(0);
  const [activeProjectedMargin, setActiveProjectedMargin] = useState(0);
  const [activeProjectedMarginPercent, setActiveProjectedMarginPercent] = useState(0);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [workOrderTotalInvoiced, setWorkOrderTotalInvoiced] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Set up real-time subscriptions for pending approvals
    const timeEntriesChannel = supabase
      .channel('dashboard-time-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: 'category=eq.labor_internal'
        },
        () => {
          loadPendingApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timeEntriesChannel);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActiveProjectCount(),
        loadProjectStatusCounts(),
        loadWorkOrderStatusCounts(),
        loadPendingApprovals(),
        loadNeedsAttentionData(),
        loadFinancialMetrics()
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveProjectCount = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, status, category')
      .eq('category', 'construction');

    if (error) {
      console.error('Error loading active projects:', error);
      return;
    }

    // Count active projects: approved + in_progress only
    // (matches the financial metrics filter for consistency)
    const activeCount = data?.filter(p =>
      ['in_progress', 'approved'].includes(p.status)
    ).length || 0;

    setActiveProjectCount(activeCount);
  };

  const loadProjectStatusCounts = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('status, category')
      .eq('category', 'construction')
      .neq('project_type', 'work_order');

    if (error) {
      console.error('Error loading project status counts:', error);
      return;
    }

    const counts = data?.reduce((acc: Record<string, number>, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const statusOrder = ['estimating', 'approved', 'in_progress', 'complete', 'cancelled', 'on_hold'];
    const statusLabels: Record<string, string> = {
      'in_progress': 'In Progress',
      'estimating': 'Estimating',
      'approved': 'Approved',
      'complete': 'Complete',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled'
    };

    const formattedCounts = statusOrder
      .filter(status => counts[status] > 0)
      .map(status => ({
        status,
        count: counts[status],
        label: statusLabels[status]
      }));

    setProjectStatusCounts(formattedCounts);
  };

  const loadWorkOrderStatusCounts = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, status, category, contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, estimates!left(id, is_auto_generated)')
      .eq('category', 'construction')
      .eq('project_type', 'work_order');

    if (error) {
      console.error('Error loading work order status counts:', error);
      return;
    }

    const counts = data?.reduce((acc: Record<string, number>, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const statusOrder = ['estimating', 'approved', 'in_progress', 'complete', 'cancelled', 'on_hold'];
    const statusLabels: Record<string, string> = {
      'in_progress': 'In Progress',
      'estimating': 'Estimating',
      'approved': 'Approved',
      'complete': 'Complete',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled'
    };

    const formattedCounts = statusOrder
      .filter(status => counts[status] > 0)
      .map(status => ({
        status,
        count: counts[status],
        label: statusLabels[status]
      }));

    setWorkOrderStatusCounts(formattedCounts);

    // Calculate active work order metrics
    const activeWorkOrders = data?.filter(wo => ['in_progress', 'approved'].includes(wo.status)) || [];
    
    const totalContractValue = activeWorkOrders.reduce((sum, wo) => sum + (wo.contracted_amount || 0), 0);
    const totalEstCosts = activeWorkOrders.reduce((sum, wo) => sum + (wo.adjusted_est_costs || 0), 0);
    const totalProjectedMargin = activeWorkOrders.reduce((sum, wo) => sum + (wo.projected_margin || 0), 0);
    const aggregateMarginPercent = totalContractValue > 0 
      ? (totalProjectedMargin / totalContractValue) * 100 
      : 0;

    // Calculate completed work orders value
    const completedWorkOrders = data?.filter(wo => wo.status === 'complete') || [];
    const totalCompleted = completedWorkOrders.reduce((sum, wo) => sum + (wo.contracted_amount || 0), 0);

    // Count work orders with NO estimates at all
    const withoutEstimates = data?.filter(wo => {
      const estimates = wo.estimates || [];
      return estimates.length === 0;
    }).length || 0;

    setWorkOrderContractValue(totalContractValue);
    setWorkOrderEstimatedCosts(totalEstCosts);
    setWorkOrderProjectedMargin(totalProjectedMargin);
    setWorkOrderProjectedMarginPercent(aggregateMarginPercent);
    setWorkOrderCompletedValue(totalCompleted);
    setWorkOrdersWithoutEstimates(withoutEstimates);

    // Calculate total invoiced for work orders
    const workOrderIds = data?.map(wo => wo.id) || [];
    if (workOrderIds.length > 0) {
      const { data: woRevenues, error: woRevenueError } = await supabase
        .from('project_revenues')
        .select('amount')
        .in('project_id', workOrderIds)
        .eq('is_split', false);

      if (!woRevenueError && woRevenues) {
        const woInvoicedTotal = woRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
        setWorkOrderTotalInvoiced(woInvoicedTotal);
      }
    }
  };

  const loadPendingApprovals = async () => {
    // Pending time entries
    const { count: timeEntriesCount, error: timeError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .eq('category', 'labor_internal');

    // Pending receipts
    const { count: receiptsCount, error: receiptsError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .not('receipt_id', 'is', null);

    if (timeError) console.error('Error loading pending time entries:', timeError);
    if (receiptsError) console.error('Error loading pending receipts:', receiptsError);

    setPendingApprovals({
      timeEntries: timeEntriesCount || 0,
      receipts: receiptsCount || 0
    });
  };

  const loadNeedsAttentionData = async () => {
    // Pending change orders
    const { count: changeOrdersCount, error: coError } = await supabase
      .from('change_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Expiring quotes (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { count: quotesCount, error: quotesError } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('valid_until', new Date().toISOString())
      .lte('valid_until', sevenDaysFromNow.toISOString());

    // Draft estimates
    const { count: estimatesCount, error: estimatesError } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    // Overdue work orders
    const today = new Date().toISOString().split('T')[0];
    const { count: overdueCount, error: overdueError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'work_order')
      .eq('status', 'in_progress')
      .lt('end_date', today);

    // Work orders on hold
    const { count: onHoldCount, error: onHoldError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'work_order')
      .eq('status', 'on_hold');

    // Work orders over budget
    const { data: inProgressWOs, error: budgetError } = await supabase
      .from('projects')
      .select('id, adjusted_est_costs')
      .eq('project_type', 'work_order')
      .eq('status', 'in_progress')
      .gt('adjusted_est_costs', 0);

    let overBudgetCount = 0;
    if (inProgressWOs && !budgetError) {
      for (const wo of inProgressWOs) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('project_id', wo.id);
        
        const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        if (totalExpenses > wo.adjusted_est_costs) {
          overBudgetCount++;
        }
      }
    }

    if (coError) console.error('Error loading pending change orders:', coError);
    if (quotesError) console.error('Error loading expiring quotes:', quotesError);
    if (estimatesError) console.error('Error loading draft estimates:', estimatesError);
    if (overdueError) console.error('Error loading overdue work orders:', overdueError);
    if (onHoldError) console.error('Error loading on hold work orders:', onHoldError);
    if (budgetError) console.error('Error loading work order budget data:', budgetError);

    setPendingChangeOrders(changeOrdersCount || 0);
    setExpiringQuotes(quotesCount || 0);
    setDraftEstimates(estimatesCount || 0);
    setOverdueWorkOrders(overdueCount || 0);
    setWorkOrdersOnHold(onHoldCount || 0);
    setWorkOrdersOverBudget(overBudgetCount);
  };

  const loadFinancialMetrics = async () => {
    // Get active projects (approved + in_progress)
    const { data: activeProjects, error: activeError } = await supabase
      .from('projects')
      .select('id, contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, category')
      .in('status', ['approved', 'in_progress'])
      .eq('category', 'construction')
      .neq('project_type', 'work_order');

    if (activeError) {
      console.error('Error loading active project financials:', activeError);
    } else {
      const totalContractValue = activeProjects?.reduce((sum, p) => 
        sum + (p.contracted_amount || 0), 0) || 0;
      const totalEstCosts = activeProjects?.reduce((sum, p) => 
        sum + (p.adjusted_est_costs || 0), 0) || 0;
      const totalProjectedMargin = activeProjects?.reduce((sum, p) => 
        sum + (p.projected_margin || 0), 0) || 0;
      const aggregateMarginPercent = totalContractValue > 0 
        ? (totalProjectedMargin / totalContractValue) * 100 
        : 0;
      
      setActiveContractValue(totalContractValue);
      setActiveEstimatedCosts(totalEstCosts);
      setActiveProjectedMargin(totalProjectedMargin);
      setActiveProjectedMarginPercent(aggregateMarginPercent);
    }

    // Get completed projects
    const { data: completedProjects, error: completedError } = await supabase
      .from('projects')
      .select('id, contracted_amount, category')
      .eq('status', 'complete')
      .eq('category', 'construction')
      .neq('project_type', 'work_order');

    if (completedError) {
      console.error('Error loading completed project financials:', completedError);
    } else {
      const totalCompleted = completedProjects?.reduce((sum, p) => 
        sum + (p.contracted_amount || 0), 0) || 0;
      
      setCompletedContractValue(totalCompleted);
    }

    // Calculate total invoiced for construction projects (excluding work orders)
    const allProjectIds = [
      ...(activeProjects?.map(p => p.id) || []),
      ...(completedProjects?.map(p => p.id) || [])
    ];

    if (allProjectIds.length > 0) {
      const { data: revenues, error: revenueError } = await supabase
        .from('project_revenues')
        .select('amount')
        .in('project_id', allProjectIds)
        .eq('is_split', false);

      if (!revenueError && revenues) {
        const totalInvoicedAmount = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
        setTotalInvoiced(totalInvoicedAmount);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <MobilePageWrapper>
        <BrandedLoader message="Loading dashboard..." />
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Overview of projects and activities"
        actions={
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Main Content: 2-Column Layout (Activity Feed 60%, Right Column 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Activity Feed - 60% width on desktop */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ActivityFeedList limit={20} showFilters />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 40% width on desktop */}
        <div className="lg:col-span-2 space-y-3 order-1 lg:order-2">
          <NeedsAttentionCard
            pendingTimeEntries={pendingApprovals.timeEntries}
            pendingReceipts={pendingApprovals.receipts}
            pendingChangeOrders={pendingChangeOrders}
            expiringQuotes={expiringQuotes}
            draftEstimates={draftEstimates}
            workOrdersWithoutEstimates={workOrdersWithoutEstimates}
            overdueWorkOrders={overdueWorkOrders}
            workOrdersOnHold={workOrdersOnHold}
            workOrdersOverBudget={workOrdersOverBudget}
          />
          
          <ProjectStatusCard 
            statusCounts={projectStatusCounts}
            activeContractValue={activeContractValue}
            activeEstimatedCosts={activeEstimatedCosts}
            completedContractValue={completedContractValue}
            activeProjectedMargin={activeProjectedMargin}
            activeProjectedMarginPercent={activeProjectedMarginPercent}
            totalInvoiced={totalInvoiced}
          />

          <WorkOrderStatusCard
            statusCounts={workOrderStatusCounts}
            activeContractValue={workOrderContractValue}
            activeEstimatedCosts={workOrderEstimatedCosts}
            completedContractValue={workOrderCompletedValue}
            activeProjectedMargin={workOrderProjectedMargin}
            activeProjectedMarginPercent={workOrderProjectedMarginPercent}
            totalInvoiced={workOrderTotalInvoiced}
          />
        </div>
      </div>
    </MobilePageWrapper>
  );
};

export default Dashboard;
