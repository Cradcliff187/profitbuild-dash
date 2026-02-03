import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Video, MapPin, Clock, Check, RotateCcw, Smartphone } from 'lucide-react';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { useCaptureMetadata } from '@/hooks/useCaptureMetadata';
import { useCaptionFlow } from '@/hooks/useCaptionFlow';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { getVideoDuration } from '@/utils/videoUtils';
import { isWebPlatform } from '@/utils/platform';
import { convertMovToM4a } from '@/utils/movToM4a';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';

export default function FieldVideoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const { navigateToProjectMedia, navigateToProjectDetail } = useSmartNavigation();

  const { startRecording, isRecording } = useVideoCapture();
  const { upload, isUploading } = useProjectMediaUpload(projectId!);
  const { transcribe, error: transcriptionError } = useAudioTranscription();
  const metadata = useCaptureMetadata();
  const captions = useCaptionFlow();

  const [capturedVideo, setCapturedVideo] = useState<{
    path?: string;
    webPath?: string;
    format: string;
  } | null>(null);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState(false);
  const [videoCaptureCount, setVideoCaptureCount] = useState(0);

  useEffect(() => {
    void metadata.startLocationCapture();
  }, []);

  const handleCapture = async () => {
    const capturePromise = startRecording();
    await metadata.startLocationCapture();

    const video = await capturePromise;

    if (metadata.coordinates) {
      const age = metadata.gpsAge ?? 0;
      if (age < 10000) {
        toast.success(`GPS refreshed (±${metadata.coordinates.accuracy.toFixed(0)}m)`);
      } else {
        toast.warning('GPS data is stale', {
          description: 'Location may not be accurate',
        });
      }
    }

    if (video) {
      const newCaptureCount = videoCaptureCount + 1;
      setVideoCaptureCount(newCaptureCount);
      setCapturedVideo(video);

      setIsAutoTranscribing(true);
      try {
        const response = await fetch(video.webPath || '');
        if (response.ok) {
          let blob = await response.blob();
          let mimeType = blob.type || `video/${video.format}`;
          if (blob.type.includes('video/quicktime')) {
            toast.info('Converting video for transcription...', { duration: 3000 });
            try {
              const converted = await convertMovToM4a(blob);
              blob = converted.blob;
              mimeType = converted.mime;
            } catch (conversionError) {
              console.error('❌ Conversion failed:', conversionError);
              toast.error('Video conversion failed', {
                description: 'You can still add a manual or voice caption',
                duration: 5000,
              });
              setIsAutoTranscribing(false);
              captions.setShowCaptionModal(true);
              return;
            }
          }

          const videoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const transcribedText = await transcribe(videoBase64, mimeType);
          if (transcribedText) {
            captions.setPendingCaption(transcribedText);
            toast.success('Caption auto-generated from video');
            setTimeout(() => {
              if (newCaptureCount <= 2) {
                showCaptionPrompt({
                  onVoiceClick: () => captions.setShowCaptionModal(true),
                  onTypeClick: () => captions.setShowCaptionModal(true),
                  message: CAPTION_PROMPTS.reviewAiCaption,
                  duration: 4000,
                });
              }
            }, 2000);
          } else {
            toast.error('Transcription failed', {
              description: transcriptionError ?? 'No text returned from service',
              duration: 8000,
            });
          }
        } else {
          throw new Error(`Fetch failed with status: ${response.status}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('NO_SPEECH_DETECTED')) {
          toast.error('No speech detected', {
            description: 'Please speak clearly during recording and try again',
          });
        } else if (errorMsg.includes('INVALID_AUDIO')) {
          toast.error('Audio format issue', {
            description: 'Try recording again or use manual caption',
          });
        } else {
          toast.error('Auto-caption failed', {
            description: errorMsg.slice(0, 100),
            duration: 8000,
          });
        }
      } finally {
        setIsAutoTranscribing(false);
      }

      captions.setShowCaptionModal(true);
    } else if (window.top !== window.self) {
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleSaveCaption = (caption: string) => {
    captions.onCaptionSaved(caption);
  };

  const handleUploadAndContinue = async () => {
    if (!capturedVideo || !projectId) return;

    try {
      const response = await fetch(capturedVideo.webPath || capturedVideo.path || '');
      if (!response.ok) throw new Error('Failed to fetch video file');

      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.${capturedVideo.format}`, {
        type: blob.type || `video/${capturedVideo.format}`,
      });

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      let duration: number | undefined;
      try {
        duration = await getVideoDuration(file);
      } catch (error) {
        console.warn('Failed to extract video duration:', error);
      }

      const meta = metadata.getMetadataForUpload();
      await upload({
        file,
        caption: captions.pendingCaption,
        ...meta,
        duration,
      });

      setCapturedVideo(null);
      captions.setPendingCaption('');
      toast.success('Video uploaded - ready for next capture');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    }
  };

  const handleUploadAndReview = async () => {
    if (!capturedVideo || !projectId) return;

    try {
      const response = await fetch(capturedVideo.webPath || capturedVideo.path || '');
      if (!response.ok) throw new Error('Failed to fetch video file');

      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.${capturedVideo.format}`, {
        type: blob.type || `video/${capturedVideo.format}`,
      });

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      let duration: number | undefined;
      try {
        duration = await getVideoDuration(file);
      } catch (error) {
        console.warn('Failed to extract video duration:', error);
      }

      const meta = metadata.getMetadataForUpload();
      await upload({
        file,
        caption: captions.pendingCaption,
        ...meta,
        duration,
      });

      navigateToProjectMedia(projectId!);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    }
  };

  const handleRetake = () => {
    setCapturedVideo(null);
    captions.setPendingCaption('');
  };

  // Mock photo for caption modal (video uses same modal)
  const mockPhoto = capturedVideo ? {
    id: 'temp',
    project_id: projectId!,
    file_url: capturedVideo.webPath || capturedVideo.path || '',
    file_name: 'video',
    file_type: 'video' as const,
    mime_type: `video/${capturedVideo.format}`,
    file_size: 0,
    caption: captions.pendingCaption,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToProjectDetail(projectId!)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Field Video Capture</h1>
            </div>
            {metadata.isLoadingLocation && (
              <Badge variant="outline" className="text-xs">
                Getting GPS...
              </Badge>
            )}
            {metadata.coordinates && !metadata.isLoadingLocation && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                ±{metadata.coordinates.accuracy.toFixed(0)}m
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Platform Warning for Web */}
      {isWebPlatform() && (
        <Alert className="m-4 border-primary/50 bg-primary/5">
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Limited Functionality:</strong> Camera, video, and GPS features work best on mobile devices.{' '}
            <a 
              href="https://docs.lovable.dev/features/mobile" 
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Learn how to build for mobile
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!capturedVideo ? (
          /* Recording View */
          <div className="w-full max-w-md space-y-4">
            <Card className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">Record Video</h2>
                <p className="text-sm text-muted-foreground">
                  Capture up to 2 minutes of video footage
                </p>
              </div>

              {metadata.isLoadingLocation && (
                <Alert>
                  <AlertDescription className="text-xs">
                    🔄 Acquiring GPS location...
                  </AlertDescription>
                </Alert>
              )}

              {metadata.coordinates && !metadata.isLoadingLocation && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    GPS: {metadata.coordinates.latitude.toFixed(6)}, {metadata.coordinates.longitude.toFixed(6)}
                    <br />
                    Accuracy: ±{metadata.coordinates.accuracy.toFixed(0)}m (Fresh)
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                onClick={handleCapture}
                disabled={isRecording}
                className="w-full"
              >
                <Video className="h-5 w-5 mr-2" />
                {isRecording ? 'Opening Camera...' : 'Start Recording'}
              </Button>
            </Card>
          </div>
        ) : (
          /* Preview View */
          <div className="w-full max-w-2xl space-y-4">
            <Card className="overflow-hidden">
              <video
                controls
                autoPlay
                className="w-full aspect-video bg-black"
                src={capturedVideo.webPath || capturedVideo.path || ''}
              >
                Your browser does not support video playback.
              </video>
            </Card>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {metadata.coordinates && (
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location</span>
                  </div>
                  <div className="text-xs">
                    {metadata.coordinates.latitude.toFixed(6)}, {metadata.coordinates.longitude.toFixed(6)}
                    <br />
                    ±{metadata.coordinates.accuracy.toFixed(0)}m accuracy
                  </div>
                </Card>
              )}
              
              <Card className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Captured</span>
                </div>
                <div className="text-xs">
                  {new Date().toLocaleTimeString()} · {new Date().toLocaleDateString()}
                </div>
              </Card>
            </div>

            {/* Caption Display */}
            {isAutoTranscribing && (
              <Card className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Auto-transcribing video audio...
                </div>
              </Card>
            )}
            {captions.pendingCaption && !isAutoTranscribing && (
              <Card className="p-3">
                <div className="text-sm font-medium mb-1">Caption (Auto-generated)</div>
                <p className="text-sm text-muted-foreground">{captions.pendingCaption}</p>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Button
                  variant="outline"
                  className="w-full h-12 font-medium"
                  onClick={() => captions.setShowCaptionModal(true)}
                  disabled={isAutoTranscribing}
                >
                  {captions.pendingCaption ? 'Review AI Caption' : 'Add Caption'}
                </Button>
                {isAutoTranscribing ? (
                  <p className="text-xs text-center text-muted-foreground">
                    Generating caption from audio...
                  </p>
                ) : !captions.pendingCaption ? (
                  <p className="text-xs text-center text-muted-foreground">
                    AI transcription attempted - verify or add details
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  disabled={isUploading || isAutoTranscribing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleUploadAndContinue}
                  disabled={isUploading || isAutoTranscribing}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Upload & Continue
                </Button>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleUploadAndReview}
                disabled={isUploading || isAutoTranscribing}
              >
                Upload & Review Gallery
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Caption Modal with Error Boundary */}
      {mockPhoto && (
        <ErrorBoundary
          fallback={({ retry }) => (
            <Alert variant="destructive" className="m-4">
              <AlertDescription className="space-y-2">
                <p>Caption feature temporarily unavailable.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => captions.setShowCaptionModal(false)}
                  >
                    Skip Caption
                  </Button>
                  <Button size="sm" onClick={retry}>
                    Try Again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        >
          <QuickCaptionModal
            photo={mockPhoto}
            open={captions.showCaptionModal}
            onClose={() => captions.setShowCaptionModal(false)}
            onSave={handleSaveCaption}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
