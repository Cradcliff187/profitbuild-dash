import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCheck, StickyNote, Camera, FileText } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useScheduleTasks } from '@/components/schedule/hooks/useScheduleTasks';
import { FieldScheduleTable } from '@/components/schedule/FieldScheduleTable';
import { FieldQuickActionBar } from '@/components/schedule/FieldQuickActionBar';
import { FieldMediaGallery } from '@/components/schedule/FieldMediaGallery';
import { FieldDocumentsList } from '@/components/schedule/FieldDocumentsList';
import { ProjectNotesTimeline } from '@/components/ProjectNotesTimeline';
import { ScheduleTask } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

type FieldTab = 'tasks' | 'notes' | 'media' | 'docs';

interface TabDef {
  id: FieldTab;
  icon: React.ElementType;
  label: string;
}

const tabs: TabDef[] = [
  { id: 'tasks', icon: ClipboardCheck, label: 'Tasks' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'media', icon: Camera, label: 'Media' },
  { id: 'docs', icon: FileText, label: 'Docs' },
];

export default function FieldSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectName, setProjectName] = useState<string>('');
  const [projectStartDate, setProjectStartDate] = useState<string>('');
  const [projectEndDate, setProjectEndDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialTab = (searchParams.get('tab') as FieldTab) || 'tasks';
  const [activeTab, setActiveTab] = useState<FieldTab>(initialTab);

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

  // Badge counts
  const notesCount = useQuery({
    queryKey: ['project-notes-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_notes')
        .select('id')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!projectId,
  });

  const mediaCount = useQuery({
    queryKey: ['project-media-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_media')
        .select('id')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!projectId,
  });

  const docsCount = useQuery({
    queryKey: ['project-docs-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select('id')
        .eq('project_id', projectId!)
        .in('document_type', ['drawing', 'permit', 'license', 'specification']);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!projectId,
  });

  const badgeCounts: Record<FieldTab, number | undefined> = {
    tasks: tasks.length || undefined,
    notes: notesCount.data || undefined,
    media: mediaCount.data || undefined,
    docs: docsCount.data || undefined,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
    toast.success('Schedule data updated');
  };

  const handleTaskUpdate = async (task: ScheduleTask) => {
    try {
      await updateTask(task);
      toast.success('Task updated');
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('Failed to update task');
    }
  };

  const completedTasks = tasks.filter((t) => {
    if (t.has_multiple_phases && t.phases) {
      return t.phases.every((p) => p.completed);
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
    <MobilePageWrapper className="pb-24" onRefresh={loadTasks} enablePullToRefresh>
      {/* Header */}
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/time-tracker')}
          className="mb-2 -ml-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Time Tracker
        </Button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{projectName || 'Project'}</h1>
            <p className="text-sm text-muted-foreground">
              {completedTasks} of {tasks.length} tasks complete
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-shrink-0 min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 bg-muted/40 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = badgeCounts[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all min-h-[44px]',
                isActive
                  ? 'bg-background shadow-sm text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="h-4 min-w-[16px] px-1 text-[9px] font-medium"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {error && (
        <Card className="p-4 mb-4 border-destructive">
          <p className="text-sm text-destructive">{error.message || 'An error occurred'}</p>
        </Card>
      )}

      {activeTab === 'tasks' && (
        isLoading && !tasks.length ? (
          <Card className="p-8">
            <BrandedLoader size="md" message="Loading schedule..." />
          </Card>
        ) : (
          <FieldScheduleTable
            tasks={tasks}
            projectId={projectId}
            onTaskUpdate={handleTaskUpdate}
          />
        )
      )}

      {activeTab === 'notes' && (
        <ProjectNotesTimeline projectId={projectId} inSheet hideComposer />
      )}

      {activeTab === 'media' && (
        <FieldMediaGallery projectId={projectId} />
      )}

      {activeTab === 'docs' && (
        <FieldDocumentsList projectId={projectId} />
      )}

      {/* Quick Action Bar */}
      <FieldQuickActionBar projectId={projectId} />
    </MobilePageWrapper>
  );
}
