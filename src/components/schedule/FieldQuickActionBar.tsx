import { useState } from 'react';
import { StickyNote, Camera, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useProjectNotes } from '@/hooks/useProjectNotes';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { toast } from 'sonner';

interface FieldQuickActionBarProps {
  projectId: string;
  onNoteCreated?: () => void;
}

export function FieldQuickActionBar({ projectId, onNoteCreated }: FieldQuickActionBarProps) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { addNote, uploadAttachment } = useProjectNotes(projectId);
  const { capturePhoto, isCapturing } = useCameraCapture();

  const handleQuickNote = async () => {
    const text = quickNoteText.trim();
    if (!text) return;

    setIsSaving(true);
    addNote({ text });
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

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg pb-safe">
        <div className="flex items-center justify-center gap-3 px-4 py-2.5">
          {/* Quick Note */}
          <Button
            variant="outline"
            onClick={() => setNoteSheetOpen(true)}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <StickyNote className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Note</span>
          </Button>

          {/* Quick Photo */}
          <Button
            variant="outline"
            onClick={handleQuickPhoto}
            disabled={isCapturing}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Photo</span>
          </Button>

          {/* Voice Note */}
          <Button
            variant="outline"
            onClick={() => setVoiceSheetOpen(true)}
            className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
          >
            <Mic className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Voice</span>
          </Button>
        </div>
      </div>

      {/* Quick note bottom sheet */}
      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-4 pt-2 pb-3 border-b">
            <SheetTitle className="text-left">Quick Note</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <Textarea
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              placeholder="What's happening on site..."
              rows={3}
              className="text-base resize-none"
              autoFocus
            />
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

      {/* Voice note bottom sheet */}
      <Sheet open={voiceSheetOpen} onOpenChange={setVoiceSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-4 pt-2 pb-3 border-b">
            <SheetTitle className="text-left">Voice Note</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <VoiceNoteButton
              variant="full"
              onTranscription={(text) => {
                addNote({ text });
                setVoiceSheetOpen(false);
                onNoteCreated?.();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
