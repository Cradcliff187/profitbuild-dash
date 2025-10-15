import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, MapPin, Clock, X, Check, Eye, MessageSquare, RefreshCw, Smartphone, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isWebPlatform } from '@/utils/platform';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';
import type { ProjectMedia } from '@/types/project';

// Debug mode: set to true to always show caption prompts (helpful for testing)
const DEBUG_ALWAYS_SHOW_PROMPT = false;

export default function FieldPhotoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading, progress } = useProjectMediaUpload(projectId!);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showVoiceCaptionModal, setShowVoiceCaptionModal] = useState(false);
  const [pendingCaption, setPendingCaption] = useState<string>('');
  const [gpsAge, setGpsAge] = useState<number | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);

  // Calculate GPS age
  useEffect(() => {
    if (coordinates) {
      setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
      setGpsAge(Date.now() - coordinates.timestamp);
    }
  }, [coordinates]);

  const handleCapture = async () => {
    // Parallelize GPS and photo capture to preserve user gesture
    const capturePromise = capturePhoto();
    const gpsPromise = getLocation();
    
    const [photo, freshCoords] = await Promise.all([capturePromise, gpsPromise]);
    
    if (photo) {
      console.log('[PhotoCapture] Photo captured successfully', {
        captureCount: captureCount + 1,
        hasGPS: !!freshCoords,
        willShowToast: DEBUG_ALWAYS_SHOW_PROMPT || (captureCount + 1) <= 3,
      });
      
      setCapturedPhotoUri(photo.webPath || photo.path);
      const newCaptureCount = captureCount + 1;
      setCaptureCount(newCaptureCount);
      
      // Show GPS accuracy toast
      if (freshCoords) {
        toast.success(`Photo captured with GPS accuracy ±${freshCoords.accuracy.toFixed(0)}m`);
        
        // Smart caption prompt (3-second delay so GPS toast shows first)
        setTimeout(() => {
          // Only show on first 3 captures (unless debugging)
          if (DEBUG_ALWAYS_SHOW_PROMPT || newCaptureCount <= 3) {
            const message = newCaptureCount === 1 
              ? CAPTION_PROMPTS.firstCapture 
              : CAPTION_PROMPTS.gpsAvailable;
            
            console.log('[PhotoCapture] Showing caption prompt toast', {
              captureNumber: newCaptureCount,
              message: newCaptureCount === 1 ? 'firstCapture' : 'gpsAvailable',
            });
            
            showCaptionPrompt({
              onVoiceClick: () => setShowVoiceCaptionModal(true),
              onTypeClick: () => setShowCaptionModal(true),
              message,
              duration: DEBUG_ALWAYS_SHOW_PROMPT ? 10000 : 5000,
            });
          }
        }, 3000);
      }
    } else if (window.top !== window.self) {
      // Running in iframe - suggest opening in new tab
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedPhotoUri) return;

    // Track if user skipped caption
    const skippedCaption = !pendingCaption.trim();
    if (skippedCaption) {
      const newSkipCount = skipCount + 1;
      setSkipCount(newSkipCount);
      
      // Show gentle reminder after 3 consecutive skips
      if (newSkipCount >= 3 && newSkipCount % 3 === 0) {
        toast.info(CAPTION_PROMPTS.multipleSkips, {
          duration: 4000,
        });
      }
    }

    try {
      // Convert photo URI to File
      const response = await fetch(capturedPhotoUri);
      
      if (!response.ok) {
        throw new Error('Failed to fetch photo file');
      }
      
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Check file size (warn if > 15MB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 15) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      await upload({
        file,
        caption: pendingCaption || '',
        description: '',
        locationName: locationName,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        altitude: coordinates?.altitude,
      });

      // Reset for next photo
      setCapturedPhotoUri(null);
      setPendingCaption('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleUploadAndReview = async () => {
    await handleUploadAndContinue();
    navigate(`/projects/${projectId}/media`);
  };

  const handleSaveCaption = (caption: string) => {
    setPendingCaption(caption);
    setShowCaptionModal(false);
    setSkipCount(0); // Reset skip counter when user adds caption
    toast.success('Caption saved - ready to upload');
  };

  // Check if in iframe before opening voice modal
  const handleVoiceCaptionClick = () => {
    if (window.self !== window.top) {
      toast.error('Microphone blocked in embedded view — open in new tab to use voice captions');
      setShowCaptionModal(true); // Fallback to text modal
    } else {
      setShowVoiceCaptionModal(true);
    }
  };

  const handleVoiceCaptionReady = (caption: string) => {
    setPendingCaption(caption);
    setShowVoiceCaptionModal(false);
    setSkipCount(0); // Reset skip counter
    const wordCount = caption.split(/\s+/).filter(w => w.length > 0).length;
    toast.success(`Voice caption added (${wordCount} word${wordCount !== 1 ? 's' : ''})`);
  };

  // Create a mock ProjectMedia object for the caption modal
  const mockPhoto: ProjectMedia = {
    id: 'temp',
    project_id: projectId!,
    file_url: capturedPhotoUri || '',
    file_name: 'preview.jpg',
    file_type: 'image',
    file_size: 0,
    mime_type: 'image/jpeg',
    caption: pendingCaption || null,
    description: null,
    latitude: coordinates?.latitude || null,
    longitude: coordinates?.longitude || null,
    altitude: coordinates?.altitude || null,
    location_name: locationName || null,
    taken_at: new Date().toISOString(),
    device_model: null,
    uploaded_by: null,
    upload_source: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="h-8"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium text-foreground">
          Project #{projectId?.slice(0, 8)}
        </div>
        <div className="w-8" />
      </div>

      {/* Platform Warning for Web */}
      {isWebPlatform() && (
        <Alert className="m-3 border-primary/50 bg-primary/5">
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Limited Functionality:</strong> Camera and GPS features work best on mobile devices.{' '}
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

      {/* Camera View */}
      {!capturedPhotoUri ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted relative">
          {/* Camera Placeholder - In production, this would be the actual camera viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-24 w-24 text-muted-foreground" />
          </div>

          {/* GPS Status Strip */}
          <div className="absolute bottom-32 left-0 right-0 bg-background/90 backdrop-blur-sm border-y border-border p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                {isLoadingLocation ? (
                  <span>Getting location...</span>
                ) : coordinates ? (
                  <span>
                    GPS: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)} (±
                    {coordinates.accuracy.toFixed(0)}m)
                  </span>
                ) : (
                  <span className="text-warning">GPS unavailable</span>
                )}
              </div>
              {coordinates && gpsAge && gpsAge < 5000 && (
                <div className="flex items-center gap-1 text-primary">
                  <RefreshCw className="h-3 w-3" />
                  <span>Fresh</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {currentTime} · {currentDate}
              </span>
            </div>
          </div>

          {/* Capture Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-card border-t border-border">
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={handleCapture}
                disabled={isCapturing}
              >
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Photo Preview */
        <div className="flex-1 flex flex-col bg-muted overflow-y-auto">
          {/* Preview Image */}
          <div className="flex-shrink-0 flex items-center justify-center p-4 min-h-0">
            <img
              src={capturedPhotoUri}
              alt="Captured"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute bottom-32 left-0 right-0 bg-background/90 backdrop-blur-sm p-4">
              <div className="text-sm text-center mb-2">Uploading... {progress}%</div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex-shrink-0 p-4 bg-card border-t border-border space-y-2">
            {pendingCaption && (
              <div className="p-2 bg-muted rounded border mb-2">
                <p className="text-xs text-muted-foreground">Caption:</p>
                <p className="text-sm font-medium">{pendingCaption}</p>
              </div>
            )}
            
            <div className="space-y-2">
              {/* Show tip badge when prompt is suppressed */}
              {captureCount > 3 && !pendingCaption && (
                <div className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded">
                  💡 Tip: Caption prompts show for first 3 photos
                </div>
              )}
              
              {/* Primary Voice Caption CTA */}
              <Button 
                onClick={handleVoiceCaptionClick} 
                variant="default" 
                className="w-full text-base font-semibold"
                size="xl"
                disabled={isUploading}
              >
                <Mic className="h-5 w-5 mr-2" />
                Voice Caption (Recommended)
              </Button>
              <p className="text-xs text-center text-muted-foreground -mt-1 mb-1">
                Quick voice notes make reviews easier
              </p>
              
              {/* Secondary Type Option */}
              <Button 
                onClick={() => setShowCaptionModal(true)} 
                variant="outline" 
                className="w-full"
                size="sm"
                disabled={isUploading}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Type Caption Instead
              </Button>
            </div>
            
            <Button
              onClick={handleUploadAndContinue}
              disabled={isUploading}
              className="w-full"
              size="lg"
            >
              <Check className="h-4 w-4 mr-2" />
              Upload & Continue
            </Button>
            <Button
              onClick={handleUploadAndReview}
              disabled={isUploading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              Upload & Review
            </Button>
            <Button
              onClick={() => setCapturedPhotoUri(null)}
              disabled={isUploading}
              variant="ghost"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Retake
            </Button>
          </div>
        </div>
      )}

      {/* Caption Modal with Error Boundary */}
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

      {/* Voice Caption Modal */}
      <VoiceCaptionModal
        open={showVoiceCaptionModal}
        onClose={() => setShowVoiceCaptionModal(false)}
        onCaptionReady={handleVoiceCaptionReady}
        imageUrl={capturedPhotoUri || ''}
      />
    </div>
  );
}
