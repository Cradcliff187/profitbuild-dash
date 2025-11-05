import React, { useState, useMemo } from 'react';
import { X, Calendar, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  address?: string;
}

interface ProjectScheduleSelectorProps {
  open: boolean;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onClose: () => void;
}

export const ProjectScheduleSelector: React.FC<ProjectScheduleSelectorProps> = ({
  open,
  projects,
  onSelectProject,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    
    const query = searchQuery.toLowerCase();
    return projects.filter(
      p =>
        p.project_number.toLowerCase().includes(query) ||
        p.project_name.toLowerCase().includes(query) ||
        p.client_name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-background rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">View Project Schedule</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No projects found' : 'No active projects'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3",
                      "hover:bg-accent/50 active:bg-accent transition-colors",
                      "text-left"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          {project.project_number}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {project.project_name}
                        </span>
                      </div>
                      {project.client_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.client_name}
                        </p>
                      )}
                      {project.address && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                          {project.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
