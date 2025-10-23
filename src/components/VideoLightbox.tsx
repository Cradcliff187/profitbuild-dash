import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Clock, Download, Trash2, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ErrorBoundary from '@/components/ui/error-boundary';
import { QuickCaptionModal } from './QuickCaptionModal';
import { MediaCommentsList } from './MediaCommentsList';
import { MediaCommentForm } from './MediaCommentForm';
import { deleteProjectMedia, updateMediaMetadata } from '@/utils/projectMedia';
import { formatFileSize } from '@/utils/videoUtils';
import { toast } from 'sonner';
import type { ProjectMedia } from '@/types/project';

interface VideoLightboxProps {
  video: ProjectMedia;
  allVideos: ProjectMedia[];
  onClose: () => void;
  onNavigate: (video: ProjectMedia) => void;
}

export function VideoLightbox({ video, allVideos, onClose, onNavigate }: VideoLightboxProps) {
  const [currentVideo, setCurrentVideo] = useState(video);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentIndex = allVideos.findIndex(v => v.id === currentVideo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allVideos.length - 1;

  useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevious) handlePrevious();
      if (e.key === 'ArrowRight' && hasNext) handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrevious, hasNext]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevVideo = allVideos[currentIndex - 1];
      setCurrentVideo(prevVideo);
      onNavigate(prevVideo);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextVideo = allVideos[currentIndex + 1];
      setCurrentVideo(nextVideo);
      onNavigate(nextVideo);
    }
  };

  const handleSaveCaption = async (caption: string) => {
    const { error } = await updateMediaMetadata(currentVideo.id, { caption });
    
    if (error) {
      toast.error('Failed to update caption');
      return;
    }

    setCurrentVideo({ ...currentVideo, caption });
    setShowCaptionModal(false);
    toast.success('Caption updated');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await deleteProjectMedia(currentVideo.id);
    
    if (error) {
      toast.error('Failed to delete video');
      setIsDeleting(false);
      return;
    }

    toast.success('Video deleted');
    setShowDeleteDialog(false);
    
    // Navigate to next video or close if none
    if (hasNext) {
      handleNext();
    } else if (hasPrevious) {
      handlePrevious();
    } else {
      onClose();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentVideo.file_url;
    link.download = currentVideo.file_name;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col overscroll-contain">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-white">
            <div className="text-sm font-medium">
              {currentVideo.caption || 'Untitled Video'}
            </div>
            <div className="text-xs text-white/60">
              {currentIndex + 1} of {allVideos.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="relative max-w-5xl w-full">
          <video
            controls
            autoPlay
            className="w-full max-h-[70vh] rounded-lg bg-black"
            src={currentVideo.file_url}
          >
            Your browser does not support video playback.
          </video>

          {/* Navigation Buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Panel */}
      <div className="flex-shrink-0 bg-black/50 backdrop-blur border-t border-white/10 p-4 overflow-y-auto max-h-[40vh] overscroll-contain">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10 text-white p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Caption</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCaptionModal(true)}
                  className="text-white hover:bg-white/10 h-7 px-2"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
              <p className="text-sm text-white/80">
                {currentVideo.caption || 'No caption'}
              </p>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white p-4">
            <div className="space-y-2 text-sm">
              {currentVideo.latitude && currentVideo.longitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-white/60" />
                  <div>
                    <div className="text-white/60 text-xs">Location</div>
                    <a
                      href={`https://www.google.com/maps?q=${currentVideo.latitude},${currentVideo.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {currentVideo.latitude.toFixed(6)}, {currentVideo.longitude.toFixed(6)}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/60" />
                <div>
                  <div className="text-white/60 text-xs">Recorded</div>
                  <div>{format(new Date(currentVideo.created_at), 'PPp')}</div>
                </div>
              </div>

              <div className="text-white/60 text-xs">
                Size: {formatFileSize(currentVideo.file_size)}
              </div>
            </div>
          </Card>

          {/* Comments Section */}
          <Card className="bg-white/5 border-white/10 text-white p-4 md:col-span-2">
            <div className="text-sm font-medium mb-2">Comments</div>
            <MediaCommentsList mediaId={currentVideo.id} />
            <MediaCommentForm mediaId={currentVideo.id} />
          </Card>
        </div>
      </div>

      {/* Caption Modal */}
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
                  Close
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
          photo={currentVideo}
          open={showCaptionModal}
          onClose={() => setShowCaptionModal(false)}
          onSave={handleSaveCaption}
        />
      </ErrorBoundary>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Video?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {currentVideo.caption && (
                <p className="font-medium text-foreground">
                  {currentVideo.caption}
                </p>
              )}
              <p>This video will be permanently removed from the project and cannot be recovered.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}