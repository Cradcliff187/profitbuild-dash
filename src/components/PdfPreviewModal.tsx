import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [objectUrl, setObjectUrl] = useState<string>('');

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
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
        
        <div className="flex-1 overflow-hidden">
          {objectUrl ? (
            <object
              data={objectUrl}
              type="application/pdf"
              className="w-full h-full"
              aria-label="PDF Preview"
            >
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Unable to display PDF preview</p>
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  Your browser doesn't support inline PDF viewing. Please download the file to view it.
                </p>
                <Button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = fileName;
                    a.click();
                    toast.success('PDF downloaded');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </object>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className="px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
