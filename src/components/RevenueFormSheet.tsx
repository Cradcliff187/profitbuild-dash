import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { RevenueForm } from '@/components/RevenueForm';
import { ProjectRevenue } from '@/types/revenue';

interface RevenueFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenue?: ProjectRevenue;
  onSave: (revenue: ProjectRevenue) => void;
  defaultProjectId?: string;
  projectName?: string;
}

export const RevenueFormSheet: React.FC<RevenueFormSheetProps> = ({
  open,
  onOpenChange,
  revenue,
  onSave,
  defaultProjectId,
  projectName,
}) => {
  const handleSave = (savedRevenue: ProjectRevenue) => {
    onSave(savedRevenue);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[700px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>
            {revenue ? 'Edit Invoice' : projectName ? `Add Invoice for ${projectName}` : 'Add New Invoice'}
          </SheetTitle>
          <SheetDescription>
            {revenue 
              ? 'Update invoice details and save changes' 
              : projectName
              ? 'Enter invoice information to track project revenue'
              : 'Enter invoice information to track project revenue'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <RevenueForm 
            revenue={revenue} 
            onSave={handleSave} 
            onCancel={handleCancel}
            defaultProjectId={defaultProjectId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
