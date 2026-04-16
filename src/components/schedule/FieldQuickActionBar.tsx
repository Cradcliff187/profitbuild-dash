import { useRef, useState, type ChangeEvent } from 'react';
import { StickyNote, Camera, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { useMentionableUsers } from '@/hooks/useMentionableUsers';
import { MentionTextarea } from '@/components/notes/MentionTextarea';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { resolveMentions } from '@/utils/mentionUtils';
import { toast } from 'sonner';

interface FieldQuickActionBarProps {
  projectId: string;
  onNoteCreated?: () => void;
}

/**
 * Three-button quick-action row for notes: Note · Camera · Attach.
 *
 * Industry-standard pattern (Slack, WhatsApp, Linear): primary text action,
 * dedicated in-the-moment camera capture, general-purpose attachment via
 * native picker. Voice transcription folds INTO the Note sheet (mic icon
 * beside the textarea) since the output of voice IS a note — keeping Voice
 * as a top-level button would be non-standard.
 *
 * Sticky-bottom-positioned by default (right for the field schedule). When
 * used inline inside a card (e.g., Project Notes on the Overview), callers
 * override with `[&>div:first-child]:!static` style utilities.
 */
export function FieldQuickActionBar({ projectId, onNoteCreated }: FieldQuickActionBarProps) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addNote, uploadAttachment } = useProjectNotes(projectId);
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { data: mentionableUsers } = useMentionableUsers();

  // --- Handlers ---

  const handleQuickNote = async () => {
    const text = quickNoteText.trim();
    if (!text) return;

    setIsSaving(true);
    const { formattedText, mentionedUserIds } = mentionableUsers
      ? resolveMentions(text, mentionableUsers)
      : { formattedText: text, mentionedUserIds: [] };

    addNote({
      text: formattedText,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
    });
    setQuickNoteText('');
    setNoteSheetOpen(false);
    setIsSaving(false);
    onNoteCreated?.();
  };

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

  /**
   * Appends transcribed voice text to whatever's already in the Note composer.
   * Lets PMs dictate additions to a partially-typed note instead of replacing it.
   */
  const handleVoiceTranscription = (text: string) => {
    if (!text.trim()) return;
    setQuickNoteText(prev => (prev ? `${prev.trimEnd()} ${text.trim()}` : text.trim()));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so the same file can be picked again in a future attempt.
    e.target.value = '';
    if (!file) return;

    // Infer attachment type from MIME — `uploadAttachment` needs this to pick
    // the right storage path + public-URL shape.
    const attachmentType: 'image' | 'video' | 'file' = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'file';

    setIsUploading(true);
    toast.info('Uploading attachment...');
    try {
      // uploadAttachment expects a data URL (it fetches → blob internally).
      // Read the file once, hand off the base64 payload.
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
      {/* Sticky bottom bar (overridable to inline via CSS from the caller). */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg pb-safe">
        <div className="flex items-center justify-center gap-3 px-4 py-2.5">
          {/* Note */}
          <Button
            variant="outline"
            onClick={() => setNoteSheetOpen(true)}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <StickyNote className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Note</span>
          </Button>

          {/* Camera (Capacitor — fast in-the-moment capture) */}
          <Button
            variant="outline"
            onClick={handleQuickPhoto}
            disabled={isCapturing}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Camera</span>
          </Button>

          {/* Attach — native picker handles existing photos, videos, files, PDFs */}
          <Button
            variant="outline"
            onClick={handleAttachClick}
            disabled={isUploading}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Paperclip className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Attach</span>
          </Button>

          {/* Hidden input driven by Attach button above. accept matches the old
             NoteInput.tsx list — covers the most common document/media types. */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </div>
      </div>

      {/* Quick note bottom sheet — text composer with inline voice mic. */}
      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-4 pt-2 pb-3 border-b">
            <SheetTitle className="text-left">Quick Note</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="relative">
              <MentionTextarea
                value={quickNoteText}
                onChange={setQuickNoteText}
                placeholder="What's happening on site... @ to tag"
                rows={3}
                className="text-base resize-none pr-12"
                mentionableUsers={mentionableUsers || []}
              />
              {/* Mic lives inside the composer — industry-standard placement
                 (Slack, iMessage, WhatsApp all put voice here, not as a peer
                 action). Appends transcribed text to whatever's already typed. */}
              <div className="absolute right-2 top-2">
                <VoiceNoteButton
                  variant="icon"
                  onTranscription={handleVoiceTranscription}
                />
              </div>
            </div>
            <Button
              onClick={handleQuickNote}
              disabled={!quickNoteText.trim() || isSaving}
              className="w-full h-12 text-base rounded-xl"
            >
              {isSaving ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
