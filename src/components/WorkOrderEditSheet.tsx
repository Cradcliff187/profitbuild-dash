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
      <SheetContent className="w-full sm:max-w-[700px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Edit Work Order {workOrder.project_number}</SheetTitle>
          <SheetDescription>
            Update work order details and save changes
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ProjectEditForm 
            project={workOrder} 
            onSave={handleSave} 
            onCancel={handleCancel} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

