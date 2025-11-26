import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Expense } from '@/types/expense';

interface ExpenseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  onSave: (expense: Expense) => void;
  defaultProjectId?: string;
  projectName?: string;
}

export const ExpenseFormSheet: React.FC<ExpenseFormSheetProps> = ({
  open,
  onOpenChange,
  expense,
  onSave,
  defaultProjectId,
  projectName,
}) => {
  const handleSave = (savedExpense: Expense) => {
    onSave(savedExpense);
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
            {expense ? 'Edit Expense' : projectName ? `Add Expense for ${projectName}` : 'Add New Expense'}
          </SheetTitle>
          <SheetDescription>
            {expense 
              ? 'Update expense details and save changes' 
              : projectName
              ? 'Enter expense information to track project costs'
              : 'Enter expense information to track project costs'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ExpenseForm 
            expense={expense} 
            onSave={handleSave} 
            onCancel={handleCancel}
            defaultProjectId={defaultProjectId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

