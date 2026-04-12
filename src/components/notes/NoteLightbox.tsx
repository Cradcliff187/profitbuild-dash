import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';

interface NoteLightboxProps {
  enlargedImage: string | null;
  enlargedVideo: string | null;
  onCloseImage: () => void;
  onCloseVideo: () => void;
  pdfPreviewOpen: boolean;
  onPdfPreviewChange: (open: boolean) => void;
  pdfUrl: string | null;
  pdfFileName: string;
}

export function NoteLightbox({
  enlargedImage,
  enlargedVideo,
  onCloseImage,
  onCloseVideo,
  pdfPreviewOpen,
  onPdfPreviewChange,
  pdfUrl,
  pdfFileName,
}: NoteLightboxProps) {
  // Swipe to dismiss for image lightbox
  const {
    handleTouchStart: imageSwipeStart,
    handleTouchMove: imageSwipeMove,
    handleTouchEnd: imageSwipeEnd,
  } = useSwipeGesture({
    onSwipeLeft: onCloseImage,
    onSwipeRight: onCloseImage,
    minSwipeDistance: 50,
  });

  // Swipe to dismiss for video lightbox
  const {
    handleTouchStart: videoSwipeStart,
    handleTouchMove: videoSwipeMove,
    handleTouchEnd: videoSwipeEnd,
  } = useSwipeGesture({
    onSwipeLeft: onCloseVideo,
    onSwipeRight: onCloseVideo,
    minSwipeDistance: 50,
  });

  // Attach touch listeners to image lightbox
  useEffect(() => {
    const container = document.getElementById('image-lightbox-container');
    if (!container) return;

    const start = imageSwipeStart as EventListener;
    const move = imageSwipeMove as EventListener;
    const end = imageSwipeEnd as EventListener;
    container.addEventListener('touchstart', start);
    container.addEventListener('touchmove', move);
    container.addEventListener('touchend', end);

    return () => {
      container.removeEventListener('touchstart', start);
      container.removeEventListener('touchmove', move);
      container.removeEventListener('touchend', end);
    };
  }, [imageSwipeStart, imageSwipeMove, imageSwipeEnd, enlargedImage]);

  // Attach touch listeners to video lightbox
  useEffect(() => {
    const container = document.getElementById('video-lightbox-container');
    if (!container) return;

    const start = videoSwipeStart as EventListener;
    const move = videoSwipeMove as EventListener;
    const end = videoSwipeEnd as EventListener;
    container.addEventListener('touchstart', start);
    container.addEventListener('touchmove', move);
    container.addEventListener('touchend', end);

    return () => {
      container.removeEventListener('touchstart', start);
      container.removeEventListener('touchmove', move);
      container.removeEventListener('touchend', end);
    };
  }, [videoSwipeStart, videoSwipeMove, videoSwipeEnd, enlargedVideo]);

  return (
    <>
      {/* Image Lightbox */}
      {enlargedImage && (
        <div
          id="image-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={onCloseImage}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10"
            onClick={onCloseImage}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={enlargedImage}
            alt="Enlarged note attachment"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video Lightbox */}
      {enlargedVideo && (
        <div
          id="video-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={onCloseVideo}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10"
            onClick={onCloseVideo}
          >
            <X className="h-5 w-5" />
          </Button>
          <video
            src={enlargedVideo}
            className="max-h-[90vh] max-w-[90vw]"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* PDF Preview */}
      <PdfPreviewModal
        open={pdfPreviewOpen}
        onOpenChange={onPdfPreviewChange}
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
      />
    </>
  );
}
