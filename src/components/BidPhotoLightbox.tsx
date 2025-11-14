import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { BidMedia } from '@/types/bid';
import { deleteBidMedia } from '@/utils/bidMedia';
import { toast } from 'sonner';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useQueryClient } from '@tanstack/react-query';

interface BidPhotoLightboxProps {
  photo: BidMedia;
  allPhotos: BidMedia[];
  onClose: () => void;
  onNavigate: (photo: BidMedia) => void;
  bidId?: string;
}

export function BidPhotoLightbox({ photo, allPhotos, onClose, onNavigate, bidId }: BidPhotoLightboxProps) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevious) onNavigate(allPhotos[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(allPhotos[currentIndex + 1]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrevious, hasNext, onClose, onNavigate, allPhotos]);


  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeGesture({
    onSwipeLeft: () => hasNext && onNavigate(allPhotos[currentIndex + 1]),
    onSwipeRight: () => hasPrevious && onNavigate(allPhotos[currentIndex - 1]),
    minSwipeDistance: 50
  });

  useEffect(() => {
    const container = document.getElementById('bid-lightbox-container');
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBidMedia(photo.id);
    
    if (result.success) {
      toast.success('Photo deleted');
      onClose();
      if (bidId) {
        queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
      }
    } else {
      toast.error('Failed to delete photo');
      setIsDeleting(false);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div id="bid-lightbox-container" className="fixed inset-0 bg-background z-50 flex flex-col overscroll-contain">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
            <X className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {allPhotos.length}
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Photo */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted relative">
          <img
            src={photo.file_url}
            alt="Bid photo"
            className="max-h-full max-w-full object-contain"
          />

          {/* Navigation Controls */}
          {hasPrevious && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg"
              onClick={() => onNavigate(allPhotos[currentIndex - 1])}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg"
              onClick={() => onNavigate(allPhotos[currentIndex + 1])}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(photo.created_at), 'MMM d, yyyy · h:mm a')}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Photo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This photo will be permanently removed from the bid and cannot be recovered.
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
    </>
  );
}

