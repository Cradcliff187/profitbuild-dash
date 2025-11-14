import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export const TimeEntryDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  description,
  children 
}: TimeEntryDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-[500px] flex flex-col p-0"
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};
