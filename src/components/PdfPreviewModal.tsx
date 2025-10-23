import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, ChevronLeft, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { isIOSDevice, isIOSSafari } from '@/utils/platform';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

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
  const [dataUrl, setDataUrl] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [contentLoaded, setContentLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [showFallback, setShowFallback] = useState<boolean>(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      setContentLoaded(false);
      setLoadError(false);
      setShowFallback(false);
      
      // For iOS devices, create a data URL as fallback
      if (isMobile && isIOSDevice()) {
        const reader = new FileReader();
        reader.onload = () => {
          setDataUrl(reader.result as string);
        };
        reader.readAsDataURL(pdfBlob);
      }
      
      // Start fallback timer for mobile
      if (isMobile) {
        fallbackTimerRef.current = setTimeout(() => {
          setShowFallback(true);
        }, 2000);
      }
      
      return () => {
        URL.revokeObjectURL(url);
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        setDataUrl('');
      };
    } else {
      setObjectUrl('');
      setDataUrl('');
      setContentLoaded(false);
      setLoadError(false);
      setShowFallback(false);
    }
  }, [pdfBlob, isMobile]);

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

  const handleOpenInViewer = () => {
    const src = dataUrl || objectUrl;
    if (src) {
      window.open(src, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0",
          isMobile 
            ? "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none !rounded-none !m-0" 
            : "max-w-4xl h-[90vh]"
        )}
      >
        <DialogHeader className={cn("border-b", isMobile ? "px-3 pt-3 pb-2" : "px-4 pt-4 pb-2")}> 
          <DialogTitle className="flex items-center gap-2 text-sm"> 
            <FileText className="h-4 w-4" /> 
            <span className="truncate">{fileName}</span> 
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isMobile ? "Mobile full-screen preview of the generated PDF report" : "Desktop preview with page navigation"}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2"> 
            {isMobile && objectUrl && ( 
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenInViewer} 
              > 
                <ExternalLink className="h-4 w-4 mr-2" /> 
                Open 
              </Button> 
            )} 
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
        
        <div className="flex-1 overflow-hidden bg-muted/20 flex flex-col"> 
          {objectUrl ? ( 
            isMobile ? ( 
              <div className="w-full h-full min-h-[500px] relative bg-white"> 
                {/* Loading spinner */}
                {!contentLoaded && !showFallback && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* Fallback UI */}
                {showFallback && !contentLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 z-20 bg-background">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Preview not supported in this viewer</p>
                      <p className="text-xs text-muted-foreground">Use the buttons below to view or download</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <Button onClick={handleOpenInViewer} size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in viewer
                      </Button>
                      <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* iOS Safari: use embed with data URL, others: use iframe */}
                {isIOSDevice() && dataUrl ? (
                  <embed 
                    type="application/pdf"
                    src={dataUrl} 
                    title={`${fileName} preview`} 
                    className="absolute inset-0 w-full h-full border-0" 
                    onLoad={() => {
                      console.log('[PdfPreview] Embed loaded successfully');
                      setContentLoaded(true);
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    }}
                    onError={(e) => {
                      console.error('[PdfPreview] Embed failed to load', e);
                      setLoadError(true);
                    }}
                  />
                ) : (
                  <iframe 
                    src={objectUrl} 
                    title={`${fileName} preview`} 
                    className="absolute inset-0 w-full h-full border-0" 
                    onLoad={() => {
                      console.log('[PdfPreview] Iframe loaded successfully');
                      setContentLoaded(true);
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    }}
                    onError={(e) => {
                      console.error('[PdfPreview] Iframe failed to load', e);
                      setLoadError(true);
                    }}
                  /> 
                )}
              </div> 
            ) : (
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
                      width={undefined} 
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
                  <div className="flex items-center gap-3 mt-4"> 
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevPage} 
                      disabled={pageNumber <= 1} 
                    > 
                      <ChevronLeft className="h-5 w-5" /> 
                    </Button> 
                    <span className="text-xs text-muted-foreground"> 
                      Page {pageNumber} of {numPages} 
                    </span> 
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToNextPage} 
                      disabled={pageNumber >= numPages} 
                    > 
                      <ChevronRight className="h-5 w-5" /> 
                    </Button> 
                  </div> 
                )} 
              </div> 
            ) 
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
