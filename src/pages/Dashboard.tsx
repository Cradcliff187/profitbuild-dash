import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityFeedList } from '@/components/ActivityFeedList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard';
import { ProjectStatusCard } from '@/components/dashboard/ProjectStatusCard';
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
  
  // Needs Attention metrics
  const [pendingApprovals, setPendingApprovals] = useState({
    timeEntries: 0,
    receipts: 0
  });
  const [pendingChangeOrders, setPendingChangeOrders] = useState(0);
  const [expiringQuotes, setExpiringQuotes] = useState(0);
  const [draftEstimates, setDraftEstimates] = useState(0);

  // Financial metrics
  const [activeContractValue, setActiveContractValue] = useState(0);
  const [activeEstimatedCosts, setActiveEstimatedCosts] = useState(0);
  const [completedContractValue, setCompletedContractValue] = useState(0);

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
      .select('id, status')
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED');

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
      .select('status')
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED');

    if (error) {
      console.error('Error loading project status counts:', error);
      return;
    }

    const counts = data?.reduce((acc: Record<string, number>, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const statusOrder = ['in_progress', 'estimating', 'quoted', 'approved', 'complete', 'on_hold', 'cancelled'];
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

    if (coError) console.error('Error loading pending change orders:', coError);
    if (quotesError) console.error('Error loading expiring quotes:', quotesError);
    if (estimatesError) console.error('Error loading draft estimates:', estimatesError);

    setPendingChangeOrders(changeOrdersCount || 0);
    setExpiringQuotes(quotesCount || 0);
    setDraftEstimates(estimatesCount || 0);
  };

  const loadFinancialMetrics = async () => {
    // Get active projects (approved + in_progress)
    const { data: activeProjects, error: activeError } = await supabase
      .from('projects')
      .select('contracted_amount, adjusted_est_costs')
      .in('status', ['approved', 'in_progress'])
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED');

    if (activeError) {
      console.error('Error loading active project financials:', activeError);
    } else {
      const totalContractValue = activeProjects?.reduce((sum, p) => 
        sum + (p.contracted_amount || 0), 0) || 0;
      const totalEstCosts = activeProjects?.reduce((sum, p) => 
        sum + (p.adjusted_est_costs || 0), 0) || 0;
      
      setActiveContractValue(totalContractValue);
      setActiveEstimatedCosts(totalEstCosts);
    }

    // Get completed projects
    const { data: completedProjects, error: completedError } = await supabase
      .from('projects')
      .select('contracted_amount')
      .eq('status', 'complete')
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED');

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

      {/* Main Content: Activity Feed (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Activity Feed - Main Content */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ActivityFeedList limit={20} showFilters />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-3 order-1 lg:order-2">
          <NeedsAttentionCard
            pendingTimeEntries={pendingApprovals.timeEntries}
            pendingReceipts={pendingApprovals.receipts}
            pendingChangeOrders={pendingChangeOrders}
            expiringQuotes={expiringQuotes}
            draftEstimates={draftEstimates}
          />
          
          <ProjectStatusCard 
            statusCounts={projectStatusCounts}
            activeContractValue={activeContractValue}
            activeEstimatedCosts={activeEstimatedCosts}
            completedContractValue={completedContractValue}
          />
          
          <QuickActionsCard />
        </div>
      </div>
    </MobilePageWrapper>
  );
};

export default Dashboard;
