import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface ReassignReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receiptIds: string[];
  currentProjectNumber?: string;
}

export function ReassignReceiptDialog({
  open,
  onClose,
  onSuccess,
  receiptIds,
  currentProjectNumber,
}: ReassignReceiptDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
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
      .select('id, project_number, project_name')
      .order('project_number', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
      return;
    }

    // Filter out system projects
    const filteredProjects = data.filter(
      (p) => !['SYS-000', '000-UNASSIGNED'].includes(p.project_number)
    );
    setProjects(filteredProjects);
  };

  const handleReassign = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    setIsReassigning(true);

    try {
      const { error } = await supabase
        .from('receipts')
        .update({ project_id: selectedProjectId })
        .in('id', receiptIds);

      if (error) throw error;

      const count = receiptIds.length;
      toast.success(`${count} receipt${count > 1 ? 's' : ''} reassigned successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error reassigning receipts:', error);
      toast.error('Failed to reassign receipts');
    } finally {
      setIsReassigning(false);
    }
  };

  const handleClose = () => {
    setSelectedProjectId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Reassign {receiptIds.length} Receipt{receiptIds.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {currentProjectNumber && receiptIds.length === 1 && (
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{currentProjectNumber}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="project">Select Project *</Label>
            <select
              id="project"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">Choose project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isReassigning}>
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              className="flex-1"
              disabled={!selectedProjectId || isReassigning}
            >
              {isReassigning ? 'Reassigning...' : 'Reassign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
