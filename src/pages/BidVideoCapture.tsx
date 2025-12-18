import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, MapPin, Clock, Check, RotateCcw, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuickCaptionModal } from '@/components/QuickCaptionModal';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { formatFileSize, getVideoDuration } from '@/utils/videoUtils';
import { isWebPlatform, isIOSDevice } from '@/utils/platform';
import { convertMovToM4a } from '@/utils/movToM4a';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';

export default function BidVideoCapture() {
  const { id: bidId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { startRecording, isRecording } = useVideoCapture();
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { upload, isUploading, progress } = useBidMediaUpload();
  const { transcribe, isTranscribing, error: transcriptionError } = useAudioTranscription();
  const { reverseGeocode } = useReverseGeocode();
  
  const [capturedVideo, setCapturedVideo] = useState<{
    path?: string;
    webPath?: string;
    format: string;
  } | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [videoCaption, setVideoCaption] = useState('');
  const [locationName, setLocationName] = useState<string>('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState(false);
  const [isIOS] = useState(isIOSDevice());
  const [captureCount, setCaptureCount] = useState(0);

  useEffect(() => {
    // Refresh GPS on mount
    getLocation();
  }, []);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (coordinates) {
      reverseGeocode(coordinates.latitude, coordinates.longitude).then((result) => {
        if (result) {
          setLocationName(result.shortName);
        } else {
          setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
        }
      });
    }
  }, [coordinates, reverseGeocode]);

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
      const newCaptureCount = captureCount + 1;
      setCaptureCount(newCaptureCount);
      
      setCapturedVideo(video);
      setGpsAccuracy(location?.accuracy || null);
      
      // Auto-transcribe video directly (OpenAI Whisper supports video formats)
      setIsAutoTranscribing(true);
      try {
        console.log('🎬 Fetching video from path:', video.webPath);
        const response = await fetch(video.webPath || '');
        console.log('✅ Fetch response:', response.ok, response.status);
        
        if (response.ok) {
          let blob = await response.blob();
          console.log('✅ Video blob created:', {
            size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
            type: blob.type
          });
          
          // Convert iOS MOV to M4A for Whisper compatibility
          let mimeType = blob.type || `video/${video.format}`;
          if (blob.type.includes('video/quicktime')) {
            toast.info('Converting video for transcription...', { duration: 3000 });
            try {
              const converted = await convertMovToM4a(blob);
              blob = converted.blob;
              mimeType = converted.mime;
              console.log('✅ MOV converted to M4A');
            } catch (conversionError) {
              console.error('❌ Conversion failed:', conversionError);
              toast.error('Video conversion failed', {
                description: 'Transcription may not work properly',
              });
            }
          }
          
          const file = new File([blob], `video.${mimeType.split('/')[1]}`, { type: mimeType });
          console.log('🎤 Transcribing video file:', file.name, file.type);
          
          // Convert File to base64 for transcription
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]); // Remove data:audio/... prefix
            };
            reader.readAsDataURL(file);
          });
          
          const audioBase64 = await base64Promise;
          const transcript = await transcribe(audioBase64, mimeType);
          
          if (transcript) {
            setVideoCaption(transcript);
            const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
            toast.success(`Audio transcribed (${wordCount} word${wordCount !== 1 ? 's' : ''})`);
          } else {
            toast.info('No speech detected in video');
          }
        }
      } catch (error) {
        console.error('❌ Transcription error:', error);
        toast.error('Transcription failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsAutoTranscribing(false);
      }
    } else if (window.top !== window.self) {
      toast.error('Camera blocked in embedded view', {
        description: 'Open app in a new tab to use camera',
      });
    }
  };

  const handleUploadAndContinue = async () => {
    if (!capturedVideo || !bidId) return;

    try {
      const response = await fetch(capturedVideo.webPath || '');
      if (!response.ok) {
        throw new Error('Failed to fetch video file');
      }

      const blob = await response.blob();
      const fileSizeMB = blob.size / (1024 * 1024);

      // Warn for large files
      if (fileSizeMB > 50) {
        toast.warning(`Large video: ${fileSizeMB.toFixed(1)}MB`, {
          description: 'Upload may take several minutes',
          duration: 5000,
        });
      }

      const takenAt = new Date().toISOString();
      const file = new File([blob], `video-${Date.now()}.${capturedVideo.format}`, {
        type: `video/${capturedVideo.format}`
      });

      // Get video duration from the blob
      const duration = await getVideoDuration(file);

      await upload({
        bid_id: bidId,
        file,
        caption: videoCaption || undefined,
        duration: duration || undefined,
        // GPS and location metadata
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        altitude: coordinates?.altitude,
        location_name: locationName || undefined,
        // Capture metadata
        taken_at: takenAt,
        device_model: navigator.userAgent || undefined,
        upload_source: 'camera',
      });

      // Show success toast
      const wordCount = videoCaption ? videoCaption.split(/\s+/).filter(w => w.length > 0).length : 0;
      toast.success(
        videoCaption
          ? `Video uploaded with caption (${wordCount} word${wordCount !== 1 ? 's' : ''})`
          : 'Video uploaded without caption'
      );

      // Reset for next video
      setCapturedVideo(null);
      setVideoCaption('');
      setGpsAccuracy(null);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload video');
    }
  };

  const handleSaveCaption = (caption: string) => {
    setVideoCaption(caption);
    setShowCaptionModal(false);
    toast.success('Caption saved - ready to upload');
  };

  const handleDiscard = () => {
    setCapturedVideo(null);
    setVideoCaption('');
    setGpsAccuracy(null);
    toast.info('Video discarded');
  };

  const handleGoBack = () => {
    navigate(`/branch-bids/${bidId}`);
  };

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
          <div className="text-sm font-medium">Bid Video Capture</div>
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
            {gpsAccuracy && (
              <Badge variant="outline" className="text-xs">
                ±{gpsAccuracy.toFixed(0)}m
              </Badge>
            )}
          </div>

          {!capturedVideo ? (
            /* Capture State */
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <Video className="h-20 w-20 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Capture Video</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Record videos with GPS location and automatic audio transcription
                </p>
              </div>
              
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={isRecording}
                className="w-48 h-16 text-lg"
              >
                <Video className="h-6 w-6 mr-2" />
                {isRecording ? 'Recording...' : 'Record Video'}
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
              {/* Video Preview */}
              <div className="flex-1 rounded-lg overflow-hidden bg-black relative">
                <video
                  src={capturedVideo.webPath}
                  controls
                  className="w-full h-full object-contain"
                  playsInline
                />
                {gpsAccuracy && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    ±{gpsAccuracy.toFixed(0)}m
                  </div>
                )}
              </div>

              {/* Transcription Status */}
              {isAutoTranscribing && (
                <Alert>
                  <Mic className="h-4 w-4 animate-pulse" />
                  <AlertDescription>
                    Transcribing audio from video...
                  </AlertDescription>
                </Alert>
              )}

              {/* Caption Section */}
              <div className="space-y-2">
                {videoCaption && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          Caption {isAutoTranscribing ? '(transcribing...)' : ''}
                        </div>
                        <div className="text-sm">{videoCaption}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCaptionModal(true)}
                        disabled={isAutoTranscribing}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}

                {!videoCaption && !isAutoTranscribing && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCaptionModal(true)}
                    className="w-full"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Add Caption
                  </Button>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && progress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading video...</span>
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
                  disabled={isUploading || isAutoTranscribing}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                <Button
                  onClick={handleUploadAndContinue}
                  disabled={isUploading || isAutoTranscribing}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload & Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Caption Modal */}
        <QuickCaptionModal
          photo={{ file_url: '', caption: videoCaption } as any}
          open={showCaptionModal}
          onClose={() => setShowCaptionModal(false)}
          onSave={handleSaveCaption}
        />
      </div>
    </ErrorBoundary>
  );
}

