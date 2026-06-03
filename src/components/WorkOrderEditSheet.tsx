import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ProjectEditForm } from '@/components/ProjectEditForm';
import { Project } from '@/types/project';

interface WorkOrderEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: Project;
  onSave: (project: Project) => void;
}

export const WorkOrderEditSheet: React.FC<WorkOrderEditSheetProps> = ({
  open,
  onOpenChange,
  workOrder,
  onSave,
}) => {
  const handleSave = (savedProject: Project) => {
    onSave(savedProject);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Full-width on mobile; the form supplies the scroll body + pinned footer. */}
      <SheetContent className="w-full sm:max-w-[640px] flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-4 sm:px-6 pt-6 pb-4 border-b shrink-0 text-left">
          <SheetTitle>Edit Work Order {workOrder.project_number}</SheetTitle>
          <SheetDescription>
            Update work order details and save changes
          </SheetDescription>
        </SheetHeader>

        <ProjectEditForm
          variant="sheet"
          project={workOrder}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </SheetContent>
    </Sheet>
  );
};
