import { useState } from "react";
import { Check, ChevronsUpDown, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { ProjectForm } from "@/components/ProjectForm";

interface ProjectSelectorNewProps {
  projects: Project[];
  selectedProject?: Project;
  onSelect: (project: Project) => void;
  onCreateNew?: (project: Project) => void;
  placeholder?: string;
}

export const ProjectSelectorNew = ({
  projects,
  selectedProject,
  onSelect,
  onCreateNew,
  placeholder = "Select a project..."
}: ProjectSelectorNewProps) => {
  const [open, setOpen] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const handleProjectCreated = (project: Project) => {
    setShowProjectForm(false);
    setOpen(false);
    onCreateNew?.(project);
    onSelect(project);
  };

  const handleCreateNewClick = () => {
    setShowProjectForm(true);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center">
              <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
              {selectedProject ? (
                <>
                  {/* Desktop: Horizontal layout */}
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="font-medium">{selectedProject.project_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedProject.project_number}
                    </span>
                  </div>
                  {/* Mobile: Vertical layout */}
                  <div className="flex sm:hidden flex-col items-start">
                    <span className="font-medium">{selectedProject.project_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedProject.project_number}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-50 w-full p-0 bg-background border shadow-md" align="start">
          <Command>
            <CommandInput placeholder="Search projects..." />
            <CommandEmpty>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">No projects found.</p>
                  <div className="w-full px-2">
                    <div
                      className="flex items-center justify-center px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                      onClick={handleCreateNewClick}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Project
                    </div>
                  </div>
                </div>
              ) : (
                "No projects found."
              )}
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.project_name} ${project.project_number}`}
                    onSelect={() => {
                      onSelect(project);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedProject?.id === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{project.project_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {project.project_number} • {project.client_name}
                      </span>
                    </div>
                  </CommandItem>
                ))}
                {projects.length > 0 && (
                  <CommandItem onSelect={handleCreateNewClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create New Project</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showProjectForm && (
        <ProjectForm
          onSave={handleProjectCreated}
          onCancel={() => setShowProjectForm(false)}
        />
      )}
    </>
  );
};