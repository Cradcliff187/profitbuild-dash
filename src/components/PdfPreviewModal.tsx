import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName: string;
}

export function PdfPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  fileName,
}: PdfPreviewModalProps) {
  const isMobile = useIsMobile();
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBlob]);

  const handleDownload = () => {
    if (!objectUrl) return;
    
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('PDF downloaded');
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0",
          isMobile 
            ? "fixed inset-0 h-screen w-screen max-w-none rounded-none" 
            : "max-w-4xl h-[90vh]"
        )}
      >
        <DialogHeader className={cn("border-b", isMobile ? "px-3 pt-3 pb-2" : "px-4 pt-4 pb-2")}>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="truncate">{fileName}</span>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!objectUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto overflow-x-hidden bg-muted/20">
          {objectUrl ? (
            <div className="flex flex-col items-center py-2 px-2">
              <Document
                file={objectUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-96 gap-4 p-8">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium">Unable to load PDF</p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Instead
                    </Button>
                  </div>
                }
              >
                <div className="w-full max-w-full overflow-hidden flex justify-center">
                  <Page
                    pageNumber={pageNumber}
                    width={isMobile ? Math.min(window.innerWidth - 32, 600) : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-lg"
                    loading={
                      <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    }
                  />
                </div>
              </Document>
              
              {numPages > 1 && (
                <div className={cn("flex items-center gap-3 mt-4", isMobile && "gap-2")}>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className={cn(isMobile && "h-12 w-12 p-0")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className={cn(isMobile && "h-12 w-12 p-0")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className={cn("border-t", isMobile ? "px-3 py-3 pb-safe" : "px-4 py-3")}>
          <Button 
            variant="outline" 
            size={isMobile ? "default" : "sm"}
            onClick={() => onOpenChange(false)}
            className={cn(isMobile && "w-full")}
          >
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
