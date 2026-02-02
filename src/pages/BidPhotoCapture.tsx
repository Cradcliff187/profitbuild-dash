import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Clock, X, Check, MessageSquare, Smartphone, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useCaptureMetadata } from '@/hooks/useCaptureMetadata';
import { useCaptionFlow } from '@/hooks/useCaptionFlow';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isWebPlatform } from '@/utils/platform';
import { toast } from 'sonner';

export default function BidPhotoCapture() {
  const { id: bidId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { upload, isUploading, progress } = useBidMediaUpload();
  const metadata = useCaptureMetadata();
  const captions = useCaptionFlow();
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const handleCapture = async () => {
    const capturePromise = capturePhoto();
    await metadata.startLocationCapture();

    const photo = await capturePromise;

    if (photo) {
      setCapturedPhotoUri(photo.webPath || '');

      const hasGps = !!metadata.coordinates;
      if (hasGps) {
        toast.success(`Photo captured with GPS accuracy ±${metadata.coordinates!.accuracy.toFixed(0)}m`);
      } else {
        toast.warning('GPS unavailable', {
          description: 'Photo captured without location data',
        });
      }

      captions.onCaptureSuccess(hasGps);
    } else if (window.top !== window.self) {
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedPhotoUri || !bidId) return;

    if (!captions.pendingCaption.trim()) {
      captions.onCaptionSkipped();
    }

    try {
      const response = await fetch(capturedPhotoUri);
      if (!response.ok) throw new Error('Failed to fetch photo file');

      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 15) {
        toast.warning(`Large file: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take longer',
        });
      }

      const meta = metadata.getMetadataForUpload();
      await upload({
        bid_id: bidId,
        file,
        caption: captions.pendingCaption || undefined,
        latitude: meta.latitude,
        longitude: meta.longitude,
        altitude: meta.altitude ?? undefined,
        location_name: meta.locationName,
        taken_at: meta.takenAt,
        device_model: meta.deviceModel,
        upload_source: meta.uploadSource,
      });

      const wordCount = captions.pendingCaption ? captions.pendingCaption.split(/\s+/).filter(w => w.length > 0).length : 0;
      toast.success(
        captions.pendingCaption
          ? `Photo uploaded with caption (${wordCount} word${wordCount !== 1 ? 's' : ''})`
          : 'Photo uploaded without caption'
      );

      setCapturedPhotoUri(null);
      captions.setPendingCaption('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleSaveCaption = (caption: string) => {
    captions.onCaptionSaved(caption);
  };

  const handleVoiceCaptionClick = () => {
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
    captions.setShowVoiceCaptionModal(true);
  };

  const handleVoiceCaptionReady = (caption: string) => {
    captions.onVoiceCaptionReady(caption);
  };

  const handleDiscard = () => {
    setCapturedPhotoUri(null);
    captions.setPendingCaption('');
    toast.info('Photo discarded');
  };

  const handleGoBack = () => {
    navigate(`/branch-bids/${bidId}`);
  };

  const gpsAgeString = metadata.gpsAge !== null
    ? metadata.gpsAge < 60000
      ? `${Math.floor(metadata.gpsAge / 1000)}s ago`
      : `${Math.floor(metadata.gpsAge / 60000)}m ago`
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
              <MapPin className={`h-4 w-4 ${metadata.coordinates ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">
                {metadata.coordinates 
                  ? `GPS: ±${metadata.coordinates.accuracy.toFixed(0)}m`
                  : metadata.isLoadingLocation 
                    ? 'Getting GPS...' 
                    : 'GPS unavailable'}
              </span>
            </div>
            {metadata.gpsAge !== null && (
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
                {metadata.coordinates && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    ±{metadata.coordinates.accuracy.toFixed(0)}m
                  </div>
                )}
              </div>

              {/* Caption Section */}
              <div className="space-y-2">
                {captions.pendingCaption && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Caption</div>
                        <div className="text-sm">{captions.pendingCaption}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => captions.setShowCaptionModal(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}

                {!captions.pendingCaption && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => captions.setShowCaptionModal(true)}
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
          photo={{ file_url: '', caption: captions.pendingCaption } as any}
          open={captions.showCaptionModal}
          onClose={() => captions.setShowCaptionModal(false)}
          onSave={handleSaveCaption}
        />

        <VoiceCaptionModal
          open={captions.showVoiceCaptionModal}
          onClose={() => captions.setShowVoiceCaptionModal(false)}
          onCaptionReady={handleVoiceCaptionReady}
        />
      </div>
    </ErrorBoundary>
  );
}

