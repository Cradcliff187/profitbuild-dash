import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Mic, MicOff, Send, Loader2, Trash2, User } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useBidNotes } from '@/hooks/useBidNotes';

interface BidNotesTimelineProps {
  bidId: string;
}

export function BidNotesTimeline({ bidId }: BidNotesTimelineProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const { notes, isLoading } = useBidNotes(bidId);

  const {
    startRecording,
    stopRecording,
    audioData,
    audioFormat,
    audioLevel,
    duration,
    isRecording,
    isProcessing,
    error: recordingError,
    reset: resetRecording
  } = useAudioRecording();

  const {
    transcribe,
    isTranscribing,
    transcription,
    error: transcriptionError,
    reset: resetTranscription
  } = useAudioTranscription();

  // Auto-transcribe when audio data is ready
  useEffect(() => {
    if (audioData && !isTranscribing) {
      transcribe(audioData, audioFormat);
    }
  }, [audioData, audioFormat, isTranscribing, transcribe]);

  // Update textarea with transcription
  useEffect(() => {
    if (transcription) {
      setNoteText(prev => prev ? `${prev}\n${transcription}` : transcription);
      resetTranscription();
      resetRecording();
    }
  }, [transcription, resetTranscription, resetRecording]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const estTime = toZonedTime(date, 'America/New_York');
    return format(estTime, "MMM d, yyyy h:mm a 'EST'");
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bid_notes')
        .insert({
          bid_id: bidId,
          user_id: user.id,
          note_text: text,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-notes', bidId] });
      setNoteText('');
      toast.success('Note added');
    },
    onError: (error: Error) => {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bid_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-notes', bidId] });
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });

  const handleAddNote = () => {
    const trimmedText = noteText.trim();
    if (!trimmedText) {
      toast.error('Note cannot be empty');
      return;
    }
    addNoteMutation.mutate(trimmedText);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      resetRecording();
      resetTranscription();
      await startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddNote();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note... (Ctrl+Enter to send)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          disabled={isRecording || isProcessing || isTranscribing}
        />

        {recordingError && (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <p className="font-medium">{recordingError}</p>
              <p className="text-xs">
                Click the 🔒 lock icon in your browser's address bar, allow microphone access, then reload the page.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {transcriptionError && (
          <Alert variant="destructive">
            <AlertDescription>{transcriptionError}</AlertDescription>
          </Alert>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording: {Math.floor(duration / 1000)}s</span>
            </div>
            {audioLevel > 0 && (
              <div className="flex-1 max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing audio...</span>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={handleRecordToggle}
                  disabled={isProcessing || isTranscribing}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? 'Stop recording' : 'Record voice note (microphone permission required)'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={handleAddNote}
            disabled={!noteText.trim() || addNoteMutation.isPending || isRecording}
            className="flex-1"
          >
            {addNoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes Timeline */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No notes yet. Add your first note above.
            </p>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {note.profiles?.full_name ? getInitials(note.profiles.full_name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {note.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(note.created_at)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

