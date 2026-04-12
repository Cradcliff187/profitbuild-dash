import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Video, Paperclip, PlusCircle, X, FileText } from 'lucide-react';
import { MentionTextarea } from '@/components/notes/MentionTextarea';
import type { MentionableUser } from '@/types/notification';

export type NoteInputVariant = 'default' | 'compact';

interface NoteInputProps {
  variant?: NoteInputVariant;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isUploading: boolean;
  // Attachment state
  attachmentPreview: string | null;
  attachmentType: 'image' | 'video' | 'file' | null;
  attachmentFileName: string | null;
  onClearAttachment: () => void;
  // Capture actions
  onCapturePhoto: () => void;
  onCaptureVideo: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCapturingPhoto: boolean;
  isRecording: boolean;
  // File input ID must be unique per instance
  fileInputId?: string;
  // Extension point for voice notes
  voiceNoteSlot?: ReactNode;
  // @mention support
  mentionableUsers?: MentionableUser[];
}

const styles = {
  default: {
    textarea: 'text-xs mb-2 resize-none flex-1',
    rows: 4,
    buttonClass: 'flex-1',
    buttonIconSize: 'w-3 h-3 mr-1',
    submitClass: 'w-full',
    submitIconSize: 'w-3 h-3 mr-1',
    previewHeight: 'h-24',
    clearButton: 'h-5 w-5 p-0',
    clearIcon: 'h-3 w-3',
    label: 'text-xs font-semibold mb-2',
    showLabels: true,
  },
  compact: {
    textarea: 'text-xs flex-1 min-h-0 resize-none',
    rows: 2,
    buttonClass: 'px-1 h-6',
    buttonIconSize: 'w-2.5 h-2.5',
    submitClass: 'px-1 h-6',
    submitIconSize: 'w-2.5 h-2.5',
    previewHeight: 'h-20',
    clearButton: 'h-4 w-4 p-0',
    clearIcon: 'h-2 w-2',
    label: 'text-[10px] font-semibold mb-1',
    showLabels: false,
  },
};

export function NoteInput({
  variant = 'default',
  noteText,
  onNoteTextChange,
  onSubmit,
  isSubmitting,
  isUploading,
  attachmentPreview,
  attachmentType,
  attachmentFileName,
  onClearAttachment,
  onCapturePhoto,
  onCaptureVideo,
  onFileSelect,
  isCapturingPhoto,
  isRecording,
  fileInputId = 'file-upload-notes',
  voiceNoteSlot,
  mentionableUsers,
}: NoteInputProps) {
  const s = styles[variant];
  const isCompact = variant === 'compact';

  return (
    <div className={isCompact ? 'p-2 bg-muted/20 border-b' : 'h-full flex flex-col p-2 bg-muted/20'}>
      {s.showLabels && <h4 className={s.label}>Add Note</h4>}

      {/* Attachment preview */}
      {attachmentPreview && (
        <div className={`${isCompact ? 'mb-1' : 'mb-2'} relative`}>
          {attachmentType === 'image' ? (
            <img src={attachmentPreview} alt="Preview" className={`w-full ${s.previewHeight} object-cover rounded`} />
          ) : attachmentType === 'video' ? (
            <video src={attachmentPreview} className={`w-full ${s.previewHeight} object-cover rounded`} controls />
          ) : (
            <div className="flex items-center gap-2 p-2 bg-muted rounded border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs truncate">{attachmentFileName}</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            className={`absolute top-1 right-1 ${s.clearButton}`}
            onClick={onClearAttachment}
          >
            <X className={s.clearIcon} />
          </Button>
        </div>
      )}

      {isCompact ? (
        /* Compact: horizontal layout with textarea + vertical button stack */
        <div className="flex gap-1">
          {mentionableUsers ? (
            <MentionTextarea
              value={noteText}
              onChange={onNoteTextChange}
              placeholder="Add note... @ to tag"
              rows={s.rows}
              className={s.textarea}
              mentionableUsers={mentionableUsers}
            />
          ) : (
            <Textarea
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              placeholder="Add note..."
              rows={s.rows}
              className={s.textarea}
            />
          )}
          <div className="flex flex-col gap-0.5">
            <Button onClick={onCapturePhoto} disabled={isCapturingPhoto || isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Camera className={s.buttonIconSize} />
            </Button>
            <Button onClick={onCaptureVideo} disabled={isRecording || isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Video className={s.buttonIconSize} />
            </Button>
            <Button onClick={() => document.getElementById(fileInputId)?.click()} disabled={isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Paperclip className={s.buttonIconSize} />
            </Button>
            {voiceNoteSlot}
            <Button onClick={onSubmit} disabled={isSubmitting || !noteText.trim() || isUploading} size="sm" className={s.submitClass}>
              <PlusCircle className={s.submitIconSize} />
            </Button>
          </div>
          <input
            id={fileInputId}
            type="file"
            className="hidden"
            onChange={onFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </div>
      ) : (
        /* Default: vertical layout */
        <>
          {mentionableUsers ? (
            <MentionTextarea
              value={noteText}
              onChange={onNoteTextChange}
              placeholder="Type note... @ to tag"
              rows={s.rows}
              className={s.textarea}
              mentionableUsers={mentionableUsers}
            />
          ) : (
            <Textarea
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              placeholder="Type note..."
              rows={s.rows}
              className={s.textarea}
            />
          )}

          <div className="flex gap-1 mb-2">
            <Button onClick={onCapturePhoto} disabled={isCapturingPhoto || isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Camera className={s.buttonIconSize} />
              Photo
            </Button>
            <Button onClick={onCaptureVideo} disabled={isRecording || isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Video className={s.buttonIconSize} />
              Video
            </Button>
            <Button onClick={() => document.getElementById(fileInputId)?.click()} disabled={isUploading} size="sm" variant="outline" className={s.buttonClass}>
              <Paperclip className={s.buttonIconSize} />
              File
            </Button>
            {voiceNoteSlot}
            <input
              id={fileInputId}
              type="file"
              className="hidden"
              onChange={onFileSelect}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !noteText.trim() || isUploading}
            size="sm"
            className="w-full"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            {isUploading ? 'Uploading...' : isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </>
      )}
    </div>
  );
}
