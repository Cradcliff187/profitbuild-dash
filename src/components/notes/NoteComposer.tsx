import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, FileText, Paperclip, Send, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MentionTextarea } from '@/components/notes/MentionTextarea';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { useMentionableUsers } from '@/hooks/useMentionableUsers';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { resolveMentions } from '@/utils/mentionUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AttachmentType = 'image' | 'video' | 'file';

interface AttachmentDraft {
  preview: string;
  type: AttachmentType;
  fileName?: string;
}

export interface NoteComposerProps {
  projectId: string;

  /**
   * When set, the submitted note text is prefixed with `**{taskName}:** ` —
   * matching the pattern established in FieldTaskCard so the Notes timeline
   * continues to scan as "which task is this about?".
   */
  taskName?: string;

  /** 'inline' embeds the composer; 'sheet' renders it inside a bottom Sheet. */
  presentation?: 'inline' | 'sheet';

  /** Controlled open state for `presentation='sheet'`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Fired after a successful note submission. */
  onSubmitted?: () => void;

  placeholder?: string;
  enableVoice?: boolean;
  enableAttach?: boolean;
  className?: string;
}

/**
 * Unified note composer — replaces the three parallel implementations that
 * used to live in NoteInput, FieldQuickActionBar's inline sheet, and
 * FieldTaskCard.TaskActions. Owns: text + mentions + voice + attachment +
 * submit. Callers pick a presentation and (optionally) a task context.
 *
 * Attach collapses to a single paperclip button opening a labeled menu
 * (Take Photo / Record Video / Upload File). Each option routes to its
 * dedicated hook or a docs-only file input — combined accept filters
 * regress iOS Safari video-capture reliability.
 */
export function NoteComposer({
  projectId,
  taskName,
  presentation = 'inline',
  open,
  onOpenChange,
  onSubmitted,
  placeholder = 'What happened? @ to tag',
  enableVoice = true,
  enableAttach = true,
  className,
}: NoteComposerProps) {
  const [noteText, setNoteText] = useState('');
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addNote, uploadAttachment } = useProjectNotes(projectId);
  const { data: mentionableUsers } = useMentionableUsers();
  const { capturePhoto, isCapturing: isCapturingPhoto } = useCameraCapture();
  const { startRecording, isRecording: isCapturingVideo } = useVideoCapture();

  const isBusy = isSubmitting || isUploading || isCapturingPhoto || isCapturingVideo;
  const canSubmit = !!(noteText.trim() || attachment) && !isBusy;

  const resetState = () => {
    setNoteText('');
    setAttachment(null);
  };

  const handleTakePhoto = async () => {
    const result = await capturePhoto();
    if (!result?.dataUrl) return;
    setAttachment({ preview: result.dataUrl, type: 'image' });
  };

  const handleRecordVideo = async () => {
    const result = await startRecording();
    if (!result?.dataUrl) return;
    setAttachment({ preview: result.dataUrl, type: 'video' });
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setAttachment({ preview: dataUrl, type: 'file', fileName: file.name });
    } catch (err) {
      console.error('Failed to read file', err);
      toast.error('Failed to read file');
    }
  };

  const handleVoiceTranscription = (text: string) => {
    if (!text.trim()) return;
    setNoteText(prev => (prev ? `${prev.trimEnd()} ${text.trim()}` : text.trim()));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const rawText = noteText.trim();
    const { formattedText, mentionedUserIds } = mentionableUsers && rawText
      ? resolveMentions(rawText, mentionableUsers)
      : { formattedText: rawText, mentionedUserIds: [] };

    // Attachment-only notes get a descriptive fallback text so the Notes
    // timeline row has something readable. Preserves FieldTaskCard's
    // existing "**{taskName}:** Photo" pattern for photos and extends it
    // to video/file.
    const bodyText = formattedText || (attachment
      ? attachment.type === 'image'
        ? 'Photo'
        : attachment.type === 'video'
          ? 'Video'
          : attachment.fileName || 'File'
      : '');

    const finalText = taskName ? `**${taskName}:** ${bodyText}` : bodyText;

    setIsSubmitting(true);
    try {
      let attachmentUrl: string | undefined;
      if (attachment) {
        setIsUploading(true);
        const uploaded = await uploadAttachment(attachment.preview, attachment.type, attachment.fileName);
        setIsUploading(false);
        if (!uploaded) {
          toast.error('Failed to upload attachment');
          return;
        }
        attachmentUrl = uploaded;
      }

      addNote({
        text: finalText,
        attachmentUrl,
        attachmentType: attachment?.type,
        attachmentName: attachment?.fileName,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });

      resetState();
      onSubmitted?.();
      if (presentation === 'sheet') {
        onOpenChange?.(false);
      }
    } catch (err) {
      console.error('Failed to submit note', err);
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const body = (
    <div className={cn('p-4 space-y-3', className)}>
      {attachment && (
        <div className="relative">
          {attachment.type === 'image' ? (
            <img src={attachment.preview} alt="Preview" className="w-full max-h-48 object-cover rounded" />
          ) : attachment.type === 'video' ? (
            <video src={attachment.preview} className="w-full max-h-48 object-cover rounded" controls />
          ) : (
            <div className="flex items-center gap-2 p-2 bg-muted rounded border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs truncate">{attachment.fileName}</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="relative">
        <MentionTextarea
          value={noteText}
          onChange={setNoteText}
          placeholder={placeholder}
          rows={3}
          className={cn('text-base resize-none', enableVoice && 'pr-12')}
          mentionableUsers={mentionableUsers || []}
          disabled={isBusy}
        />
        {enableVoice && (
          <div className="absolute right-2 top-2">
            <VoiceNoteButton
              variant="icon"
              onTranscription={handleVoiceTranscription}
              disabled={isBusy}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enableAttach && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  className="gap-1.5"
                  aria-label="Attach"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              {/* z-[60] keeps the menu above the bottom Sheet overlay (z-50)
                 when presentation='sheet'. Inline usage is unaffected. */}
              <DropdownMenuContent align="start" side="top" className="z-[60]">
                <DropdownMenuItem onClick={handleTakePhoto} disabled={isCapturingPhoto}>
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRecordVideo} disabled={isCapturingVideo}>
                  <Video className="h-4 w-4 mr-2" />
                  Record Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUploadFile}>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit} size="sm" className="gap-1.5">
          <Send className="h-4 w-4" />
          {isUploading ? 'Uploading...' : isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {/* Docs-only input. Photos + videos each get their own dedicated hook
          with a focused `accept` filter (see Take Photo / Record Video above). */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileChange}
      />
    </div>
  );

  if (presentation === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-4 pt-2 pb-3 border-b">
            <SheetTitle className="text-left">
              {taskName ? `Note: ${taskName}` : 'Quick Note'}
            </SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return body;
}
