import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, FileText, Calendar, Activity } from "lucide-react";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProjectStatusCount {
  status: string;
  count: number;
}

interface UpcomingTask {
  id: string;
  task_type: 'estimate' | 'change_order';
  description: string;
  project_name: string;
  category: string;
  scheduled_start_date: string;
  scheduled_end_date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [projectStatusCounts, setProjectStatusCounts] = useState<ProjectStatusCount[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [pendingTimeEntries, setPendingTimeEntries] = useState(0);
  const [pendingReceipts, setPendingReceipts] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch project counts by status (excluding placeholder projects)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status')
        .not('project_number', 'in', '("SYS-000","000-UNASSIGNED")');

      if (projectsError) throw projectsError;

      // Group by status
      const statusCounts = projects.reduce((acc: Record<string, number>, proj) => {
        acc[proj.status] = (acc[proj.status] || 0) + 1;
        return acc;
      }, {});

      setProjectStatusCounts(
        Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      );

      // Fetch upcoming scheduled tasks (next 7 days)
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get estimate line items
      const { data: estimateTasks, error: estimateError } = await supabase
        .from('estimate_line_items')
        .select(`
          id,
          description,
          category,
          scheduled_start_date,
          scheduled_end_date,
          estimate_id,
          estimates!inner(project_id, projects!inner(project_name))
        `)
        .gte('scheduled_start_date', today)
        .lte('scheduled_start_date', sevenDaysFromNow)
        .not('scheduled_start_date', 'is', null)
        .order('scheduled_start_date', { ascending: true })
        .limit(10);

      if (estimateError) throw estimateError;

      // Get change order line items
      const { data: changeOrderTasks, error: changeOrderError } = await supabase
        .from('change_order_line_items')
        .select(`
          id,
          description,
          category,
          scheduled_start_date,
          scheduled_end_date,
          change_order_id,
          change_orders!inner(project_id, projects!inner(project_name))
        `)
        .gte('scheduled_start_date', today)
        .lte('scheduled_start_date', sevenDaysFromNow)
        .not('scheduled_start_date', 'is', null)
        .order('scheduled_start_date', { ascending: true })
        .limit(10);

      if (changeOrderError) throw changeOrderError;

      // Combine and format tasks
      const formattedEstimateTasks: UpcomingTask[] = (estimateTasks || []).map((task: any) => ({
        id: task.id,
        task_type: 'estimate' as const,
        description: task.description,
        project_name: task.estimates.projects.project_name,
        category: task.category,
        scheduled_start_date: task.scheduled_start_date,
        scheduled_end_date: task.scheduled_end_date,
      }));

      const formattedChangeOrderTasks: UpcomingTask[] = (changeOrderTasks || []).map((task: any) => ({
        id: task.id,
        task_type: 'change_order' as const,
        description: task.description,
        project_name: task.change_orders.projects.project_name,
        category: task.category,
        scheduled_start_date: task.scheduled_start_date,
        scheduled_end_date: task.scheduled_end_date,
      }));

      const allTasks = [...formattedEstimateTasks, ...formattedChangeOrderTasks]
        .sort((a, b) => a.scheduled_start_date.localeCompare(b.scheduled_start_date))
        .slice(0, 20);

      setUpcomingTasks(allTasks);

      // Fetch pending time entries count
      const { count: timeEntriesCount, error: timeEntriesError } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'labor_internal')
        .in('approval_status', ['pending', 'null']);

      if (timeEntriesError) throw timeEntriesError;
      setPendingTimeEntries(timeEntriesCount || 0);

      // Fetch pending receipts count
      const { count: receiptsCount, error: receiptsError } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (receiptsError) throw receiptsError;
      setPendingReceipts(receiptsCount || 0);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'estimating': 'Estimating',
      'quoted': 'Quoted',
      'approved': 'Approved',
      'in_progress': 'In Progress',
      'complete': 'Complete',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'estimating': 'border-l-blue-500',
      'quoted': 'border-l-purple-500',
      'approved': 'border-l-green-500',
      'in_progress': 'border-l-orange-500',
      'complete': 'border-l-emerald-600',
      'on_hold': 'border-l-yellow-500',
      'cancelled': 'border-l-gray-500',
    };
    return colors[status] || 'border-l-gray-400';
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'labor_internal': 'bg-blue-100 text-blue-800',
      'labor_subcontractor': 'bg-purple-100 text-purple-800',
      'materials': 'bg-green-100 text-green-800',
      'equipment': 'bg-orange-100 text-orange-800',
      'permits': 'bg-yellow-100 text-yellow-800',
      'other': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <BrandedLoader />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-[1600px]">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {/* Projects by Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {projectStatusCounts.map(({ status, count }) => (
          <Card
            key={status}
            className={`border-l-4 ${getStatusColor(status)} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => navigate('/projects')}
          >
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground mb-1">{getStatusLabel(status)}</div>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
          onClick={() => navigate('/time-entries')}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pending Time Entries</div>
              <div className="text-2xl font-bold">{pendingTimeEntries}</div>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
          onClick={() => navigate('/time-tracker')}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pending Receipts</div>
              <div className="text-2xl font-bold">{pendingReceipts}</div>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Schedule (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingTasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No scheduled tasks in the next 7 days
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Start Date</th>
                    <th className="text-left p-2 font-medium">End Date</th>
                    <th className="text-left p-2 font-medium">Project</th>
                    <th className="text-left p-2 font-medium">Description</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50 h-9">
                      <td className="p-2">{format(new Date(task.scheduled_start_date), 'MMM d')}</td>
                      <td className="p-2">{format(new Date(task.scheduled_end_date), 'MMM d')}</td>
                      <td className="p-2 font-medium">{task.project_name}</td>
                      <td className="p-2">{task.description}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${getCategoryBadgeColor(task.category)}`}>
                          {task.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {task.task_type === 'estimate' ? 'EST' : 'CO'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed Placeholder */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground text-center py-8">
            Activity feed coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;