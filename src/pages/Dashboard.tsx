import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle, FileText } from "lucide-react";
import { ProjectStatusCard } from "@/components/dashboard/ProjectStatusCard";
import { ActivityFeedList } from "@/components/ActivityFeedList";

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

interface ProjectFinancialMetrics {
  activeContractValue: number;
  activeAdjustedCosts: number;
  completedContractValue: number;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  profitMargin: number;
  activeProjects: number;
  pendingEstimates: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    profitMargin: 0,
    activeProjects: 0,
    pendingEstimates: 0,
  });
  const [projectStatusMetrics, setProjectStatusMetrics] = useState<ProjectStatusMetrics>({
    inProgress: { count: 0, value: 0 },
    approved: { count: 0, value: 0 },
    activeTotal: { count: 0, value: 0 },
    estimating: { count: 0 },
    quoted: { count: 0 },
    complete: { count: 0, value: 0 },
    onHold: { count: 0 },
    cancelled: { count: 0 },
  });
  const [projectFinancialMetrics, setProjectFinancialMetrics] = useState<ProjectFinancialMetrics>({
    activeContractValue: 0,
    activeAdjustedCosts: 0,
    completedContractValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadFinancialMetrics(), loadProjectStatusMetrics(), loadProjectFinancialMetrics()]);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialMetrics = async () => {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("contracted_amount")
      .in("status", ["in_progress", "complete"])
      .neq("project_number", "SYS-000")
      .neq("project_number", "000-UNASSIGNED");

    if (error) throw error;

    const totalRevenue = projects?.reduce((sum, p) => sum + (p.contracted_amount || 0), 0) || 0;

    const totalExpenses = 0; // Expenses calculated separately if needed

    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const { count: activeCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("status", ["in_progress", "approved"])
      .neq("project_number", "SYS-000")
      .neq("project_number", "000-UNASSIGNED");

    const { count: estimateCount } = await supabase
      .from("estimates")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");

    setMetrics({
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin,
      activeProjects: activeCount || 0,
      pendingEstimates: estimateCount || 0,
    });
  };

  const loadProjectStatusMetrics = async () => {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("status, contracted_amount, project_number")
      .neq("project_number", "SYS-000")
      .neq("project_number", "000-UNASSIGNED");

    if (error) throw error;

    const statusMetrics: ProjectStatusMetrics = {
      inProgress: { count: 0, value: 0 },
      approved: { count: 0, value: 0 },
      activeTotal: { count: 0, value: 0 },
      estimating: { count: 0 },
      quoted: { count: 0 },
      complete: { count: 0, value: 0 },
      onHold: { count: 0 },
      cancelled: { count: 0 },
    };

    projects?.forEach((project) => {
      const contractedAmount = project.contracted_amount || 0;

      switch (project.status) {
        case "in_progress":
          statusMetrics.inProgress.count += 1;
          statusMetrics.inProgress.value += contractedAmount;
          break;
        case "approved":
          statusMetrics.approved.count += 1;
          statusMetrics.approved.value += contractedAmount;
          break;
        case "estimating":
          statusMetrics.estimating.count += 1;
          break;
        case "quoted":
          statusMetrics.quoted.count += 1;
          break;
        case "complete":
          statusMetrics.complete.count += 1;
          statusMetrics.complete.value += contractedAmount;
          break;
        case "on_hold":
          statusMetrics.onHold.count += 1;
          break;
        case "cancelled":
          statusMetrics.cancelled.count += 1;
          break;
      }
    });

    // Calculate active total
    statusMetrics.activeTotal = {
      count: statusMetrics.inProgress.count + statusMetrics.approved.count,
      value: statusMetrics.inProgress.value + statusMetrics.approved.value,
    };

    setProjectStatusMetrics(statusMetrics);
  };

  const loadProjectFinancialMetrics = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('status, contracted_amount, adjusted_est_costs')
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED');

    if (error) throw error;

    // Active projects (approved + in_progress)
    const activeProjects = data?.filter(p => 
      p.status === 'approved' || p.status === 'in_progress'
    ) || [];

    const activeContractValue = activeProjects.reduce(
      (sum, p) => sum + (p.contracted_amount || 0), 
      0
    );

    const activeAdjustedCosts = activeProjects.reduce(
      (sum, p) => sum + (p.adjusted_est_costs || 0), 
      0
    );

    // Completed projects
    const completedProjects = data?.filter(p => p.status === 'complete') || [];
    const completedContractValue = completedProjects.reduce(
      (sum, p) => sum + (p.contracted_amount || 0), 
      0
    );

    setProjectFinancialMetrics({
      activeContractValue,
      activeAdjustedCosts,
      completedContractValue,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your construction projects and finances</p>
      </div>

      {/* Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">{formatPercentage(metrics.profitMargin)} margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">{metrics.pendingEstimates} pending estimates</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <ProjectStatusCard metrics={projectStatusMetrics} financialMetrics={projectFinancialMetrics} />

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ActivityFeedList limit={10} showFilters={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
