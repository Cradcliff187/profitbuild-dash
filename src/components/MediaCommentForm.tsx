import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaCommentFormProps {
  mediaId: string;
}

export function MediaCommentForm({ mediaId }: MediaCommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const transcriptionInitiatedRef = useRef(false);

  const {
    startRecording,
    stopRecording,
    audioData,
    audioFormat,
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

  // Auto-transcribe when audio data is ready (prevent duplicate calls)
  useEffect(() => {
    if (audioData && !manualMode && !transcriptionInitiatedRef.current) {
      transcriptionInitiatedRef.current = true;
      handleTranscribe();
    }
  }, [audioData, manualMode]);

  // Reset transcription flag when audio is cleared
  useEffect(() => {
    if (!audioData) {
      transcriptionInitiatedRef.current = false;
    }
  }, [audioData]);

  // Update textarea with transcription
  useEffect(() => {
    if (transcription) {
      setCommentText(transcription);
    }
  }, [transcription]);

  const handleTranscribe = async () => {
    if (!audioData) return;
    await transcribe(audioData, audioFormat);
  };

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to comment');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('media_comments')
      .insert({
        media_id: mediaId,
        user_id: user.id,
        comment_text: commentText.trim()
      });

    if (error) {
      toast.error('Failed to add comment');
      setIsSubmitting(false);
      return;
    }

    toast.success('Comment added');
    setCommentText('');
    resetRecording();
    resetTranscription();
    setManualMode(false);
    setIsSubmitting(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleManual = () => {
    setManualMode(!manualMode);
    if (!manualMode) {
      resetRecording();
      resetTranscription();
    }
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-start gap-2">
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={manualMode ? "Type your comment..." : "Click mic to record or type manually"}
          className="min-h-[60px] text-sm resize-none"
          disabled={isRecording || isTranscribing}
        />
        
        <div className="flex flex-col gap-1">
          {!isRecording ? (
            <Button
              size="sm"
              variant="outline"
              onClick={startRecording}
              disabled={isProcessing || isTranscribing || manualMode}
              className="h-8 w-8 p-0"
            >
              <Mic className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="h-8 w-8 p-0"
            >
              <Square className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
          Recording: {formatDuration(duration)}
        </div>
      )}

      {/* Transcribing Status */}
      {isTranscribing && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Transcribing audio...
        </div>
      )}

      {/* Errors */}
      {(recordingError || transcriptionError) && (
        <div className="text-xs text-destructive">
          {recordingError || transcriptionError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleToggleManual}
          className="text-xs h-7"
          disabled={isRecording || isTranscribing}
        >
          {manualMode ? 'Enable Voice' : 'Type Only'}
        </Button>
        
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!commentText.trim() || isSubmitting || isRecording || isTranscribing}
          className="h-7"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Comment'
          )}
        </Button>
      </div>
    </div>
  );
}
