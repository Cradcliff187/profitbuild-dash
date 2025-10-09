import { useEffect, useState } from 'react';
import { Mic, MicOff, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { toast } from 'sonner';

interface VoiceCaptionModalProps {
  open: boolean;
  onClose: () => void;
  onCaptionReady: (caption: string) => void;
}

export function VoiceCaptionModal({ open, onClose, onCaptionReady }: VoiceCaptionModalProps) {
  const {
    startRecording,
    stopRecording,
    isRecording,
    isProcessing,
    audioData,
    audioFormat,
    duration,
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

  const [editableCaption, setEditableCaption] = useState('');
  const [hasTranscribed, setHasTranscribed] = useState(false);

  // Auto-transcribe when audio is ready
  useEffect(() => {
    if (audioData && audioFormat && !hasTranscribed) {
      setHasTranscribed(true);
      transcribe(audioData, audioFormat).then((text) => {
        if (text) {
          setEditableCaption(text);
        }
      });
    }
  }, [audioData, audioFormat, transcribe, hasTranscribed]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      resetRecording();
      resetTranscription();
      setEditableCaption('');
      setHasTranscribed(false);
    }
  }, [open, resetRecording, resetTranscription]);

  // Show error toasts
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  useEffect(() => {
    if (transcriptionError) {
      toast.error(transcriptionError);
    }
  }, [transcriptionError]);

  const handleStartRecording = () => {
    resetTranscription();
    setEditableCaption('');
    setHasTranscribed(false);
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleUseCaption = () => {
    if (editableCaption.trim()) {
      onCaptionReady(editableCaption.trim());
      onClose();
    } else {
      toast.error('Caption cannot be empty');
    }
  };

  const handleCancel = () => {
    resetRecording();
    resetTranscription();
    setEditableCaption('');
    setHasTranscribed(false);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessingAudio = isProcessing || isTranscribing;
  const showTranscription = !isRecording && (editableCaption || isProcessingAudio);

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Caption</DialogTitle>
          <DialogDescription>
            Record a voice note to caption your photo (max 2 minutes)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recording Interface */}
          {!showTranscription && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="h-20 w-20 rounded-full"
                disabled={isProcessingAudio}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>

              {isRecording && (
                <div className="text-center space-y-1">
                  <div className="text-2xl font-mono font-bold text-foreground">
                    {formatDuration(duration)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {duration >= 120 ? 'Maximum duration reached' : 'Tap to stop recording'}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-xs text-destructive font-medium">Recording</span>
                  </div>
                </div>
              )}

              {!isRecording && (
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Tap the microphone to start recording your caption
                </p>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessingAudio && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isProcessing ? 'Processing audio...' : 'Transcribing...'}
              </p>
            </div>
          )}

          {/* Transcription Preview */}
          {showTranscription && !isProcessingAudio && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Caption Preview</label>
                <p className="text-xs text-muted-foreground">Review and edit your caption before applying</p>
              </div>
              <Textarea
                value={editableCaption}
                onChange={(e) => setEditableCaption(e.target.value)}
                placeholder="Your caption will appear here..."
                className="min-h-32 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleStartRecording}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Mic className="h-3 w-3 mr-1" />
                  Re-record
                </Button>
                <Button
                  onClick={handleUseCaption}
                  variant="default"
                  className="flex-1"
                  disabled={!editableCaption.trim()}
                  size="sm"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Use This Caption
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {!isRecording && !isProcessingAudio && (
            <Button onClick={handleCancel} variant="ghost" className="w-full" size="sm">
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
