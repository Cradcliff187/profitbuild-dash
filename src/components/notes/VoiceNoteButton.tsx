import { useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';

interface VoiceNoteButtonProps {
  /** Called with the transcribed text */
  onTranscription: (text: string) => void;
  disabled?: boolean;
  /** 'icon' = small icon button for inline use, 'full' = full-width with status indicators */
  variant?: 'icon' | 'full';
}

export function VoiceNoteButton({
  onTranscription,
  disabled = false,
  variant = 'icon',
}: VoiceNoteButtonProps) {
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
    reset: resetRecording,
  } = useAudioRecording();

  const {
    transcribe,
    isTranscribing,
    transcription,
    error: transcriptionError,
    reset: resetTranscription,
  } = useAudioTranscription();

  // Auto-transcribe when audio data is ready
  useEffect(() => {
    if (audioData && !isTranscribing) {
      transcribe(audioData, audioFormat);
    }
  }, [audioData, audioFormat, isTranscribing, transcribe]);

  // Deliver transcription to parent
  useEffect(() => {
    if (transcription) {
      onTranscription(transcription);
      resetTranscription();
      resetRecording();
    }
  }, [transcription, onTranscription, resetTranscription, resetRecording]);

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isBusy = isProcessing || isTranscribing;

  // Icon-only variant: small button for inline use (e.g., in NoteInput button row)
  if (variant === 'icon') {
    return (
      <Button
        onClick={handleToggle}
        disabled={disabled || isBusy}
        size="sm"
        variant={isRecording ? 'destructive' : 'outline'}
        className="relative"
        type="button"
      >
        {isBusy ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-3 h-3" />
        ) : (
          <Mic className="w-3 h-3" />
        )}
        {isRecording && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  // Full variant: button with recording status, level meter, errors
  return (
    <div className="space-y-2">
      {recordingError && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-1">
            <p className="text-xs font-medium">{recordingError}</p>
            <p className="text-[10px]">
              Tap the lock icon in your browser's address bar, allow microphone, then reload.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {transcriptionError && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{transcriptionError}</AlertDescription>
        </Alert>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">{Math.floor(duration / 1000)}s</span>
          </div>
          {audioLevel > 0 && (
            <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-100 rounded-full"
                style={{ width: `${Math.min(audioLevel, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Processing audio...</span>
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Transcribing...</span>
        </div>
      )}

      <Button
        onClick={handleToggle}
        disabled={disabled || isBusy}
        variant={isRecording ? 'destructive' : 'outline'}
        className="w-full h-12 rounded-xl gap-2 text-base"
        type="button"
      >
        {isBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <>
            <MicOff className="h-5 w-5" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            Record Voice Note
          </>
        )}
      </Button>
    </div>
  );
}
