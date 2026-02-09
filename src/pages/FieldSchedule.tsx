import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useScheduleTasks } from '@/components/schedule/hooks/useScheduleTasks';
import { FieldScheduleTable } from '@/components/schedule/FieldScheduleTable';
import { ScheduleTask } from '@/types/schedule';

export default function FieldSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>('');
  const [projectStartDate, setProjectStartDate] = useState<string>('');
  const [projectEndDate, setProjectEndDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load project details
  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name, start_date, end_date')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project details');
        return;
      }

      if (data) {
        setProjectName(data.project_name);
        setProjectStartDate(data.start_date || '');
        setProjectEndDate(data.end_date || '');
      }
    };

    loadProject();
  }, [projectId]);

  const {
    tasks,
    isLoading,
    error,
    loadTasks,
    updateTask,
  } = useScheduleTasks({
    projectId: projectId || '',
    projectStartDate: projectStartDate ? new Date(projectStartDate) : new Date(),
    projectEndDate: projectEndDate ? new Date(projectEndDate) : new Date(),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
    toast.success("Schedule data updated");
  };

  const handleTaskUpdate = async (task: ScheduleTask) => {
    try {
      await updateTask(task);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const completedTasks = tasks.filter(t => {
    if (t.has_multiple_phases && t.phases) {
      return t.phases.every(p => p.completed);
    }
    return t.completed;
  }).length;

  if (!projectId) {
    return (
      <MobilePageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No project selected</p>
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper className="pb-safe" onRefresh={loadTasks} enablePullToRefresh>
      {/* Header */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/time-tracker')}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Time Tracker
        </Button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <h1 className="text-lg font-semibold truncate">{projectName || 'Project Schedule'}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {completedTasks} of {tasks.length} tasks complete
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {error && (
        <Card className="p-4 mb-4 border-destructive">
          <p className="text-sm text-destructive">{error.message || 'An error occurred'}</p>
        </Card>
      )}

      {isLoading && !tasks.length ? (
        <Card className="p-8">
          <BrandedLoader size="md" message="Loading schedule..." />
        </Card>
      ) : (
        <FieldScheduleTable
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          projectId={projectId}
        />
      )}
    </MobilePageWrapper>
  );
}
