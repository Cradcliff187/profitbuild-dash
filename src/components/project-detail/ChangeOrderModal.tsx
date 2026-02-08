import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChangeOrderForm } from '@/components/ChangeOrderForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

interface ChangeOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingChangeOrder: ChangeOrder | null;
  onSuccess: () => void;
}

export function ChangeOrderModal({
  open,
  onOpenChange,
  projectId,
  editingChangeOrder,
  onSuccess,
}: ChangeOrderModalProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col p-0",
          isMobile
            ? "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none !rounded-none !m-0"
            : "max-w-2xl max-h-[85vh]"
        )}
      >
        <DialogHeader className={cn("border-b flex-shrink-0", isMobile ? "px-3 pt-3 pb-2" : "px-6 pt-6 pb-4")}>
          <DialogTitle className="text-sm">
            {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
          </DialogTitle>
        </DialogHeader>
        <div className={cn("flex-1 overflow-y-auto", isMobile ? "px-3 py-4" : "px-6 py-4")}>
          <ChangeOrderForm
            projectId={projectId}
            changeOrder={editingChangeOrder || undefined}
            onSuccess={() => {
              onOpenChange(false);
              onSuccess();
              toast({
                title: "Success",
                description: `Change order ${editingChangeOrder ? 'updated' : 'created'} successfully.`
              });
            }}
            onCancel={() => {
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
