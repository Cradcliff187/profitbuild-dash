import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, MapPin, Clock, Check, RotateCcw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { formatFileSize, getVideoDuration } from '@/utils/videoUtils';
import { isWebPlatform, isIOSDevice } from '@/utils/platform';
import { toast } from 'sonner';

export default function FieldVideoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { startRecording, isRecording } = useVideoCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading } = useProjectMediaUpload(projectId!);
  const { transcribe, isTranscribing, error: transcriptionError } = useAudioTranscription();
  
  const [capturedVideo, setCapturedVideo] = useState<{
    path?: string;
    webPath?: string;
    format: string;
  } | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [videoCaption, setVideoCaption] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState(false);
  const [isIOS] = useState(isIOSDevice());

  useEffect(() => {
    // Refresh GPS on mount
    getLocation();
  }, []);

  const handleCapture = async () => {
    // Parallelize GPS and video capture to preserve user gesture
    const capturePromise = startRecording();
    const gpsPromise = getLocation();
    
    const [video, location] = await Promise.all([capturePromise, gpsPromise]);
    
    if (location) {
      const age = Date.now() - location.timestamp;
      const ageSeconds = Math.floor(age / 1000);
      
      if (ageSeconds < 10) {
        setGpsAccuracy(location.accuracy);
        toast.success(`GPS refreshed (±${location.accuracy.toFixed(0)}m)`);
      } else {
        toast.warning('GPS data is stale', {
          description: 'Location may not be accurate',
        });
      }
    }
    
    if (video) {
      setCapturedVideo(video);
      
      // Auto-transcribe video directly (OpenAI Whisper supports video formats)
      setIsAutoTranscribing(true);
      try {
        console.log('🎬 Fetching video from path:', video.webPath || video.path);
        const response = await fetch(video.webPath || video.path || '');
        console.log('✅ Fetch response:', response.ok, response.status);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log('✅ Video blob created:', {
            size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
            type: blob.type
          });
          
          // Convert blob to base64
          const videoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          console.log('✅ Video converted to base64:', {
            length: videoBase64.length,
            estimatedSizeMB: `${(videoBase64.length * 0.75 / 1024 / 1024).toFixed(2)} MB`
          });
          
          // Send video directly to transcription with proper MIME type
          const mimeType = blob.type || `video/${video.format}`;
          console.log('🤖 Transcribing with MIME type:', mimeType);
          const transcribedText = await transcribe(videoBase64, mimeType);
          console.log('✅ Transcription result:', transcribedText?.slice(0, 50));
          
          if (transcribedText) {
            setVideoCaption(transcribedText);
            toast.success(`Caption auto-generated from ${isIOS ? 'audio' : 'video'}`);
          } else {
            console.warn('⚠️ No transcription returned');
            toast.error('Transcription failed', {
              description: transcriptionError ?? 'No text returned from service',
              duration: 8000,
            });
          }
        } else {
          throw new Error(`Fetch failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Auto-transcription failed at:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Parse specific error codes for better UX
        if (errorMsg.includes('NO_SPEECH_DETECTED')) {
          toast.error('No speech detected', {
            description: 'Please speak clearly during recording and try again'
          });
        } else if (errorMsg.includes('INVALID_AUDIO')) {
          toast.error('Audio format issue', {
            description: 'Try recording again or use manual caption'
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
      
      setShowCaptionModal(true);
    } else if (window.top !== window.self) {
      // Running in iframe - suggest opening in new tab
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleSaveCaption = (caption: string) => {
    setVideoCaption(caption);
    setShowCaptionModal(false);
  };

  const handleUploadAndContinue = async () => {
    if (!capturedVideo || !projectId) return;

    try {
      // Convert URI to File object
      const response = await fetch(capturedVideo.webPath || capturedVideo.path || '');
      
      if (!response.ok) {
        throw new Error('Failed to fetch video file');
      }
      
      const blob = await response.blob();
      const file = new File([blob], `${isIOS ? 'audio' : 'video'}-${Date.now()}.${capturedVideo.format}`, {
        type: `${isIOS ? 'audio' : 'video'}/${capturedVideo.format}`,
      });

      // Check file size (warn if > 100MB, approaching 150MB limit)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      // Extract video duration
      let duration: number | undefined;
      try {
        duration = await getVideoDuration(file);
      } catch (error) {
        console.warn('Failed to extract video duration:', error);
      }

      // Upload with metadata
      await upload({
        file,
        caption: videoCaption,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        altitude: coordinates?.altitude,
        uploadSource: 'camera',
        duration,
      });

      // Reset and stay on capture screen
      setCapturedVideo(null);
      setVideoCaption('');
      toast.success(`${isIOS ? 'Audio' : 'Video'} uploaded - ready for next capture`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    }
  };

  const handleUploadAndReview = async () => {
    if (!capturedVideo || !projectId) return;

    try {
      const response = await fetch(capturedVideo.webPath || capturedVideo.path || '');
      
      if (!response.ok) {
        throw new Error('Failed to fetch video file');
      }
      
      const blob = await response.blob();
      const file = new File([blob], `${isIOS ? 'audio' : 'video'}-${Date.now()}.${capturedVideo.format}`, {
        type: `${isIOS ? 'audio' : 'video'}/${capturedVideo.format}`,
      });

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      // Extract video duration
      let duration: number | undefined;
      try {
        duration = await getVideoDuration(file);
      } catch (error) {
        console.warn('Failed to extract video duration:', error);
      }

      await upload({
        file,
        caption: videoCaption,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        altitude: coordinates?.altitude,
        uploadSource: 'camera',
        duration,
      });

      navigate(`/projects/${projectId}`, { state: { activeTab: 'videos' } });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    }
  };

  const handleRetake = () => {
    setCapturedVideo(null);
    setVideoCaption('');
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
    caption: videoCaption,
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
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{isIOS ? 'Field Audio Capture' : 'Field Video Capture'}</h1>
            </div>
            {isLoadingLocation && (
              <Badge variant="outline" className="text-xs">
                Getting GPS...
              </Badge>
            )}
            {coordinates && !isLoadingLocation && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                ±{coordinates.accuracy.toFixed(0)}m
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
              href="https://lovable.dev/blogs/TODO" 
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
                {isIOS ? <Mic className="h-8 w-8 text-primary" /> : <Video className="h-8 w-8 text-primary" />}
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">{isIOS ? 'Record Audio' : 'Record Video'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isIOS ? 'Capture audio for accurate transcription' : 'Capture up to 2 minutes of video footage'}
                </p>
              </div>

              {isLoadingLocation && (
                <Alert>
                  <AlertDescription className="text-xs">
                    🔄 Acquiring GPS location...
                  </AlertDescription>
                </Alert>
              )}

              {coordinates && gpsAccuracy && !isLoadingLocation && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    GPS: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                    <br />
                    Accuracy: ±{gpsAccuracy.toFixed(0)}m (Fresh)
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                onClick={handleCapture}
                disabled={isRecording}
                className="w-full"
              >
                {isIOS ? <Mic className="h-5 w-5 mr-2" /> : <Video className="h-5 w-5 mr-2" />}
                {isRecording ? 'Opening Camera...' : 'Start Recording'}
              </Button>
            </Card>
          </div>
        ) : (
          /* Preview View */
          <div className="w-full max-w-2xl space-y-4">
            <Card className="overflow-hidden">
              {isIOS ? (
                <audio
                  controls
                  autoPlay
                  className="w-full bg-black p-4"
                  src={capturedVideo.webPath || capturedVideo.path || ''}
                >
                  Your browser does not support audio playback.
                </audio>
              ) : (
                <video
                  controls
                  autoPlay
                  className="w-full aspect-video bg-black"
                  src={capturedVideo.webPath || capturedVideo.path || ''}
                >
                  Your browser does not support video playback.
                </video>
              )}
            </Card>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {coordinates && (
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location</span>
                  </div>
                  <div className="text-xs">
                    {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                    <br />
                    ±{coordinates.accuracy.toFixed(0)}m accuracy
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
            {videoCaption && !isAutoTranscribing && (
              <Card className="p-3">
                <div className="text-sm font-medium mb-1">Caption (Auto-generated)</div>
                <p className="text-sm text-muted-foreground">{videoCaption}</p>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCaptionModal(true)}
                disabled={isAutoTranscribing}
              >
                {videoCaption ? 'Edit Caption' : 'Add Caption'}
              </Button>

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
                    onClick={() => setShowCaptionModal(false)}
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
            open={showCaptionModal}
            onClose={() => setShowCaptionModal(false)}
            onSave={handleSaveCaption}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
