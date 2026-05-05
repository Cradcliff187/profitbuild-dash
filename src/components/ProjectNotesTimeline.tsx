import { useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { StickyNote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { useIsMobile } from '@/hooks/use-mobile';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteComposer } from '@/components/notes/NoteComposer';
import { NoteLightbox } from '@/components/notes/NoteLightbox';
import { ProjectNote } from '@/types/projectNote';

interface ProjectNotesTimelineProps {
  projectId: string;
  inSheet?: boolean;
  /**
   * When true, suppresses the built-in composer — timeline only.
   * Used by callers (e.g. FieldSchedule) where the note-entry affordance
   * lives in a separate surface like FieldQuickActionBar.
   */
  hideComposer?: boolean;
}

export function ProjectNotesTimeline({ projectId, inSheet = false, hideComposer = false }: ProjectNotesTimelineProps) {
  const { notes, isLoading, updateNote, deleteNote } = useProjectNotes(projectId);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedVideo, setEnlargedVideo] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; name: string } | null>(null);

  const isMobile = useIsMobile();

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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

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
          <Card className="p-8 text-center">
            <StickyNote className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Notes captured for this project will appear here
            </p>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  let mainContent;

  if (inSheet) {
    mainContent = (
      <div className="flex flex-col h-full">
        {!hideComposer && (
          <div className="border rounded-lg mb-3 shrink-0 bg-muted/20">
            <NoteComposer
              projectId={projectId}
              placeholder="Type note... @ to tag"
            />
          </div>
        )}
        {renderNotesList('default')}
      </div>
    );
  } else if (isMobile) {
    // Inline mobile: display-only list. The add-note affordance lives in the
    // global FieldQuickActionBar rendered once by ProjectDetailView.
    mainContent = (
      <div className="border rounded-lg overflow-hidden">
        {renderNotesList('compact')}
      </div>
    );
  } else {
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
          <div className="h-full bg-muted/20">
            <NoteComposer
              projectId={projectId}
              placeholder="Type note... @ to tag"
            />
          </div>
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
