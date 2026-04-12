import { useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteInput } from '@/components/notes/NoteInput';
import { NoteLightbox } from '@/components/notes/NoteLightbox';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { ProjectNote } from '@/types/projectNote';

interface ProjectNotesTimelineProps {
  projectId: string;
  inSheet?: boolean;
}

export function ProjectNotesTimeline({ projectId, inSheet = false }: ProjectNotesTimelineProps) {
  // Data layer
  const { notes, isLoading, addNote, isAdding, updateNote, deleteNote, uploadAttachment } = useProjectNotes(projectId);

  // UI state
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'file' | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedVideo, setEnlargedVideo] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; name: string } | null>(null);

  const isMobile = useIsMobile();
  const { capturePhoto, isCapturing: isCapturingPhoto } = useCameraCapture();
  const { startRecording, isRecording } = useVideoCapture();

  // --- Handlers ---

  const handleCapturePhoto = async () => {
    const result = await capturePhoto();
    if (result?.dataUrl) {
      setAttachmentPreview(result.dataUrl);
      setAttachmentType('image');
    }
  };

  const handleCaptureVideo = async () => {
    const result = await startRecording();
    if (result?.dataUrl) {
      setAttachmentPreview(result.dataUrl);
      setAttachmentType('video');
    }
  };

  const handleClearAttachment = () => {
    setAttachmentPreview(null);
    setAttachmentType(null);
    setAttachmentFileName(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(reader.result as string);
      setAttachmentFileName(file.name);

      if (file.type.startsWith('image/')) {
        setAttachmentType('image');
      } else if (file.type.startsWith('video/')) {
        setAttachmentType('video');
      } else {
        setAttachmentType('file');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNote = async () => {
    const trimmedText = noteText.trim();
    if (!trimmedText && !attachmentPreview) return;

    let attachmentUrl: string | undefined;
    if (attachmentPreview && attachmentType) {
      setIsUploading(true);
      const url = await uploadAttachment(attachmentPreview, attachmentType, attachmentFileName || undefined);
      setIsUploading(false);
      if (url) attachmentUrl = url;
    }

    addNote({
      text: trimmedText,
      attachmentUrl,
      attachmentType: attachmentType || undefined,
      attachmentName: attachmentFileName || undefined,
    });

    setNoteText('');
    setAttachmentPreview(null);
    setAttachmentType(null);
    setAttachmentFileName(null);
  };

  const handleStartEdit = (note: ProjectNote) => {
    setEditingNoteId(note.id);
    setEditText(note.note_text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const handleSaveEdit = () => {
    if (!editingNoteId || !editText.trim()) return;
    updateNote({ id: editingNoteId, text: editText.trim() });
    setEditingNoteId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this note? This cannot be undone.')) {
      deleteNote(id);
    }
  };

  const handlePreviewAttachment = (attachmentUrl: string, attachmentName: string | null | undefined) => {
    setPdfUrl(attachmentUrl);
    setSelectedAttachment({ url: attachmentUrl, name: attachmentName || 'attachment.pdf' });
    setPdfPreviewOpen(true);
  };

  // --- Timestamp formatting ---

  const formatTimestamp = (utcTimestamp: string | null | undefined) => {
    if (!utcTimestamp) return 'No date';
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    const estTime = toZonedTime(date, 'America/New_York');
    return format(estTime, "MMM d, yyyy h:mm a 'EST'");
  };

  const formatTimestampCompact = (utcTimestamp: string | null | undefined) => {
    if (!utcTimestamp) return 'No date';
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    const estTime = toZonedTime(date, 'America/New_York');
    return format(estTime, 'MMM d, h:mm a');
  };

  // --- Shared props for NoteInput ---

  const noteInputProps = {
    noteText,
    onNoteTextChange: setNoteText,
    onSubmit: handleAddNote,
    isSubmitting: isAdding,
    isUploading,
    attachmentPreview,
    attachmentType,
    attachmentFileName,
    onClearAttachment: handleClearAttachment,
    onCapturePhoto: handleCapturePhoto,
    onCaptureVideo: handleCaptureVideo,
    onFileSelect: handleFileSelect,
    isCapturingPhoto,
    isRecording,
    voiceNoteSlot: (
      <VoiceNoteButton
        variant="icon"
        onTranscription={(text) => setNoteText((prev) => (prev ? `${prev}\n${text}` : text))}
      />
    ),
  };

  // --- Shared props for NoteCard ---

  const noteCardSharedProps = {
    editingNoteId,
    editText,
    onEditTextChange: setEditText,
    onStartEdit: handleStartEdit,
    onSaveEdit: handleSaveEdit,
    onCancelEdit: handleCancelEdit,
    onDelete: handleDelete,
    onEnlargeImage: setEnlargedImage,
    onEnlargeVideo: setEnlargedVideo,
    onPreviewPdf: handlePreviewAttachment,
  };

  // --- Loading state ---

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

  // --- Render: Notes list ---

  const renderNotesList = (variant: 'default' | 'compact', maxHeight?: string) => (
    <ScrollArea className={maxHeight ? `flex-1 ${maxHeight}` : 'flex-1'}>
      <div className={`${variant === 'compact' ? 'p-1 space-y-1' : 'p-2 space-y-2'}`}>
        {notes.length > 0 ? (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              variant={variant}
              formatTimestamp={variant === 'compact' ? formatTimestampCompact : formatTimestamp}
              {...noteCardSharedProps}
            />
          ))
        ) : (
          <p className={`text-center py-8 ${variant === 'compact' ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
            No notes yet
          </p>
        )}
      </div>
    </ScrollArea>
  );

  // --- Layout modes ---

  let mainContent;

  if (inSheet) {
    // Sheet modal (mobile full-screen bottom drawer)
    mainContent = (
      <div className="flex flex-col h-full">
        <div className="p-3 bg-muted/20 border rounded-lg mb-3 shrink-0">
          <NoteInput variant="default" fileInputId="file-upload-sheet" {...noteInputProps} />
        </div>
        {renderNotesList('default')}
      </div>
    );
  } else if (isMobile) {
    // Inline mobile (compact)
    mainContent = (
      <div className="border rounded-lg overflow-hidden">
        <NoteInput variant="compact" fileInputId="file-upload-mobile" {...noteInputProps} />
        {renderNotesList('compact')}
      </div>
    );
  } else {
    // Desktop: ResizablePanel with side-by-side layout
    mainContent = (
      <ResizablePanelGroup direction="horizontal" className="min-h-[300px] rounded-lg border">
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col">
            <div className="p-2 border-b bg-muted/30">
              <h4 className="text-xs font-semibold">Recent Notes</h4>
            </div>
            {renderNotesList('default', 'max-h-[280px]')}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={30}>
          <NoteInput variant="default" fileInputId="file-upload-desktop" {...noteInputProps} />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <>
      {mainContent}
      <NoteLightbox
        enlargedImage={enlargedImage}
        enlargedVideo={enlargedVideo}
        onCloseImage={() => setEnlargedImage(null)}
        onCloseVideo={() => setEnlargedVideo(null)}
        pdfPreviewOpen={pdfPreviewOpen}
        onPdfPreviewChange={setPdfPreviewOpen}
        pdfUrl={pdfUrl}
        pdfFileName={selectedAttachment?.name || 'attachment.pdf'}
      />
    </>
  );
}
