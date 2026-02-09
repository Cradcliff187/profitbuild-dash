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
import { Download, ExternalLink, FileText, AlertCircle, Printer } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
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
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const handlePrint = () => {
    // Open in Google Viewer in new tab for printing
    const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}`;
    window.open(printUrl, '_blank');
    toast.info('Use Ctrl+P (or Cmd+P) to print, then select "Save as PDF"');
  };

  // Google Docs Viewer URL
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  // Reset states when modal opens/closes
  useEffect(() => {
    if (open) {
      setContentLoaded(false);
      setLoadError(false);
      setShowDownloadFallback(false);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      // On mobile, show download fallback after 2s if content hasn't loaded (align with training)
      if (isMobile) {
        fallbackTimerRef.current = setTimeout(() => {
          setShowDownloadFallback(true);
          fallbackTimerRef.current = null;
        }, 2000);
        return () => {
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        };
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
            // Mobile: Viewer-first with fallback (align with TrainingViewer presentation flow)
            <div className="flex flex-col p-4 gap-3 overflow-auto">
              {/* Top section: primary actions + helper text */}
              <div className="flex flex-col gap-2">
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
                <p className="text-xs text-muted-foreground text-center px-2">
                  For best experience on mobile, download and open in {getAppName()}
                </p>
              </div>

              {/* Fallback UI when viewer fails or times out */}
              {showDownloadFallback && !contentLoaded && (
                <div className="flex flex-col items-center justify-center gap-4 p-6 border rounded-lg bg-muted/20">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Preview not available on mobile</p>
                    <p className="text-xs text-muted-foreground">
                      For best experience, download and open in {getAppName()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    <Button onClick={handleDownload} size="default" className="w-full min-h-[44px]">
                      <Download className="h-4 w-4 mr-2" />
                      Download {detectedFileType === 'word' ? 'Document' : detectedFileType === 'excel' ? 'Spreadsheet' : 'Presentation'}
                    </Button>
                    <Button onClick={handleOpenInNewTab} variant="outline" size="default" className="w-full min-h-[44px]">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}

              {/* Viewer: Google Docs Viewer iframe (attempt first, fallback above when timer/error). Keep iframe visible once loaded even if timeout fired. */}
              {(!showDownloadFallback || contentLoaded) && (
                <div className="w-full relative bg-muted/20 rounded-lg border" style={{ height: '60vh', minHeight: '400px' }}>
                  {!contentLoaded && !loadError && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/20">
                      <BrandedLoader size="sm" message="Loading document..." />
                    </div>
                  )}
                  <iframe
                    src={googleViewerUrl}
                    title={fileName}
                    className="absolute inset-0 w-full h-full rounded-lg border-0"
                    onLoad={() => {
                      setContentLoaded(true);
                      setLoadError(false);
                      if (fallbackTimerRef.current) {
                        clearTimeout(fallbackTimerRef.current);
                        fallbackTimerRef.current = null;
                      }
                    }}
                    onError={() => {
                      setLoadError(true);
                      setShowDownloadFallback(true);
                    }}
                  />
                </div>
              )}
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
                      <BrandedLoader size="sm" message="Loading document..." />
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
                onClick={handlePrint}
                title="Print / Save as PDF"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
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

