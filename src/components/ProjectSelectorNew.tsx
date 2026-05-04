/**
 * @file ProjectSelectorNew.tsx
 * @description Modern project selector with inline project creation capability.
 * 
 * **Use Case**: Primary project selection component for forms and workflows requiring
 * quick project creation without navigation away from current context.
 * 
 * **Key Features**:
 * - Works with generic Project objects (not estimate-specific)
 * - Inline project creation form (no modal, stays in context)
 * - Searchable dropdown with command palette UI (matches both project_number and project_name)
 * - Single-line row format: `{project_number} - {project_name}`, sorted descending by project_number
 * - Optional ability to hide "Create New" button
 * - Optional `disabled` prop to lock selection (e.g. split expenses)
 * 
 * **When to Use**:
 * - Time entry forms
 * - Expense/receipt assignment
 * - Work order creation
 * - Any workflow where users may need to quickly create a project
 * 
 * **Advantages over ProjectSelector**:
 * - Inline creation = faster workflow (no page navigation)
 * - Works with generic projects (not tied to estimate data)
 * - Better UX for rapid data entry scenarios
 * 
 * **Alternatives**:
 * - Use `ProjectSelector` if you need estimate financial data
 * - Use `FieldProjectSelector` for mobile-optimized field workflows
 */

import { useState } from "react";
import { Check, ChevronsUpDown, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { ProjectFormSimple } from "@/components/ProjectFormSimple";

interface ProjectSelectorNewProps {
  projects: Project[];
  selectedProject?: Project;
  onSelect: (project: Project) => void;
  onCreateNew?: (project: Project) => void;
  placeholder?: string;
  hideCreateButton?: boolean;
  disabled?: boolean;
}

/**
 * Modern project selector component with inline creation capability.
 * Displays projects in a searchable command palette with ability to create new projects without leaving context.
 */
export const ProjectSelectorNew = ({
  projects,
  selectedProject,
  onSelect,
  onCreateNew,
  placeholder = "Select a project...",
  hideCreateButton = false,
  disabled = false,
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
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
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
        <PopoverContent className="z-[100] w-full p-0 bg-background border shadow-md" align="start">
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
            <CommandGroup className="max-h-64 overflow-auto">
              {[...projects].sort((a, b) => {
                // Sort by project_number descending (highest to lowest)
                // Compare as strings for alphanumeric project numbers
                return b.project_number.localeCompare(a.project_number, undefined, { numeric: true, sensitivity: 'base' });
              }).map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.project_number} ${project.project_name}`}
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
                  <span className="font-medium">
                    {project.project_number} - {project.project_name}
                  </span>
                </CommandItem>
              ))}
              {projects.length > 0 && !hideCreateButton && (
                <CommandItem onSelect={handleCreateNewClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create New Project</span>
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {showProjectForm && (
        <ProjectFormSimple
          onSave={handleProjectCreated}
          onCancel={() => setShowProjectForm(false)}
        />
      )}
    </>
  );
};