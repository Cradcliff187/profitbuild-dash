import { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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
    notes?: string;
  };
  /** Return true when the save persisted (sheet closes) or false to keep the sheet open. */
  onSave: (data: TimeEntryFormData) => Promise<boolean>;
  onCancel: () => void;
  /** Return true when the delete persisted (sheet closes) or false to keep the sheet open. */
  onDelete?: () => Promise<boolean>;
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
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  // Re-entry guard lives in a ref, not state — two taps in the same tick both
  // read stale `busy` state, but the ref flips synchronously on the first tap.
  const busyRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    // Blur first so the iOS keyboard/dictation session tears down before the
    // save chain runs.
    (document.activeElement as HTMLElement | null)?.blur?.();
    setBusy('save');
    try {
      const data = getFormDataRef.current();
      const ok = await onSave(data);
      if (ok === true) onOpenChange(false);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, [onSave, onOpenChange]);

  const handleDelete = useCallback(async () => {
    if (!onDelete || busyRef.current) return;
    busyRef.current = true;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setBusy('delete');
    try {
      const ok = await onDelete();
      if (ok === true) onOpenChange(false);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, [onDelete, onOpenChange]);

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
            ? 'w-[92%] max-h-[92vh] rounded-t-2xl inset-x-0 mx-auto sm:max-w-xl'
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
        <footer className="flex gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background shrink-0">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 min-h-[48px]"
            onClick={handleCancel}
            disabled={busy !== null || disabled}
          >
            Cancel
          </Button>
          {mode === 'edit' && onDelete && canDelete && (
            <Button
              type="button"
              variant="destructive"
              className="flex-1 min-h-[48px]"
              onClick={handleDelete}
              disabled={busy !== null || disabled}
            >
              {busy === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          )}
          <Button
            type="button"
            className="flex-1 min-h-[48px]"
            onClick={handleSave}
            disabled={busy !== null || disabled}
          >
            {busy === 'save' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
