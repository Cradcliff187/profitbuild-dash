import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Clock, X, Check, Eye, MessageSquare, RefreshCw, Smartphone, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isWebPlatform, isIOSPWA } from '@/utils/platform';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';
import { getCaptionPreferences } from '@/utils/userPreferences';

// Debug mode: set to true to always show caption prompts (helpful for testing)
const DEBUG_ALWAYS_SHOW_PROMPT = false;

export default function BidPhotoCapture() {
  const { id: bidId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading, progress } = useBidMediaUpload();
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
      console.log('[BidPhotoCapture] Photo captured successfully', {
        captureCount: captureCount + 1,
        hasGPS: !!freshCoords,
        willShowToast: DEBUG_ALWAYS_SHOW_PROMPT || (captureCount + 1) <= 3,
      });
      
      setCapturedPhotoUri(photo.webPath || '');
      const newCaptureCount = captureCount + 1;
      setCaptureCount(newCaptureCount);
      
      // Show GPS accuracy toast
      if (freshCoords) {
        toast.success(`Photo captured with GPS accuracy ±${freshCoords.accuracy.toFixed(0)}m`);
        
        // Smart caption prompt (3-second delay so GPS toast shows first)
        setTimeout(async () => {
          // Check user preferences
          const prefs = await getCaptionPreferences();
          if (!prefs.showCaptionPrompts && !DEBUG_ALWAYS_SHOW_PROMPT) {
            return; // User has disabled prompts
          }

          // Only show on first 3 captures (unless debugging)
          if (DEBUG_ALWAYS_SHOW_PROMPT || newCaptureCount <= 3) {
            const message = newCaptureCount === 1 
              ? CAPTION_PROMPTS.firstCapture 
              : CAPTION_PROMPTS.gpsAvailable;
            
            console.log('[BidPhotoCapture] Showing caption prompt toast', {
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
      } else {
        toast.warning('GPS unavailable', {
          description: 'Photo captured without location data',
        });
      }
    } else if (window.top !== window.self) {
      // Running in iframe - suggest opening in new tab
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedPhotoUri || !bidId) return;

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
        bid_id: bidId,
        file,
        caption: pendingCaption || undefined,
      });

      // Show success toast with caption info
      const wordCount = pendingCaption ? pendingCaption.split(/\s+/).filter(w => w.length > 0).length : 0;
      toast.success(
        pendingCaption 
          ? `Photo uploaded with caption (${wordCount} word${wordCount !== 1 ? 's' : ''})` 
          : 'Photo uploaded without caption'
      );

      // Reset for next photo
      setCapturedPhotoUri(null);
      setPendingCaption('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleSaveCaption = (caption: string) => {
    setPendingCaption(caption);
    setShowCaptionModal(false);
    setSkipCount(0); // Reset skip counter when user adds caption
    toast.success('Caption saved - ready to upload');
  };

  // Open voice modal with non-blocking warnings
  const handleVoiceCaptionClick = () => {
    // Show info toast if in iframe (non-blocking)
    if (window.self !== window.top) {
      toast.info('Embedded preview: microphone may be limited', {
        description: 'If recording fails, open in a new tab.',
        duration: 5000,
        action: {
          label: 'Open in New Tab',
          onClick: () => window.open(window.location.href, '_blank'),
        },
      });
    }
    
    // Always open the modal - let it handle actual errors
    setShowVoiceCaptionModal(true);
  };

  const handleVoiceCaptionReady = (caption: string) => {
    setPendingCaption(caption);
    setShowVoiceCaptionModal(false);
    setSkipCount(0); // Reset skip counter
    const wordCount = caption.split(/\s+/).filter(w => w.length > 0).length;
    toast.success(`Voice caption added (${wordCount} word${wordCount !== 1 ? 's' : ''})`);
  };

  const handleDiscard = () => {
    setCapturedPhotoUri(null);
    setPendingCaption('');
    toast.info('Photo discarded');
  };

  const handleGoBack = () => {
    navigate(`/branch-bids/${bidId}`);
  };

  // Calculate GPS age string
  const gpsAgeString = gpsAge !== null 
    ? gpsAge < 60000 
      ? `${Math.floor(gpsAge / 1000)}s ago` 
      : `${Math.floor(gpsAge / 60000)}m ago`
    : '';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
          <div className="text-sm font-medium">Bid Photo Capture</div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 space-y-4">
          {/* GPS Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className={`h-4 w-4 ${coordinates ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">
                {coordinates 
                  ? `GPS: ±${coordinates.accuracy.toFixed(0)}m`
                  : isLoadingLocation 
                    ? 'Getting GPS...' 
                    : 'GPS unavailable'}
              </span>
            </div>
            {gpsAge !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {gpsAgeString}
              </div>
            )}
          </div>

          {!capturedPhotoUri ? (
            /* Capture State */
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <Camera className="h-20 w-20 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Capture Photo</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Take photos with GPS location automatically attached
                </p>
              </div>
              
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={isCapturing}
                className="w-48 h-16 text-lg"
              >
                <Camera className="h-6 w-6 mr-2" />
                {isCapturing ? 'Opening Camera...' : 'Take Photo'}
              </Button>

              {isWebPlatform() && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    For best results, use this feature on a mobile device
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            /* Preview State */
            <div className="flex-1 flex flex-col space-y-4">
              {/* Photo Preview */}
              <div className="flex-1 rounded-lg overflow-hidden bg-black relative">
                <img
                  src={capturedPhotoUri}
                  alt="Captured photo"
                  className="w-full h-full object-contain"
                />
                {coordinates && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    ±{coordinates.accuracy.toFixed(0)}m
                  </div>
                )}
              </div>

              {/* Caption Section */}
              <div className="space-y-2">
                {pendingCaption && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Caption</div>
                        <div className="text-sm">{pendingCaption}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCaptionModal(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}

                {!pendingCaption && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCaptionModal(true)}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Caption
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleVoiceCaptionClick}
                      className="flex-1"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Voice Caption
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && progress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                <Button
                  onClick={handleUploadAndContinue}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload & Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <QuickCaptionModal
          isOpen={showCaptionModal}
          onClose={() => setShowCaptionModal(false)}
          onSave={handleSaveCaption}
          initialCaption={pendingCaption}
        />

        <VoiceCaptionModal
          isOpen={showVoiceCaptionModal}
          onClose={() => setShowVoiceCaptionModal(false)}
          onCaptionReady={handleVoiceCaptionReady}
          initialCaption={pendingCaption}
        />
      </div>
    </ErrorBoundary>
  );
}

