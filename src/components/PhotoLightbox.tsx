import { useEffect } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, MapPin, Clock, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { ProjectMedia } from '@/types/project';
import { deleteProjectMedia } from '@/utils/projectMedia';
import { toast } from 'sonner';
import { useState } from 'react';

interface PhotoLightboxProps {
  photo: ProjectMedia;
  allPhotos: ProjectMedia[];
  onClose: () => void;
  onNavigate: (photo: ProjectMedia) => void;
}

export function PhotoLightbox({ photo, allPhotos, onClose, onNavigate }: PhotoLightboxProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

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

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProjectMedia(photo.id);
    
    if (result.success) {
      toast.success('Photo deleted');
      onClose();
    } else {
      toast.error('Failed to delete photo');
      setIsDeleting(false);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
            <X className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {allPhotos.length}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Photo */}
        <div className="flex-1 flex items-center justify-center bg-muted relative">
          <img
            src={photo.file_url}
            alt={photo.caption || 'Field photo'}
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
        <div className="p-4 border-t border-border bg-card space-y-3">
          {photo.caption && (
            <p className="text-sm text-foreground font-medium">{photo.caption}</p>
          )}
          {photo.description && (
            <p className="text-sm text-muted-foreground">{photo.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(new Date(photo.created_at), 'MMM d, yyyy · h:mm a')}</span>
            </div>
            
            {photo.latitude && photo.longitude && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                </span>
              </div>
            )}
            
            {photo.device_model && (
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                <span>{photo.device_model}</span>
              </div>
            )}
          </div>

          {photo.location_name && (
            <p className="text-xs text-muted-foreground">{photo.location_name}</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This photo will be permanently deleted from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
