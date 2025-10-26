import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Loader2, Image as ImageIcon, Video as VideoIcon, AlertTriangle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { generateMediaReportPDF } from '@/utils/mediaReportPdfGenerator';
import { generatePDFFileName, estimatePDFSize } from '@/utils/pdfHelpers';
import { PdfPreviewModal } from './PdfPreviewModal';
import type { ProjectMedia } from '@/types/project';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
  const [reportTitle, setReportTitle] = useState('Project Media Report');
  const [reportFormat, setReportFormat] = useState<'detailed' | 'story'>('detailed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [aggregateComments, setAggregateComments] = useState(false);
  const [storyFormat, setStoryFormat] = useState(false);
  const [photoSize, setPhotoSize] = useState<'standard' | 'large' | 'full'>('standard');
  const [layoutType, setLayoutType] = useState<'single' | 'grid_2x2' | 'story'>('single');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const photoCount = selectedMedia.filter(m => m.file_type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.file_type === 'video').length;

  const handleGenerateHTMLReport = async () => {
    setIsGenerating(true);
    setProgress({ current: 0, total: selectedMedia.length });

    try {
      const mediaIds = selectedMedia.map(m => m.id);
      const projectId = selectedMedia[0]?.project_id;

      if (!projectId) {
        toast.error('Project ID not found');
        return;
      }

      console.log('🎨 Generating HTML from edge function...');
      
      // Step 1: Get HTML from edge function
      const { data: htmlString, error } = await supabase.functions.invoke('generate-media-report', {
        body: {
          projectId,
          mediaIds,
          reportTitle: reportTitle || `${projectName} - Media Report`,
          format: reportFormat,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate HTML');
      }

      if (!htmlString || typeof htmlString !== 'string') {
        throw new Error('Invalid HTML response from server');
      }

      console.log(`✅ HTML received (${(htmlString.length / 1024).toFixed(1)}KB)`);
      console.log('🎯 Converting HTML to PDF in browser...');

      // Update progress indicator
      setProgress({ current: 1, total: 2 });

      // Step 2: Convert HTML to PDF client-side
      const fileName = `${projectNumber}_Professional_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: fileName,
        image: { 
          type: 'jpeg' as const, 
          quality: 0.95
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break',
          after: '.page-break-after',
          avoid: ['img', '.no-break']
        }
      };

      // Convert and auto-download
      await html2pdf()
        .set(options)
        .from(htmlString)
        .save();

      console.log('✅ PDF generated and downloaded');
      
      toast.success('Professional PDF report generated!', {
        description: `${selectedMedia.length} items • ${fileName}`
      });
      
      onComplete();
      onOpenChange(false);

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      toast.error('Failed to generate report', {
        description: (error as Error).message
      });
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

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
        photoSize,
        layoutType,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });

      const fileName = generatePDFFileName({
        projectName,
        projectNumber,
        itemCount: selectedMedia.length,
      });

      if (preview) {
        // Store blob and open preview modal
        setPreviewBlob(result.blob);
        setShowPreviewModal(true);
        onOpenChange(false); // Close builder modal before showing preview
        toast.success('Preview ready');
      } else {
        // Auto-download
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`PDF generated: ${fileName}`);
        onComplete();
        onOpenChange(false);
      }

      // Show warning if any items failed
      if (result.stats.failed > 0) {
        toast.error(
          `${result.stats.failed} of ${result.stats.total} items failed to process`,
          {
            description: result.stats.failedItems.join(', ')
          }
        );
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col overflow-hidden",
          isMobile 
            ? "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl pb-safe max-w-full w-full p-3 max-h-[85vh]" 
            : "max-w-2xl max-h-[85vh] p-6"
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isMobile && "text-base")}>
            <FileText className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
            Generate Media Report
          </DialogTitle>
          <DialogDescription className={cn(isMobile && "text-xs")}>
            Create a professional PDF report with selected photos and videos
          </DialogDescription>
        </DialogHeader>

        <div className={cn("flex-1 overflow-hidden", isMobile ? "space-y-2" : "space-y-4")}>
          {/* Preview Section */}
          <div className={cn(isMobile ? "space-y-1.5" : "space-y-2")}>
            <Label className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Selected Media</Label>
            <div className={cn("flex items-center gap-4 bg-muted rounded-lg", isMobile ? "p-2" : "p-3")}>
              <div className="flex items-center gap-2">
                <ImageIcon className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-muted-foreground")} />
                <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{photoCount}</span>
                <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>photos</span>
              </div>
              <div className="flex items-center gap-2">
                <VideoIcon className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-muted-foreground")} />
                <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{videoCount}</span>
                <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>videos</span>
              </div>
              <Badge variant="secondary" className={cn("ml-auto", isMobile && "text-[10px] px-1.5 py-0.5")}>
                {selectedMedia.length} total • {estimatePDFSize(selectedMedia.length)}
              </Badge>
            </div>

            {/* Thumbnail Preview */}
            <ScrollArea className={cn("w-full rounded-lg border", isMobile ? "h-16" : "h-24")}>
              <div className={cn("flex p-2", isMobile ? "gap-1.5" : "gap-2")}>
                {selectedMedia.slice(0, 30).map((item) => (
                  <div key={item.id} className="relative flex-shrink-0">
                    <div className={cn("rounded overflow-hidden bg-muted", isMobile ? "h-12 w-12" : "h-16 w-16")}>
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
                      <Badge className={cn("absolute bottom-0 right-0 bg-black/80 text-white border-0", isMobile ? "text-[8px] h-3 px-0.5" : "text-xs h-4 px-1")}>
                        <VideoIcon className={cn(isMobile ? "h-1.5 w-1.5" : "h-2 w-2")} />
                      </Badge>
                    )}
                  </div>
                ))}
                {selectedMedia.length > 30 && (
                  <div className={cn("rounded bg-muted flex items-center justify-center text-muted-foreground", isMobile ? "h-12 w-12 text-[10px]" : "h-16 w-16 text-xs")}>
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
          <div className={cn(isMobile ? "space-y-2" : "space-y-3")}>
            <div className={cn(isMobile ? "space-y-1" : "space-y-2")}>
              <Label htmlFor="report-title" className={cn(isMobile ? "text-xs" : "text-sm")}>Report Title</Label>
              <Input
                id="report-title"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Project Media Report"
                disabled={isGenerating}
                className={cn(isMobile ? "h-8 text-sm" : "h-9")}
              />
            </div>

            {/* Report Format Selector */}
            <div className={cn(isMobile ? "space-y-1" : "space-y-2")}>
              <Label htmlFor="report-format" className={cn(isMobile ? "text-xs" : "text-sm")}>Report Format</Label>
              <Select 
                value={reportFormat} 
                onValueChange={(value) => setReportFormat(value as 'detailed' | 'story')}
                disabled={isGenerating}
              >
                <SelectTrigger id="report-format" className={cn(isMobile ? "h-8 text-sm" : "h-9")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Detailed (Client Deliverable)</span>
                      <span className="text-xs text-muted-foreground">One photo per page, full metadata</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="story">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Story Timeline (Internal Review)</span>
                      <span className="text-xs text-muted-foreground">4-6 photos per page, compact layout</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                {reportFormat === 'detailed' 
                  ? '📄 Professional format with full-page photos and complete metadata. Best for client presentations and formal documentation.'
                  : '📋 Compact timeline format showing multiple photos per page with inline comments. Best for daily reviews and field coordination.'}
              </p>
            </div>

            {/* Story Format Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="story-format"
                checked={storyFormat}
                onCheckedChange={(checked) => setStoryFormat(checked as boolean)}
                disabled={isGenerating}
                className={cn(isMobile && "h-4 w-4")}
              />
              <Label
                htmlFor="story-format"
                className={cn("font-normal cursor-pointer", isMobile ? "text-xs" : "text-sm")}
              >
                Generate as Story Report (narrative timeline)
              </Label>
            </div>
            {storyFormat && (
              <div className={cn("text-muted-foreground pl-6 -mt-1", isMobile ? "text-[10px]" : "text-xs")}>
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
                className={cn(isMobile && "h-4 w-4")}
              />
              <Label
                htmlFor="aggregate-comments"
                className={cn("font-normal cursor-pointer", isMobile ? "text-xs" : "text-sm")}
              >
                Aggregate all comments at end of report
              </Label>
            </div>
            {storyFormat && (
              <div className={cn("text-muted-foreground pl-6 -mt-1", isMobile ? "text-[10px]" : "text-xs")}>
                (Comments are inline in story format)
              </div>
            )}

            {/* Photo Size Control */}
            <div className={cn(isMobile ? "space-y-1" : "space-y-2")}>
              <Label htmlFor="photo-size" className={cn(isMobile ? "text-xs" : "text-sm")}>Photo Size</Label>
              <Select value={photoSize} onValueChange={(value) => setPhotoSize(value as 'standard' | 'large' | 'full')} disabled={isGenerating}>
                <SelectTrigger id="photo-size" className={cn(isMobile ? "h-8 text-sm" : "h-9")}>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (4×6) - Recommended</SelectItem>
                  <SelectItem value="large">Large (5×7)</SelectItem>
                  <SelectItem value="full">Full Page (8×10)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Layout Type Control - Desktop Only */}
            {!isMobile && (
              <div className="space-y-2">
                <Label htmlFor="layout-type" className="text-sm">Layout Style</Label>
                <Select value={layoutType} onValueChange={(value) => setLayoutType(value as 'single' | 'grid_2x2' | 'story')} disabled={isGenerating}>
                  <SelectTrigger id="layout-type" className="h-9">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">One Photo Per Page</SelectItem>
                    <SelectItem value="grid_2x2">Grid (2×2) - Coming Soon</SelectItem>
                    <SelectItem value="story">Timeline Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Project Info Preview */}
            <div className={cn("bg-muted/50 rounded-lg space-y-1", isMobile ? "p-2 text-[10px]" : "p-3 text-xs")}>
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
            <div className={cn(isMobile ? "space-y-1.5" : "space-y-2")}>
              <div className={cn("flex items-center justify-between", isMobile ? "text-xs" : "text-sm")}>
                <span className="text-muted-foreground">Generating PDF...</span>
                <span className="font-medium">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
                className={cn(isMobile ? "h-1.5" : "h-2")} 
              />
              <p className={cn("text-muted-foreground text-center", isMobile ? "text-[10px]" : "text-xs")}>
                Processing {progress.current} of {progress.total} items...
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={cn("gap-2", isMobile && "flex-col")}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            size={isMobile ? "sm" : "default"}
            className={cn(isMobile && "w-full order-4")}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerateHTMLReport}
            disabled={isGenerating || selectedMedia.length === 0}
            size={isMobile ? "sm" : "default"}
            className={cn(isMobile && "w-full order-2")}
          >
            {isGenerating ? (
              <>
                <Loader2 className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2 animate-spin")} />
                Generating...
              </>
            ) : (
              <>
                <FileText className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                Generate Professional Report
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGeneratePDF(true)}
            disabled={isGenerating || selectedMedia.length === 0}
            size={isMobile ? "sm" : "default"}
            className={cn(isMobile && "w-full order-2")}
          >
            Preview
          </Button>
          <Button
            onClick={() => handleGeneratePDF(false)}
            disabled={isGenerating || selectedMedia.length === 0}
            size={isMobile ? "sm" : "default"}
            className={cn(isMobile && "w-full order-1")}
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

        <PdfPreviewModal
          open={showPreviewModal}
          onOpenChange={(open) => {
            setShowPreviewModal(open);
            if (!open) {
              setPreviewBlob(null);
            }
          }}
          pdfBlob={previewBlob}
          fileName={generatePDFFileName({
            projectName,
            projectNumber,
            itemCount: selectedMedia.length,
          })}
        />
    </>
  );
}
