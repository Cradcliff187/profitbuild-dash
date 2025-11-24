/**
 * @file FieldProjectSelector.tsx
 * @description Mobile-optimized project selector for field worker workflows.
 * 
 * **Use Case**: Project selection on mobile devices during field operations
 * (photo capture, video capture, time tracking in the field).
 * 
 * **Key Features**:
 * - Fetches projects directly (no parent data dependency)
 * - Filters to construction projects only (excludes system and overhead categories)
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
 * - Automatic filtering by category (construction only)
 * 
 * **Alternatives**:
 * - Use `ProjectSelectorNew` for desktop forms with inline creation
 * - Use `ProjectSelector` for estimate-specific workflows
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { BrandedLoader } from "@/components/ui/branded-loader";
import { AlertCircle, Search } from 'lucide-react';

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
  category: string;
}

export function FieldProjectSelector({ selectedProjectId, onProjectSelect }: FieldProjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['field-accessible-projects'],
    queryFn: async () => {
      // Filter to construction projects only (excludes system and overhead categories)
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, status, category')
        .eq('category', 'construction')
        .order('project_number', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    
    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.project_number.toLowerCase().includes(query) ||
      project.project_name.toLowerCase().includes(query) ||
      (project.client_name && project.client_name.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

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
    <Select 
      value={selectedProjectId} 
      onValueChange={(value) => {
        onProjectSelect(value);
        setSearchQuery(''); // Clear search on selection
      }}
    >
      <SelectTrigger className="w-full h-12">
        <SelectValue placeholder="Select a project..." />
      </SelectTrigger>
      <SelectContent>
        {/* Search Input INSIDE Dropdown */}
        <div className="flex items-center border-b border-border px-3 pb-2 pt-2 focus-within:border-2 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/20 focus-within:ring-offset-0 transition-colors">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {/* Filtered Projects */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="font-medium">
                {project.project_number} - {project.project_name}
              </span>
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No projects found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
