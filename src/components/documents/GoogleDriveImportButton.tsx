import { useEffect, useState } from "react";
import { CloudDownload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { useIsMobile } from "@/hooks/use-mobile";
import { isIOSPWA } from "@/utils/platform";
import { isDriveImportConfigured } from "@/lib/googleDriveConfig";
import {
  preloadDrivePicker,
  useGoogleDrivePicker,
} from "@/hooks/useGoogleDrivePicker";

interface GoogleDriveImportButtonProps {
  /** Receives the downloaded File(s). The CALLER owns upload + success/error
   * toasts + query invalidation; this button only owns pick/auth/download
   * feedback (Gotcha #42: one layer per concern). */
  onFiles: (files: File[]) => Promise<void> | void;
  multiple?: boolean;
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
}

/**
 * "Import from Google Drive" affordance. Renders NOTHING unless all gates
 * pass, so it is safe to mount unconditionally on any surface:
 * - `google_drive_import` DB feature flag (global + per-user overrides via
 *   /settings/feature-flags)
 * - Google Cloud credentials present in src/lib/googleDriveConfig.ts
 * - Desktop only: mobile users already reach Drive through the native file
 *   sheet (iOS/Android expose the Drive app inside the existing Upload/Attach
 *   pickers), and the GIS auth popup is unreliable in the standalone iOS PWA.
 */
export function GoogleDriveImportButton({
  onFiles,
  multiple = false,
  disabled = false,
  size = "sm",
  variant = "outline",
  className,
  label = "Import from Drive",
}: GoogleDriveImportButtonProps) {
  const { enabled: flagEnabled } = useDbFeatureFlag("google_drive_import");
  const isMobile = useIsMobile();
  const { pickFiles, isBusy } = useGoogleDrivePicker();
  const [isHandling, setIsHandling] = useState(false);

  const available =
    flagEnabled && isDriveImportConfigured() && !isMobile && !isIOSPWA();

  // Warm Google's scripts so the click-time auth popup opens inside the
  // user-gesture window (popup blockers kill late popups).
  useEffect(() => {
    if (available) preloadDrivePicker();
  }, [available]);

  if (!available) return null;

  const handleClick = async () => {
    try {
      const { files, skipped } = await pickFiles({ multiple });
      for (const skip of skipped) {
        toast.warning(`Skipped ${skip.name}`, { description: skip.reason });
      }
      if (files.length === 0) return;
      setIsHandling(true);
      await onFiles(files);
    } catch (error) {
      toast.error("Google Drive import failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsHandling(false);
    }
  };

  const busy = isBusy || isHandling;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={disabled || busy}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CloudDownload className="w-4 h-4 mr-2" />
      )}
      {busy ? "Importing…" : label}
    </Button>
  );
}
