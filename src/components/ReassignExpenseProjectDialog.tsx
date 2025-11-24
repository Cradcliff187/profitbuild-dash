import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Project } from '@/types/project';
import { ProjectSelectorNew } from '@/components/ProjectSelectorNew';

interface ReassignExpenseProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseIds: string[];
  currentProjectName?: string;
}

export function ReassignExpenseProjectDialog({
  open,
  onClose,
  onSuccess,
  expenseIds,
  currentProjectName,
}: ReassignExpenseProjectDialogProps) {
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, project_name, client_name, category')
      .order('project_number', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
      return;
    }

    // Cast to Project type - ProjectSelectorNew only needs these fields
    setProjects(data as any || []);
  };

  const handleReassign = async () => {
    if (!selectedProject?.id) {
      toast.error('Please select a project');
      return;
    }

    setIsReassigning(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ project_id: selectedProject.id })
        .in('id', expenseIds);

      if (error) throw error;

      const count = expenseIds.length;
      toast.success(`${count} expense${count > 1 ? 's' : ''} reassigned successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error reassigning expenses:', error);
      toast.error('Failed to reassign expenses');
    } finally {
      setIsReassigning(false);
    }
  };

  const handleClose = () => {
    setSelectedProject(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Reassign {expenseIds.length} Expense{expenseIds.length > 1 ? 's' : ''} to Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {currentProjectName && expenseIds.length === 1 && (
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{currentProjectName}</span>
            </div>
          )}

          <ProjectSelectorNew
            projects={projects}
            selectedProject={selectedProject}
            onSelect={setSelectedProject}
            placeholder="Select a project..."
            hideCreateButton={true}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isReassigning}>
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              className="flex-1"
              disabled={!selectedProject || isReassigning}
            >
              {isReassigning ? 'Reassigning...' : 'Reassign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
