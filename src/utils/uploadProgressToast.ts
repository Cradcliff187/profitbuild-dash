import { toast } from 'sonner';

/**
 * Persistent progress indicator for multi-file (or slow single-file) uploads.
 *
 * One sonner loading toast (spinner, never auto-dismisses) is opened for the
 * whole operation and updated in place per file ("Uploading 3 of 12…"), then
 * resolved on the SAME toast id to success/warning/error. This replaces the
 * old pattern — an auto-dismissing info toast at the start plus a summary at
 * the end — which left long batches with no visible "still uploading" signal.
 *
 * Every path through an upload handler MUST resolve the toast (success /
 * warning / error / dismiss), or the spinner is stranded on screen.
 *
 * Toast ownership contract (Gotcha #42): surfaces own user-facing toasts,
 * upload hooks/utils stay silent. Call this from component handlers only.
 */
export function createUploadProgressToast(total: number, label = 'file') {
  const id = toast.loading(
    total === 1
      ? `Uploading ${label}…`
      : `Uploading 1 of ${total} ${label}s…`
  );

  return {
    /** Update the label as file `current` (1-based) starts uploading. */
    progress(current: number) {
      if (total > 1) {
        toast.loading(`Uploading ${current} of ${total} ${label}s…`, { id });
      }
    },
    success(message: string, description?: string) {
      toast.success(message, { id, description });
    },
    warning(message: string, description?: string) {
      toast.warning(message, { id, description });
    },
    error(message: string, description?: string) {
      toast.error(message, { id, description });
    },
    /** Close without a result toast — use when a per-file error toast already told the story. */
    dismiss() {
      toast.dismiss(id);
    },
  };
}
