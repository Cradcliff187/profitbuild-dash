import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmDialogOptions {
  title: string;
  /** Plain-text summary rendered as the dialog description. */
  description?: string;
  /**
   * Structured content (detail rows, lists) rendered between the header and
   * the footer. Kept out of AlertDialogDescription because that renders a
   * <p> and block children inside it are invalid HTML.
   */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (deletes). */
  destructive?: boolean;
}

/**
 * Promise-returning replacement for window.confirm on in-app flows
 * (Gotcha #73). Call `confirm(opts)` from any handler and render `dialog`
 * once in the component tree; the promise resolves true on confirm and
 * false on cancel or any dismissal (Escape, overlay tap). One hook instance
 * serves multiple confirm sites in the same component — options are
 * per-call.
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // A second confirm while one is pending settles the first as cancelled.
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const dialog = (
    <AlertDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      {/* z-[75]: this app's SheetContent is z-[60] (+ overlay z-[55]), above
          the shadcn default z-50 — an unraised confirm paints BEHIND an open
          sheet and the save appears to hang. Same reason dropdown-menu.tsx
          uses z-[70]. */}
      <AlertDialogContent className="z-[75] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {options?.body}
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel
            className="w-full sm:w-auto"
            onClick={() => settle(false)}
          >
            {options?.cancelLabel ?? 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              'w-full sm:w-auto',
              options?.destructive &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
