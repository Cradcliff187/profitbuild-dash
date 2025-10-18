import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-h-[95vh] overflow-y-auto",
          isMobile 
            ? "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl pb-safe max-w-full w-full p-4 sm:p-6" 
            : "max-w-lg"
        )}
        onPointerDownOutside={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
        onOpenAutoFocus={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};
