import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { OfficeDocumentPreviewModal } from '@/components/OfficeDocumentPreviewModal';
import type { UseDocumentPreviewReturn } from '@/hooks/useDocumentPreview';

interface DocumentPreviewModalsProps {
  preview: UseDocumentPreviewReturn; // Pass the entire hook return
}

export function DocumentPreviewModals({ preview }: DocumentPreviewModalsProps) {
  return (
    <>
      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={preview.pdfOpen}
        onOpenChange={preview.setPdfOpen}
        pdfUrl={preview.pdfUrl || ''}
        fileName={preview.pdfFileName}
      />

      {/* Receipt Preview Modal */}
      {preview.receiptOpen && preview.receiptUrl && (
        <ReceiptPreviewModal
          open={preview.receiptOpen}
          onOpenChange={preview.setReceiptOpen}
          receiptUrl={preview.receiptUrl}
        />
      )}

      {/* Office Document Preview */}
      <OfficeDocumentPreviewModal
        open={preview.officeOpen}
        onOpenChange={preview.setOfficeOpen}
        fileUrl={preview.officeUrl || ''}
        fileName={preview.officeFileName}
        fileType={preview.officeFileType}
      />

      {/* Image Lightbox */}
      {preview.imageOpen && preview.imageUrl && (
        <div
          id="image-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => preview.setImageOpen(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10 min-h-[44px] min-w-[44px]"
            onClick={() => preview.setImageOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={preview.imageUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain touch-manipulation"
            style={{
              touchAction: 'pan-x pan-y pinch-zoom',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}

      {/* Video Lightbox */}
      {preview.videoOpen && preview.videoUrl && (
        <div
          id="video-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => preview.setVideoOpen(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10 min-h-[44px] min-w-[44px]"
            onClick={() => preview.setVideoOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <video
            src={preview.videoUrl}
            className="max-h-[90vh] max-w-[90vw]"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
