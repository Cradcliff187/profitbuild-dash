/**
 * @file FieldProjectSelector.tsx
 * @description Mobile-optimized project selector for field worker workflows.
 * 
 * **Use Case**: Project selection on mobile devices during field operations
 * (photo capture, video capture, time tracking in the field).
 * 
 * **Key Features**:
 * - Fetches projects directly (no parent data dependency)
 * - Excludes system projects (SYS-000, 000-UNASSIGNED)
 * - Mobile-friendly native select UI (not command palette)
 * - Automatic loading/error states
 * - Shows project number, name, and client in compact format
 * 
 * **When to Use**:
 * - Field photo/video capture workflows
 * - Mobile time tracking
 * - Any field worker interface requiring project selection
 * 
 * **Why Mobile-Optimized**:
 * - Uses native `<Select>` (better touch targets, native OS UI)
 * - Self-contained data fetching (works independently)
 * - Compact display optimized for small screens
 * - Automatic filtering of system/administrative projects
 * 
 * **Alternatives**:
 * - Use `ProjectSelectorNew` for desktop forms with inline creation
 * - Use `ProjectSelector` for estimate-specific workflows
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BrandedLoader } from "@/components/ui/branded-loader";
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
      // Exclude system projects (SYS-000 and 000-UNASSIGNED) which are used
      // for holding unassigned receipts/expenses and should never be selectable for media capture
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, status')
        .neq('project_number', 'SYS-000')
        .neq('project_number', '000-UNASSIGNED')
        .order('project_number', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <BrandedLoader message="Loading projects..." />
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
        <p className="text-sm text-muted-foreground">No projects available</p>
        <p className="text-xs text-muted-foreground mt-1">Create a project to start capturing media</p>
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
