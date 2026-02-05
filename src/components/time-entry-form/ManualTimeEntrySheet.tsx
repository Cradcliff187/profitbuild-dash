import { useRef, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ManualTimeEntryForm } from './ManualTimeEntryForm';
import type { TimeEntryFormData } from './hooks/useTimeEntryForm';
import { cn } from '@/lib/utils';

export interface ManualTimeEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  title: string;
  description?: string;
  initialValues?: {
    workerId: string;
    projectId: string;
    projectNumber?: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    lunchTaken: boolean;
    lunchDurationMinutes: number;
    receiptUrl?: string;
  };
  onSave: (data: TimeEntryFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  disabled?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  showReceipt?: boolean;
  showRates?: boolean;
  /** When true, worker picker auto-selects current user and is read-only (field worker create). */
  restrictToCurrentUser?: boolean;
}

export function ManualTimeEntrySheet({
  open,
  onOpenChange,
  mode,
  title,
  description,
  initialValues,
  onSave,
  onCancel,
  onDelete,
  disabled = false,
  canEdit = true,
  canDelete = true,
  showRates = false,
  restrictToCurrentUser = false,
}: ManualTimeEntrySheetProps) {
  const isMobile = useIsMobile();
  const getFormDataRef = useRef<() => TimeEntryFormData>(() => ({} as TimeEntryFormData));

  const handleSave = useCallback(async () => {
    const data = getFormDataRef.current();
    await onSave(data);
    onOpenChange(false);
  }, [onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          'flex flex-col p-0',
          isMobile
            ? 'w-[92%] max-h-[92vh] rounded-t-2xl left-1/2 -translate-x-1/2 right-auto'
            : 'w-full sm:max-w-[500px]'
        )}
        side={isMobile ? 'bottom' : 'right'}
      >
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain touch-pan-y">
          <ManualTimeEntryForm
            mode={mode}
            initialValues={initialValues}
            disabled={disabled}
            canEdit={canEdit}
            showRates={showRates}
            restrictToCurrentUser={restrictToCurrentUser}
            onFormDataReady={(getData) => {
              getFormDataRef.current = getData;
            }}
          />
        </div>
        <footer className="flex gap-3 p-4 border-t bg-background shrink-0">
          <Button
            type="button"
            variant="ghost"
            className={cn('flex-1', isMobile && 'min-h-[48px]')}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          {mode === 'edit' && onDelete && canDelete && (
            <Button
              type="button"
              variant="destructive"
              className={cn('flex-1', isMobile && 'min-h-[48px]')}
              onClick={async () => {
                await onDelete?.();
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            className={cn('flex-1', isMobile && 'min-h-[48px]')}
            onClick={handleSave}
          >
            Save
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
