import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, MapPin, Clock, X, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';
import { toast } from 'sonner';

export default function FieldPhotoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading, progress } = useProjectMediaUpload(projectId!);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Request GPS on mount
  useEffect(() => {
    getLocation();
  }, []);

  // Reverse geocode coordinates to address
  useEffect(() => {
    if (coordinates) {
      setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
      // Optional: Add reverse geocoding API call here
    }
  }, [coordinates]);

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      setCapturedPhotoUri(photo.webPath || photo.path);
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedPhotoUri) return;

    try {
      // Convert photo URI to File
      const response = await fetch(capturedPhotoUri);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      await upload({
        file,
        caption: '',
        description: '',
        locationName: locationName,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        altitude: coordinates?.altitude,
      });

      // Reset for next photo
      setCapturedPhotoUri(null);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleUploadAndReview = async () => {
    await handleUploadAndContinue();
    navigate(`/projects/${projectId}`);
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

      {/* Camera View */}
      {!capturedPhotoUri ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted relative">
          {/* Camera Placeholder - In production, this would be the actual camera viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-24 w-24 text-muted-foreground" />
          </div>

          {/* GPS Status Strip */}
          <div className="absolute bottom-32 left-0 right-0 bg-background/90 backdrop-blur-sm border-y border-border p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-foreground">
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
        <div className="flex-1 flex flex-col bg-muted">
          {/* Preview Image */}
          <div className="flex-1 flex items-center justify-center p-4">
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
          <div className="p-4 bg-card border-t border-border space-y-2">
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
    </div>
  );
}
