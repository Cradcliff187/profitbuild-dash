import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  FileText, 
  DollarSign, 
  Briefcase, 
  FileCheck, 
  HandCoins,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityFeedItem {
  id: string;
  created_at: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  project_id: string | null;
  description: string;
  metadata: any;
  user?: {
    full_name: string;
  };
  project?: {
    project_number: string;
    project_name: string;
  };
}

interface ActivityFeedListProps {
  limit?: number;
  projectId?: string | null;
  showFilters?: boolean;
}

export const ActivityFeedList = ({ 
  limit = 50, 
  projectId = null,
  showFilters = true 
}: ActivityFeedListProps) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [hasMore, setHasMore] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_feed')
        .select(`
          *,
          user:profiles(full_name),
          project:projects(project_number, project_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (activityTypeFilter !== 'all') {
        query = query.like('activity_type', `${activityTypeFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);
      
      const { count } = await supabase
        .from('activity_feed')
        .select('*', { count: 'exact', head: true });
      
      setHasMore((count || 0) > limit);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [limit, projectId, activityTypeFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('activity-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: projectId ? `project_id=eq.${projectId}` : undefined
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getActivityIcon = (activityType: string) => {
    if (activityType.startsWith('time_entry')) return Clock;
    if (activityType.startsWith('receipt')) return FileText;
    if (activityType.startsWith('expense')) return DollarSign;
    if (activityType.startsWith('project')) return Briefcase;
    if (activityType.startsWith('estimate')) return FileCheck;
    if (activityType.startsWith('quote')) return HandCoins;
    if (activityType.startsWith('change_order')) return TrendingUp;
    return AlertCircle;
  };

  const getActivityColor = (activityType: string) => {
    if (activityType.includes('approved')) return 'text-green-600';
    if (activityType.includes('rejected')) return 'text-red-600';
    if (activityType.includes('created') || activityType.includes('uploaded')) return 'text-blue-600';
    if (activityType.includes('updated')) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  const handleActivityClick = (activity: ActivityFeedItem) => {
    switch (activity.entity_type) {
      case 'time_entry':
        navigate('/time-entries');
        break;
      case 'receipt':
        navigate('/time-tracker');
        break;
      case 'expense':
        navigate('/expenses');
        break;
      case 'project':
        navigate(`/projects/${activity.entity_id}`);
        break;
      case 'estimate':
        if (activity.project_id) {
          navigate(`/projects/${activity.project_id}`);
        }
        break;
      case 'quote':
        navigate('/quotes');
        break;
      case 'change_order':
        if (activity.project_id) {
          navigate(`/projects/${activity.project_id}`);
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <div className="text-xs text-muted-foreground">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showFilters && (
        <div className="flex items-center gap-2 mb-2">
          <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
            <SelectTrigger className="h-7 text-xs w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="time_entry">Time Entries</SelectItem>
              <SelectItem value="receipt">Receipts</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="estimate">Estimates</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="change_order">Change Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.activity_type);
          const colorClass = getActivityColor(activity.activity_type);
          
          return (
            <div
              key={activity.id}
              className="flex items-start gap-2 p-2 rounded hover:bg-muted/40 transition-colors cursor-pointer border border-transparent hover:border-border"
              onClick={() => handleActivityClick(activity)}
            >
              <div className={`mt-0.5 ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground leading-tight mb-0.5">
                  {activity.description}
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                  
                  {activity.user && (
                    <>
                      <span>•</span>
                      <span>{activity.user.full_name}</span>
                    </>
                  )}
                  
                  {activity.project && !projectId && (
                    <>
                      <span>•</span>
                      <span>{activity.project.project_number}</span>
                    </>
                  )}
                </div>
              </div>

              {activity.activity_type.includes('approved') && (
                <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700">
                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                  Approved
                </Badge>
              )}
              {activity.activity_type.includes('rejected') && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  <XCircle className="h-2.5 w-2.5 mr-0.5" />
                  Rejected
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => loadActivities()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};
