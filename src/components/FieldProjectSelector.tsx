import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LoadingSpinner } from './ui/loading-spinner';
import { AlertCircle } from 'lucide-react';

interface FieldProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  status: string;
}

export function FieldProjectSelector({ selectedProjectId, onProjectSelect }: FieldProjectSelectorProps) {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['field-accessible-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, status')
        .in('status', ['estimating', 'in_progress'])
        .order('project_number', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner variant="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">Failed to load projects</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">No active projects assigned to you</p>
        <p className="text-xs text-muted-foreground mt-1">Contact your manager for project access</p>
      </div>
    );
  }

  return (
    <Select value={selectedProjectId} onValueChange={onProjectSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a project..." />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex flex-col">
              <span className="font-medium">
                {project.project_number} - {project.project_name}
              </span>
              <span className="text-xs text-muted-foreground">{project.client_name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
