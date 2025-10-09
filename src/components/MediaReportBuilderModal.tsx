import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Loader2, Image as ImageIcon, Video as VideoIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { generateMediaReportPDF } from '@/utils/mediaReportPdfGenerator';
import { generatePDFFileName, estimatePDFSize } from '@/utils/pdfHelpers';
import type { ProjectMedia } from '@/types/project';

interface MediaComment {
  id: string;
  media_id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [aggregateComments, setAggregateComments] = useState(false);
  const [storyFormat, setStoryFormat] = useState(false);

  const photoCount = selectedMedia.filter(m => m.file_type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.file_type === 'video').length;

  const handleGeneratePDF = async (preview: boolean = false) => {
    setIsGenerating(true);
    setProgress({ current: 0, total: selectedMedia.length });

    try {
      // Sort by date for consistent ordering
      const sortedMedia = [...selectedMedia].sort((a, b) => {
        const dateA = new Date(a.taken_at || a.created_at).getTime();
        const dateB = new Date(b.taken_at || b.created_at).getTime();
        return dateA - dateB;
      });

      // Fetch all comments for selected media
      const mediaIds = sortedMedia.map(m => m.id);
      const { data: comments, error: commentsError } = await supabase
        .from('media_comments')
        .select(`
          id,
          media_id,
          comment_text,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .in('media_id', mediaIds)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Failed to fetch comments:', commentsError);
        toast.error('Failed to load comments for report');
      }

      // Group comments by media_id
      const commentsByMedia = new Map<string, MediaComment[]>();
      (comments || []).forEach((comment) => {
        if (!commentsByMedia.has(comment.media_id)) {
          commentsByMedia.set(comment.media_id, []);
        }
        commentsByMedia.get(comment.media_id)!.push(comment as MediaComment);
      });

      // Generate PDF with progress tracking
      const result = await generateMediaReportPDF({
        projectName,
        projectNumber,
        clientName,
        address,
        mediaItems: sortedMedia,
        reportTitle,
        comments: commentsByMedia,
        aggregateComments,
        storyFormat,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });

      const fileName = generatePDFFileName({
        projectName,
        projectNumber,
        itemCount: selectedMedia.length,
      });

      const url = URL.createObjectURL(result.blob);

      if (preview) {
        // Open in new tab for preview
        window.open(url, '_blank');
        toast.success('Preview opened in new tab');
      } else {
        // Auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast.success(`PDF generated: ${fileName}`);
      }

      URL.revokeObjectURL(url);

      // Show warning if any items failed
      if (result.stats.failed > 0) {
        toast.error(
          `${result.stats.failed} of ${result.stats.total} items failed to process`,
          {
            description: result.stats.failedItems.join(', ')
          }
        );
      }

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
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
                {selectedMedia.length} total • {estimatePDFSize(selectedMedia.length)}
              </Badge>
            </div>

            {/* Thumbnail Preview */}
            <ScrollArea className="h-24 w-full rounded-lg border">
              <div className="flex gap-2 p-2">
                {selectedMedia.slice(0, 30).map((item) => (
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
                {selectedMedia.length > 30 && (
                  <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{selectedMedia.length - 30}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Large Report Warning */}
          {selectedMedia.length > 50 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Large reports ({selectedMedia.length} items) may take several minutes to generate
                and could be {estimatePDFSize(selectedMedia.length)} or larger.
              </AlertDescription>
            </Alert>
          )}

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

            {/* Story Format Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="story-format"
                checked={storyFormat}
                onCheckedChange={(checked) => setStoryFormat(checked as boolean)}
                disabled={isGenerating}
              />
              <Label
                htmlFor="story-format"
                className="text-sm font-normal cursor-pointer"
              >
                Generate as Story Report (narrative timeline)
              </Label>
            </div>
            {storyFormat && (
              <div className="text-xs text-muted-foreground pl-6 -mt-1">
                Compact layout with time grouping, continuous flow, and narrative captions
              </div>
            )}

            {/* Comment Aggregation Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aggregate-comments"
                checked={aggregateComments}
                onCheckedChange={(checked) => setAggregateComments(checked as boolean)}
                disabled={isGenerating || storyFormat}
              />
              <Label
                htmlFor="aggregate-comments"
                className="text-sm font-normal cursor-pointer"
              >
                Aggregate all comments at end of report
              </Label>
            </div>
            {storyFormat && (
              <div className="text-xs text-muted-foreground pl-6 -mt-1">
                (Comments are inline in story format)
              </div>
            )}

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
                  <span className="font-medium truncate ml-2">{address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(new Date(), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating PDF...</span>
                <span className="font-medium">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground text-center">
                Processing {progress.current} of {progress.total} items...
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGeneratePDF(true)}
            disabled={isGenerating || selectedMedia.length === 0}
          >
            Preview
          </Button>
          <Button
            onClick={() => handleGeneratePDF(false)}
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
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
