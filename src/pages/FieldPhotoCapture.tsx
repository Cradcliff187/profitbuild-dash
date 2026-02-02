import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, MapPin, Clock, X, Check, Eye, MessageSquare, RefreshCw, Smartphone, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useCaptureMetadata } from '@/hooks/useCaptureMetadata';
import { useCaptionFlow } from '@/hooks/useCaptionFlow';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isWebPlatform, isIOSPWA } from '@/utils/platform';
import { toast } from 'sonner';
import type { ProjectMedia } from '@/types/project';

export default function FieldPhotoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const { navigateToProjectMedia, navigateToProjectDetail } = useSmartNavigation();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { upload, isUploading, progress } = useProjectMediaUpload(projectId!);
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
      }

      captions.onCaptureSuccess(hasGps);
    } else if (window.top !== window.self) {
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedPhotoUri) return;

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
        file,
        caption: captions.pendingCaption || '',
        description: '',
        ...meta,
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

  const mockPhoto: ProjectMedia = {
    id: 'temp',
    project_id: projectId!,
    file_url: capturedPhotoUri || '',
    file_name: 'preview.jpg',
    file_type: 'image',
    file_size: 0,
    mime_type: 'image/jpeg',
    caption: captions.pendingCaption || null,
    description: null,
    latitude: metadata.coordinates?.latitude ?? null,
    longitude: metadata.coordinates?.longitude ?? null,
    altitude: metadata.coordinates?.altitude ?? null,
    location_name: metadata.locationName ?? null,
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
          onClick={() => navigateToProjectDetail(projectId!)}
          className="h-8"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium text-foreground">
          Project #{projectId?.slice(0, 8)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToProjectMedia(projectId!)}
          className="h-8"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Platform Warning for Web */}
      {isWebPlatform() && (
        <Alert className="m-3 border-primary/50 bg-primary/5">
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Mobile Device Recommended:</strong> Camera and GPS work best on phones/tablets.
            {isIOSPWA() && (
              <span className="block mt-1 text-yellow-600">
                <strong>Note:</strong> Voice captions may not work in installed iOS apps - use Safari browser for full functionality.
              </span>
            )}
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
                {metadata.isLoadingLocation ? (
                  <span>Getting location...</span>
                ) : metadata.isGeocoding ? (
                  <span>Getting address...</span>
                ) : metadata.coordinates ? (
                  <span className="truncate max-w-[200px]">
                    {metadata.locationName || `${metadata.coordinates.latitude.toFixed(4)}, ${metadata.coordinates.longitude.toFixed(4)}`}
                  </span>
                ) : (
                  <span className="text-warning">GPS unavailable</span>
                )}
              </div>
              {metadata.coordinates && metadata.gpsAge !== null && metadata.gpsAge < 5000 && (
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
            {/* Caption Preview - Always Visible */}
            <div className="p-3 bg-muted/50 rounded-lg border mb-2">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Caption Preview:</p>
              {captions.pendingCaption ? (
                <>
                  <p className="text-sm mb-1">{captions.pendingCaption}</p>
                  <p className="text-xs text-muted-foreground">
                    {captions.pendingCaption.split(/\s+/).filter(w => w.length > 0).length} words
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No caption added yet</p>
              )}
            </div>
            
            <div className="space-y-2">
              {captions.captureCount > 3 && !captions.pendingCaption && (
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
                onClick={() => captions.setShowCaptionModal(true)} 
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
              size="xl"
            >
              <Check className="h-4 w-4 mr-2" />
              Upload & Continue
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

      {/* Voice Caption Modal */}
      <VoiceCaptionModal
        open={captions.showVoiceCaptionModal}
        onClose={() => captions.setShowVoiceCaptionModal(false)}
        onCaptionReady={handleVoiceCaptionReady}
        imageUrl={capturedPhotoUri || ''}
      />
    </div>
  );
}
