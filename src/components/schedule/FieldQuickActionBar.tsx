import { useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StickyNote, Camera, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteComposer } from '@/components/notes/NoteComposer';
import { uploadProjectMedia } from '@/utils/projectMedia';
import { uploadProjectDocument } from '@/utils/projectDocumentUpload';
import { validateMediaFile } from '@/utils/mediaMetadata';
import { createUploadProgressToast } from '@/utils/uploadProgressToast';
import { toast } from 'sonner';

interface FieldQuickActionBarProps {
  projectId: string;
  onNoteCreated?: () => void;
}

/**
 * Three-button quick-action row: Note · Camera · Attach.
 *
 * Routing by button + file type (kept deliberate so the item lands where the
 * user expects to find it later):
 *
 *   Camera                → project_media  (Media tab) — with optional GPS
 *   Attach, image/video   → project_media  (Media tab)
 *   Attach, PDF/doc/etc.  → project_documents as 'other' (Documents tab)
 *   NoteComposer internal → note-attachments (stays on the Notes timeline,
 *                           inline with any message text the user wrote)
 *
 * The Note button opens a shared NoteComposer in sheet presentation — full
 * text + mentions + voice + attach flow. The composer's internal attach menu
 * is INTENTIONALLY separate from this bar: a photo captioned "north wall
 * framing done" belongs on the Notes timeline with that text; a raw photo with
 * no words belongs in Media.
 */
export function FieldQuickActionBar({ projectId, onNoteCreated }: FieldQuickActionBarProps) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Ask for device GPS once per capture so the Media entry carries location.
  // Fails silently on permission denial or unsupported devices — the photo
  // still uploads, just without lat/lon.
  const getGeolocation = async (): Promise<{ latitude: number; longitude: number; altitude?: number } | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude ?? undefined,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const invalidateMediaAndDocs = () => {
    queryClient.invalidateQueries({ queryKey: ['project-media', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-media-count', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-docs-count', projectId] });
  };

  const uploadMediaFile = async (file: File, uploadSource: 'camera' | 'gallery' | 'web') => {
    const validation = validateMediaFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid file');
      return false;
    }
    const loc = uploadSource === 'camera' ? await getGeolocation() : null;
    const { error } = await uploadProjectMedia({
      projectId,
      file,
      uploadSource,
      latitude: loc?.latitude,
      longitude: loc?.longitude,
      altitude: loc?.altitude,
      takenAt: new Date().toISOString(),
      // Raw UA stored for forensics; display layer (formatDeviceLabel) renders
      // a short human-readable label like "iPhone · Safari".
      deviceModel: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    if (error) {
      toast.error('Failed to upload', { description: error.message });
      return false;
    }
    return true;
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    // Persistent loading toast (spinner) instead of an auto-dismissing info
    // toast — a big photo on slow LTE outlives the 4s default and left no
    // visible "still uploading" signal.
    const progress = createUploadProgressToast(1, 'photo');
    const ok = await uploadMediaFile(file, 'camera');
    setIsUploading(false);
    if (ok) {
      progress.success('Photo added to Media');
      invalidateMediaAndDocs();
      onNoteCreated?.();
    } else {
      // uploadMediaFile already fired the specific error toast.
      progress.dismiss();
    }
  };

  const handleAttachClick = () => {
    attachInputRef.current?.click();
  };

  const handleAttachFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setIsUploading(true);
    let mediaCount = 0;
    let docCount = 0;
    let failCount = 0;

    // One persistent loading toast for the whole batch, updated per file
    // ("Uploading 3 of 12…") and resolved in place — large batches used to go
    // silent between the start toast and the summary.
    const progress = createUploadProgressToast(files.length);

    try {
      // Sequential routing — each file goes to Media (image/video) or
      // Documents (PDF/doc/etc) based on MIME. Mixed batches land in both.
      for (const [index, file] of files.entries()) {
        progress.progress(index + 1);
        const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/');
        if (isMedia) {
          const ok = await uploadMediaFile(file, 'gallery');
          if (ok) mediaCount++;
          else failCount++;
        } else {
          const { error } = await uploadProjectDocument({ projectId, file });
          if (error) {
            toast.error(`Failed: ${file.name}`, { description: error.message });
            failCount++;
          } else {
            docCount++;
          }
        }
      }

      // Resolve the progress toast in place with the aggregate result.
      if (files.length > 1) {
        const parts: string[] = [];
        if (mediaCount) parts.push(`${mediaCount} to Media`);
        if (docCount) parts.push(`${docCount} to Documents`);
        if (parts.length) {
          progress.success(`Uploaded ${parts.join(' · ')}`);
          if (failCount) {
            toast.warning(`${failCount} file${failCount > 1 ? 's' : ''} failed`);
          }
        } else {
          progress.error(`${failCount} file${failCount > 1 ? 's' : ''} failed`);
        }
      } else if (docCount) {
        progress.success('Added to Documents');
      } else if (mediaCount) {
        progress.success('Added to Media');
      } else {
        // Single file failed — the per-file error toast already told the story.
        progress.dismiss();
      }

      invalidateMediaAndDocs();
      onNoteCreated?.();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg pb-safe">
        <div className="flex items-center justify-center gap-3 px-4 py-2.5">
          <Button
            variant="outline"
            onClick={() => setNoteSheetOpen(true)}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <StickyNote className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Note</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleCameraClick}
            disabled={isUploading}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-primary" />
            )}
            <span className="text-sm font-medium">Camera</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleAttachClick}
            disabled={isUploading}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5 text-primary" />
            )}
            <span className="text-sm font-medium">Attach</span>
          </Button>

          {/* Camera — accept image only. On mobile this opens the native
             picker (camera + library). iOS/Android show a "Take Photo" option
             alongside "Photo Library". */}
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            onChange={handleCameraFile}
            accept="image/*"
          />
          {/* Attach — any file(s). Images/videos route to Media; everything
             else routes to Documents. Multi-select supported. */}
          <input
            ref={attachInputRef}
            type="file"
            className="hidden"
            onChange={handleAttachFile}
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </div>
      </div>

      <NoteComposer
        projectId={projectId}
        presentation="sheet"
        open={noteSheetOpen}
        onOpenChange={setNoteSheetOpen}
        onSubmitted={() => onNoteCreated?.()}
        placeholder="What's happening on site... @ to tag"
      />
    </>
  );
}
