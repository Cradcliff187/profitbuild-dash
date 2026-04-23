import { useState, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidNoteComposerProps {
  bidId: string;
  presentation: 'inline' | 'sheet';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmitted?: () => void;
  placeholder?: string;
}

// Bid-scoped note composer. Sibling of NoteComposer (which is project-scoped
// and includes @mention + note-attachment flows that bid_notes doesn't model
// yet). Here: textarea + voice-to-text + send. Camera/Attach live on the bar
// — the "compose and send" vs "capture and forget" split from CLAUDE.md Rule 15
// still applies.
export function BidNoteComposer({
  bidId,
  presentation,
  open,
  onOpenChange,
  onSubmitted,
  placeholder = 'Add a note...',
}: BidNoteComposerProps) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('bid_notes').insert({
        bid_id: bidId,
        user_id: user.id,
        note_text: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-notes', bidId] });
      setText('');
      toast.success('Note added');
      onSubmitted?.();
      if (presentation === 'sheet') onOpenChange?.(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to add note', { description: error.message });
    },
  });

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const body = (
    <div className="space-y-3">
      <Textarea
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        autoFocus={presentation === 'sheet'}
      />
      <div className="flex items-center gap-2">
        <VoiceNoteButton
          onTranscription={(transcription) =>
            setText((prev) => (prev ? `${prev}\n${transcription}` : transcription))
          }
          disabled={mutation.isPending}
        />
        <Button
          onClick={submit}
          disabled={!text.trim() || mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Add Note
        </Button>
      </div>
    </div>
  );

  if (presentation === 'inline') return body;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader className="mb-4">
          <SheetTitle>Add Note</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
