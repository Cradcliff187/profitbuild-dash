import { useRef, useState, type ChangeEvent } from 'react';
import { StickyNote, Camera, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteComposer } from '@/components/notes/NoteComposer';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { toast } from 'sonner';

interface FieldQuickActionBarProps {
  projectId: string;
  onNoteCreated?: () => void;
}

/**
 * Three-button quick-action row: Note · Camera · Attach.
 *
 * The Note button opens a shared NoteComposer in sheet presentation — full
 * text + mentions + voice + attach flow with Take Photo / Record Video /
 * Upload File labeled options inside. Camera and Attach stay as independent
 * quick-capture affordances for the "snap and forget" flow (no composition).
 *
 * Sticky-bottom-positioned by default. When used inline inside a card, callers
 * override with `[&>div:first-child]:!static` utilities.
 */
export function FieldQuickActionBar({ projectId, onNoteCreated }: FieldQuickActionBarProps) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addNote, uploadAttachment } = useProjectNotes(projectId);
  const { capturePhoto, isCapturing } = useCameraCapture();

  const handleQuickPhoto = async () => {
    const result = await capturePhoto();
    if (!result?.dataUrl) return;

    toast.info('Uploading photo...');
    const url = await uploadAttachment(result.dataUrl, 'image');
    if (url) {
      addNote({
        text: '',
        attachmentUrl: url,
        attachmentType: 'image',
      });
      onNoteCreated?.();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const attachmentType: 'image' | 'video' | 'file' = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'file';

    setIsUploading(true);
    toast.info('Uploading attachment...');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const url = await uploadAttachment(dataUrl, attachmentType, file.name);
      if (url) {
        addNote({
          text: '',
          attachmentUrl: url,
          attachmentType,
        });
        onNoteCreated?.();
      }
    } catch (err) {
      console.error('Attachment upload failed', err);
      toast.error('Failed to upload attachment');
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
            onClick={handleQuickPhoto}
            disabled={isCapturing}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Camera</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleAttachClick}
            disabled={isUploading}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Paperclip className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Attach</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
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
