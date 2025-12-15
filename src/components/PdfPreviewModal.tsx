import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob?: Blob | null;
  pdfUrl?: string | null;
  fileName: string;
}

export function PdfPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  pdfUrl,
  fileName,
}: PdfPreviewModalProps) {
  const isMobile = useIsMobile();
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    // Prefer direct URL over blob (more reliable, avoids browser security restrictions)
    if (pdfUrl) {
      setObjectUrl(pdfUrl);
      setIframeLoaded(false);
      setLoadError(false);
    } else if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      setIframeLoaded(false);
      setLoadError(false);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl('');
      setIframeLoaded(false);
      setLoadError(false);
    }
    
    // Timeout to hide loading after reasonable time (PDFs may load but not fire onLoad)
    const loadTimeout = setTimeout(() => {
      setIframeLoaded(true);
    }, 3000);
    
    return () => {
      clearTimeout(loadTimeout);
    };
  }, [pdfBlob, pdfUrl]);

  const handleDownload = async () => {
    if (!objectUrl) return;
    
    try {
      // If it's a direct URL, fetch it first to download
      if (pdfUrl || (!pdfBlob && objectUrl.startsWith('http'))) {
        const response = await fetch(objectUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // If it's already a blob URL, use it directly
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleOpenInNewTab = () => {
    if (objectUrl) {
      window.open(objectUrl, '_blank');
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
            {isDev && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Dev Mode)
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            PDF document preview
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2"> 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenInNewTab}
              disabled={!objectUrl}
            > 
              <ExternalLink className="h-4 w-4 mr-2" /> 
              Open in New Tab
            </Button>
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
        
        <div className="flex-1 overflow-hidden bg-muted/20 flex flex-col relative"> 
          {objectUrl ? ( 
            <>
              <div className="w-full h-full relative bg-white">
                <iframe 
                  key="pdf-iframe"
                  src={`${objectUrl}#toolbar=1`}
                  title={fileName} 
                  className="absolute inset-0 w-full h-full border-0"
                  style={{ minHeight: '100%' }}
                  onLoad={() => {
                    setIframeLoaded(true);
                    setLoadError(false);
                  }}
                  onError={() => {
                    setLoadError(true);
                    setIframeLoaded(false);
                  }}
                />
                
                {/* Loading indicator - hide after timeout or onLoad */}
                {!iframeLoaded && !loadError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Loading PDF...</p>
                    </div>
                  </div>
                )}
                
                {/* Error fallback */}
                {loadError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 z-20 bg-background">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Unable to display PDF</p>
                      <p className="text-xs text-muted-foreground">Use the buttons above to open or download</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <Button onClick={handleOpenInNewTab} size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                      <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
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
