import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityFeedList } from '@/components/ActivityFeedList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard';
import { ProjectStatusCard } from '@/components/dashboard/ProjectStatusCard';
import { WorkOrderStatusCard } from '@/components/dashboard/WorkOrderStatusCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';

interface ProjectStatusCount {
  status: string;
  count: number;
  label: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
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
  const [workOrderGrossMargin, setWorkOrderGrossMargin] = useState(0);
  const [workOrderGrossMarginPercent, setWorkOrderGrossMarginPercent] = useState(0);
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
  const [activeGrossMargin, setActiveGrossMargin] = useState(0);
  const [activeGrossMarginPercent, setActiveGrossMarginPercent] = useState(0);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshKey]);

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

    const activeCount = data?.filter(p => 
      ['in_progress', 'approved', 'quoted'].includes(p.status)
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

    const statusOrder = ['estimating', 'approved', 'in_progress', 'complete', 'cancelled', 'quoted', 'on_hold'];
    const statusLabels: Record<string, string> = {
      'in_progress': 'In Progress',
      'estimating': 'Estimating',
      'quoted': 'Quoted',
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
      .select('status, category, contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, estimates!left(id, is_auto_generated)')
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

    const statusOrder = ['estimating', 'approved', 'in_progress', 'complete', 'cancelled', 'quoted', 'on_hold'];
    const statusLabels: Record<string, string> = {
      'in_progress': 'In Progress',
      'estimating': 'Estimating',
      'quoted': 'Quoted',
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

    // Count work orders without proper estimates
    const withoutEstimates = data?.filter(wo => {
      const estimates = wo.estimates || [];
      return estimates.length === 0 || estimates.every(est => est.is_auto_generated);
    }).length || 0;

    setWorkOrderContractValue(totalContractValue);
    setWorkOrderEstimatedCosts(totalEstCosts);
    setWorkOrderGrossMargin(totalProjectedMargin);
    setWorkOrderGrossMarginPercent(aggregateMarginPercent);
    setWorkOrderCompletedValue(totalCompleted);
    setWorkOrdersWithoutEstimates(withoutEstimates);
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
      .select('contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, category')
      .in('status', ['approved', 'in_progress'])
      .eq('category', 'construction');

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
      setActiveGrossMargin(totalProjectedMargin);
      setActiveGrossMarginPercent(aggregateMarginPercent);
    }

    // Get completed projects
    const { data: completedProjects, error: completedError } = await supabase
      .from('projects')
      .select('contracted_amount, category')
      .eq('status', 'complete')
      .eq('category', 'construction');

    if (completedError) {
      console.error('Error loading completed project financials:', completedError);
    } else {
      const totalCompleted = completedProjects?.reduce((sum, p) => 
        sum + (p.contracted_amount || 0), 0) || 0;
      
      setCompletedContractValue(totalCompleted);
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
      <DashboardHeader
        activeProjectCount={activeProjectCount}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Content: 2-Column Layout (Activity Feed 50%, Right Column 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Activity Feed - 50% width on desktop */}
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ActivityFeedList limit={20} showFilters />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 50% width on desktop */}
        <div className="space-y-3 order-1 lg:order-2">
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
            activeGrossMargin={activeGrossMargin}
            activeGrossMarginPercent={activeGrossMarginPercent}
          />

          <WorkOrderStatusCard
            statusCounts={workOrderStatusCounts}
            activeContractValue={workOrderContractValue}
            activeEstimatedCosts={workOrderEstimatedCosts}
            completedContractValue={workOrderCompletedValue}
            activeGrossMargin={workOrderGrossMargin}
            activeGrossMarginPercent={workOrderGrossMarginPercent}
          />
        </div>
      </div>

      {/* Quick Actions - Full Width Below Grid */}
      <div className="mt-4">
        <QuickActionsCard />
      </div>
    </MobilePageWrapper>
  );
};

export default Dashboard;
