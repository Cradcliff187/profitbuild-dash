import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Users, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";

interface RevenueBulkActionsProps {
  selectedRevenueIds: string[];
  onSelectionChange: (selection: Set<string>) => void;
  onComplete: () => void;
}

export const RevenueBulkActions = ({ 
  selectedRevenueIds, 
  onSelectionChange, 
  onComplete 
}: RevenueBulkActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);


  // Load projects when project dialog opens
  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_number", { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("project_revenues")
        .delete()
        .in("id", selectedRevenueIds);

      if (error) throw error;

      toast.success(`${selectedRevenueIds.length} invoice${selectedRevenueIds.length !== 1 ? 's' : ''} deleted successfully`);

      onSelectionChange(new Set());
      onComplete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting invoices:", error);
      toast.error("Failed to delete invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAssignProject = async () => {
    if (!selectedProject) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("project_revenues")
        .update({ project_id: selectedProject.id })
        .in("id", selectedRevenueIds);

      if (error) throw error;

      toast.success(`${selectedRevenueIds.length} invoice${selectedRevenueIds.length !== 1 ? 's' : ''} assigned to ${selectedProject.project_name}`);

      onSelectionChange(new Set());
      onComplete();
      setShowProjectDialog(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error assigning invoices to project:", error);
      toast.error("Failed to assign invoices to project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <Users className="h-4 w-4 shrink-0" />
              <span className="font-medium text-sm truncate">{selectedRevenueIds.length} invoice{selectedRevenueIds.length !== 1 ? 's' : ''} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange(new Set())}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-w-0 sm:ml-auto">
              <Button
                onClick={() => {
                  loadProjects();
                  setShowProjectDialog(true);
                }}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-initial min-w-0"
              >
                <Building2 className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Assign Project</span>
              </Button>

              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="destructive"
                className="flex-1 sm:flex-initial min-w-0"
              >
                <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Delete Selected</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRevenueIds.length} selected invoice{selectedRevenueIds.length !== 1 ? 's' : ''}? 
              This action cannot be undone and may affect project financials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Assignment Dialog */}
      <AlertDialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign to Project</AlertDialogTitle>
            <AlertDialogDescription>
              Select the project to assign {selectedRevenueIds.length} selected invoice{selectedRevenueIds.length !== 1 ? 's' : ''} to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <ProjectSelectorNew
              projects={projects}
              selectedProject={selectedProject}
              onSelect={setSelectedProject}
              placeholder="Select a project..."
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkAssignProject}
              disabled={isLoading || !selectedProject}
            >
              {isLoading ? "Assigning..." : "Assign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

