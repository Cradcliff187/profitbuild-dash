import { useEffect, useState } from 'react';
import { Mic, MicOff, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';
import { checkAudioRecordingSupport } from '@/utils/browserCompatibility';
import { toast } from 'sonner';

interface VoiceCaptionModalProps {
  open: boolean;
  onClose: () => void;
  onCaptionReady: (caption: string) => void;
  imageUrl?: string;
}

export function VoiceCaptionModal({ open, onClose, onCaptionReady, imageUrl }: VoiceCaptionModalProps) {
  const [browserSupport] = useState(() => checkAudioRecordingSupport());
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
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);

  // Show browser compatibility warning on modal open
  useEffect(() => {
    if (open && !browserSupport.supported) {
      toast.error('Voice recording not available', {
        description: browserSupport.issues.join(', '),
        duration: 6000,
      });
    }
  }, [open, browserSupport]);

  // Auto-transcribe when audio is ready (with timeout protection)
  useEffect(() => {
    if (audioData && audioFormat && !hasTranscribed) {
      setHasTranscribed(true);
      
      // Set up 30-second timeout
      const timeoutId = setTimeout(() => {
        toast.error('Transcription timeout', {
          description: 'Taking too long. Please try recording again.',
        });
      }, 30000);
      
      transcribe(audioData, audioFormat)
        .then((text) => {
          clearTimeout(timeoutId);
          if (text) {
            setEditableCaption(text);
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('Transcription failed:', error);
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
      setShowAIEnhancer(false);
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
      toast.error('Transcription failed', {
        description: transcriptionError,
        action: {
          label: 'Try Again',
          onClick: () => {
            setHasTranscribed(false);
            handleStartRecording();
          },
        },
        duration: 8000,
      });
    }
  }, [transcriptionError]);

  const handleStartRecording = async () => {
    resetTranscription();
    setEditableCaption('');
    setHasTranscribed(false);
    
    // Show immediate feedback
    toast.info('Requesting microphone access...', { duration: 2000 });
    
    await startRecording();
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
              {/* Show error alert if there's a recording error */}
              {recordingError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Microphone Error:</strong> {recordingError}
                    {recordingError.includes('denied') && (
                      <>
                        <br /><br />
                        <strong>To fix:</strong>
                        <ol className="list-decimal ml-4 mt-2 space-y-1">
                          <li>Open browser settings (usually via address bar icon)</li>
                          <li>Find "Site Settings" or "Permissions"</li>
                          <li>Enable microphone for this site</li>
                          <li>Reload the page and try again</li>
                        </ol>
                      </>
                    )}
                    {recordingError.includes('HTTPS') && (
                      <>
                        <br /><br />
                        <strong>Solution:</strong> Microphone access requires a secure HTTPS connection.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="h-20 w-20 rounded-full"
                disabled={isProcessingAudio || !browserSupport.supported}
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
            <>
              {!showAIEnhancer ? (
                <div className="space-y-3">
                  {transcriptionError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Transcription failed:</strong> {transcriptionError}
                        <br />
                        <Button
                          onClick={() => {
                            setHasTranscribed(false);
                            handleStartRecording();
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          Try Recording Again
                        </Button>
                        <Button
                          onClick={() => setEditableCaption('')}
                          variant="outline"
                          size="sm"
                          className="mt-2 ml-2"
                        >
                          Type Instead
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Caption Preview</label>
                    <p className="text-xs text-muted-foreground">
                      {editableCaption ? 'Review and edit your caption before applying' : 'Type your caption manually'}
                    </p>
                  </div>
                  <Textarea
                    value={editableCaption}
                    onChange={(e) => setEditableCaption(e.target.value)}
                    placeholder="Your caption will appear here... or type manually"
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
                      onClick={() => setShowAIEnhancer(true)}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      disabled={!editableCaption.trim()}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Enhance with AI
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
              ) : (
                <AICaptionEnhancer
                  imageUrl={imageUrl || ''}
                  originalCaption={editableCaption}
                  onAccept={(enhanced) => {
                    setEditableCaption(enhanced);
                    setShowAIEnhancer(false);
                  }}
                  onCancel={() => setShowAIEnhancer(false)}
                />
              )}
            </>
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
