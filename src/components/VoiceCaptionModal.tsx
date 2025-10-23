import { useEffect, useState } from 'react';
import { Mic, MicOff, Check, X, Loader2, Sparkles, AlertCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';
import { checkAudioRecordingSupport } from '@/utils/browserCompatibility';
import { isIOSPWA } from '@/utils/platform';
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
    isRequesting,
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
  const [isInIframe, setIsInIframe] = useState(false);
  const [isInIOSPWA, setIsInIOSPWA] = useState(false);

  // Check if running in iframe or iOS PWA on mount
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
    setIsInIOSPWA(isIOSPWA());
  }, []);

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
    // Prevent double-clicks during requesting/recording/processing
    if (isRequesting || isRecording || isProcessing) {
      return;
    }
    
    if (isInIframe) {
      toast.error('Microphone blocked in embedded preview. Open in a new tab to use voice captions.');
      return;
    }
    
    resetTranscription();
    setEditableCaption('');
    setHasTranscribed(false);
    
    // No toast needed - UI will show immediate feedback via button state
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
    setShowAIEnhancer(false);
    onClose();
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
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
          {/* Iframe warning */}
          {isInIframe && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Microphone Blocked</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Microphone access is blocked in embedded preview. To use voice captions:
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleOpenInNewTab}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in New Tab
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Type Instead
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* iOS PWA Warning - shown proactively */}
          {isInIOSPWA && !isInIframe && (
            <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>iOS PWA Microphone Limitations</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">iOS restricts microphone access in installed web apps. For best results:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>Open this site in Safari browser (not the installed app)</li>
                  <li>Grant microphone permission when prompted</li>
                  <li>Keep Safari open while recording</li>
                </ul>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in Safari
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Use Text Instead
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recording Interface */}
          {!showTranscription && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {/* Show error alert if there's a recording error */}
              {recordingError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Microphone Error</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">{recordingError}</p>
                    
                    {isInIOSPWA ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold">iOS PWA Microphone Blocked</p>
                        <p className="text-xs">iOS Safari restricts microphone in installed apps. Solutions:</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => window.open(window.location.href, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Safari
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              resetRecording();
                              handleStartRecording();
                            }}
                          >
                            Try Again
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Type Instead
                          </Button>
                        </div>
                      </div>
                    ) : isInIframe ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold">Embedded View Blocked</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleOpenInNewTab}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in New Tab
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Type Instead
                          </Button>
                        </div>
                      </div>
                    ) : recordingError.includes('permission') || recordingError.includes('denied') ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold">Permission Required</p>
                        <p className="text-xs">Enable microphone in browser settings:</p>
                        <ul className="text-xs space-y-1 ml-4 list-disc">
                          <li><strong>iOS Safari:</strong> Settings → Safari → Microphone → Ask</li>
                          <li><strong>Android Chrome:</strong> Site Settings → Microphone → Allow</li>
                        </ul>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              resetRecording();
                              handleStartRecording();
                            }}
                          >
                            Try Again
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Type Instead
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            resetRecording();
                            handleStartRecording();
                          }}
                        >
                          Try Again
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          Type Instead
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="h-20 w-20 rounded-full"
                disabled={isRequesting || isProcessingAudio || !browserSupport.supported || isInIframe}
              >
                {isRequesting ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              {isRequesting && (
                <div className="text-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Requesting microphone access...
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Please allow when prompted
                  </div>
                </div>
              )}

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

              {!isRecording && !isRequesting && (
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
