import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, MapPin, Clock, Check, RotateCcw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { formatFileSize, getVideoDuration } from '@/utils/videoUtils';
import { isWebPlatform } from '@/utils/platform';
import { toast } from 'sonner';

export default function FieldVideoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { startRecording, isRecording } = useVideoCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading } = useProjectMediaUpload(projectId!);
  
  const [capturedVideo, setCapturedVideo] = useState<{
    path?: string;
    webPath?: string;
    format: string;
  } | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [videoCaption, setVideoCaption] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  useEffect(() => {
    // Refresh GPS on mount
    getLocation();
  }, []);

  const handleCapture = async () => {
    // Refresh GPS before recording
    const location = await getLocation();
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

    const video = await startRecording();
    
    if (video) {
      setCapturedVideo(video);
      setShowCaptionModal(true);
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
      const file = new File([blob], `video-${Date.now()}.${capturedVideo.format}`, {
        type: `video/${capturedVideo.format}`,
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch video file');
      }
      
      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.${capturedVideo.format}`, {
        type: `video/${capturedVideo.format}`,
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

      navigate(`/projects/${projectId}`);
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
              <h1 className="text-lg font-semibold">Field Video Capture</h1>
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
                <Video className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">Record Video</h2>
                <p className="text-sm text-muted-foreground">
                  Capture up to 2 minutes of video footage
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
            {videoCaption && (
              <Card className="p-3">
                <div className="text-sm font-medium mb-1">Caption</div>
                <p className="text-sm text-muted-foreground">{videoCaption}</p>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCaptionModal(true)}
              >
                {videoCaption ? 'Edit Caption' : 'Add Caption'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  disabled={isUploading}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleUploadAndContinue}
                  disabled={isUploading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Upload & Continue
                </Button>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleUploadAndReview}
                disabled={isUploading}
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
