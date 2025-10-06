import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { generateMediaReportPDF } from '@/utils/mediaReportPdfGenerator';
import type { ProjectMedia } from '@/types/project';

interface MediaReportBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
  selectedMedia: ProjectMedia[];
  onComplete: () => void;
}

export function MediaReportBuilderModal({
  open,
  onOpenChange,
  projectName,
  projectNumber,
  clientName,
  address,
  selectedMedia,
  onComplete,
}: MediaReportBuilderModalProps) {
  const [reportTitle, setReportTitle] = useState('Project Media Report');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const photoCount = selectedMedia.filter(m => m.file_type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.file_type === 'video').length;

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // Sort media by date (oldest to newest)
      const sortedMedia = [...selectedMedia].sort((a, b) => {
        const dateA = new Date(a.taken_at || a.created_at).getTime();
        const dateB = new Date(b.taken_at || b.created_at).getTime();
        return dateA - dateB;
      });

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Generate PDF
      const blob = await generateMediaReportPDF({
        projectName,
        projectNumber,
        clientName,
        address,
        mediaItems: sortedMedia,
        reportTitle,
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Generate filename
      const date = format(new Date(), 'yyyy-MM-dd');
      const safeProjectNumber = projectNumber.replace(/[^a-z0-9]/gi, '-');
      const filename = `${safeProjectNumber}-Media-Report-${selectedMedia.length}items-${date}.pdf`;

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`PDF generated successfully: ${selectedMedia.length} items`);
      onComplete();
      onOpenChange(false);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Media Report
          </DialogTitle>
          <DialogDescription>
            Create a professional PDF report with selected photos and videos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Preview Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selected Media</Label>
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{photoCount}</span>
                <span className="text-xs text-muted-foreground">photos</span>
              </div>
              <div className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{videoCount}</span>
                <span className="text-xs text-muted-foreground">videos</span>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {selectedMedia.length} total items
              </Badge>
            </div>

            {/* Thumbnail Preview */}
            <ScrollArea className="h-24 w-full rounded-lg border">
              <div className="flex gap-2 p-2">
                {selectedMedia.map((item) => (
                  <div key={item.id} className="relative flex-shrink-0">
                    <div className="h-16 w-16 rounded overflow-hidden bg-muted">
                      {item.file_type === 'image' ? (
                        <img
                          src={item.file_url}
                          alt={item.caption || 'Media'}
                          className="h-full w-full object-cover"
                        />
                      ) : item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.caption || 'Video'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <VideoIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {item.file_type === 'video' && (
                      <Badge className="absolute bottom-0 right-0 text-xs h-4 px-1 bg-black/80 text-white border-0">
                        <VideoIcon className="h-2 w-2" />
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Configuration Section */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="report-title" className="text-sm">Report Title</Label>
              <Input
                id="report-title"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Project Media Report"
                disabled={isGenerating}
                className="h-9"
              />
            </div>

            {/* Project Info Preview */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project:</span>
                <span className="font-medium">{projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number:</span>
                <span className="font-medium">{projectNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{clientName}</span>
              </div>
              {address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating PDF...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Processing {selectedMedia.length} items, please wait...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || selectedMedia.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
