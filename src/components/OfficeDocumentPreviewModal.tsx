import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OfficeDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType?: 'word' | 'excel' | 'powerpoint';
}

export const OfficeDocumentPreviewModal: React.FC<OfficeDocumentPreviewModalProps> = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  fileType,
}) => {
  const isMobile = useIsMobile();
  const [contentLoaded, setContentLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showDownloadFallback, setShowDownloadFallback] = useState(false);
  const contentLoadedRef = useRef(false);
  contentLoadedRef.current = contentLoaded;

  // Detect file type from extension if not provided
  const detectedFileType = fileType || (() => {
    const url = fileName.toLowerCase();
    if (url.includes('.doc') || url.includes('.docx')) return 'word';
    if (url.includes('.xls') || url.includes('.xlsx')) return 'excel';
    if (url.includes('.ppt') || url.includes('.pptx')) return 'powerpoint';
    return 'word'; // default
  })();

  const getAppName = () => {
    switch (detectedFileType) {
      case 'word': return 'Word';
      case 'excel': return 'Excel';
      case 'powerpoint': return 'PowerPoint or Keynote';
      default: return 'Office app';
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  // Google Docs Viewer URL
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  // Reset states when modal opens/closes
  useEffect(() => {
    if (open) {
      setContentLoaded(false);
      setLoadError(false);
      setShowDownloadFallback(false);
      
      // On mobile, show download fallback after 3 seconds if content hasn't loaded
      if (isMobile) {
        const fallbackTimer = setTimeout(() => {
          setShowDownloadFallback(true);
        }, 3000);
        return () => clearTimeout(fallbackTimer);
      }

      // On desktop, show download fallback after 10s if iframe hasn't loaded
      const loadTimeout = setTimeout(() => {
        if (!contentLoadedRef.current) {
          console.warn('Document preview timed out after 10s');
          setShowDownloadFallback(true);
        }
      }, 10000);
      return () => clearTimeout(loadTimeout);
    }
  }, [open, isMobile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0",
          isMobile 
            ? "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none !rounded-none !m-0" 
            : "max-w-5xl h-[90vh]"
        )}
      >
        <DialogHeader className={cn("border-b", isMobile ? "px-3 pt-3 pb-2" : "px-4 pt-4 pb-2")}>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Office document preview
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/20 flex flex-col relative">
          {isMobile ? (
            // Mobile: Download-first approach
            <div className="flex flex-col items-center justify-center gap-4 p-6 h-full">
              <div className="flex flex-col items-center gap-3 max-w-md">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Preview not available on mobile</p>
                  <p className="text-xs text-muted-foreground">
                    For best experience, download and open in {getAppName()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full mt-4">
                  <Button 
                    onClick={handleDownload} 
                    size="default"
                    className="w-full min-h-[44px]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download {detectedFileType === 'word' ? 'Document' : detectedFileType === 'excel' ? 'Spreadsheet' : 'Presentation'}
                  </Button>
                  <Button 
                    onClick={handleOpenInNewTab} 
                    variant="outline"
                    size="default"
                    className="w-full min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Desktop: Embedded viewer with download option
            <div className="w-full h-full relative bg-white">
              {!showDownloadFallback ? (
                <>
                  <iframe
                    src={googleViewerUrl}
                    title={fileName}
                    className="absolute inset-0 w-full h-full border-0"
                    onLoad={() => {
                      setContentLoaded(true);
                      setLoadError(false);
                    }}
                    onError={() => {
                      setLoadError(true);
                      setContentLoaded(false);
                    }}
                  />
                  
                  {/* Loading indicator */}
                  {!contentLoaded && !loadError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Loading document...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error fallback */}
                  {loadError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 z-20 bg-background">
                      <AlertCircle className="h-12 w-12 text-muted-foreground" />
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium">Unable to display document</p>
                        <p className="text-xs text-muted-foreground">Use the buttons below to download or open</p>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        <Button onClick={handleDownload} size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download Document
                        </Button>
                        <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-background">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Preview not available</p>
                    <p className="text-xs text-muted-foreground">Please download the document to view it</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button onClick={handleDownload} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                    <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className={cn("border-t flex items-center justify-end gap-2", isMobile ? "px-3 py-3 pb-safe" : "px-4 py-3")}>
          {!isMobile && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenInNewTab}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size={isMobile ? "default" : "sm"}
            onClick={() => onOpenChange(false)}
            className={cn(isMobile && "w-full")}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

