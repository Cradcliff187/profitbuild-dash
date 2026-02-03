import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Mic, MessageSquare, Pencil, Trash2, Mail, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { estimatePDFSize } from '@/utils/pdfHelpers';
import { saveReportToProjectDocuments } from '@/utils/reportStorageUtils';
import { VoiceCaptionModal } from './VoiceCaptionModal';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportSummary, setReportSummary] = useState('');
  const [showVoiceSummaryModal, setShowVoiceSummaryModal] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'download' | 'email'>('print');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState(clientName || '');

  // Reset state on modal close
  useEffect(() => {
    if (!open) {
      setReportSummary('');
      setShowVoiceSummaryModal(false);
      setIsSummaryExpanded(false);
    }
  }, [open]);

  const photoCount = selectedMedia.filter(m => m.file_type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.file_type === 'video').length;

  /**
   * Generate PDF blob without triggering download.
   * Used by both Download and Email delivery paths.
   */
  const generatePdfBlob = async (htmlString: string): Promise<Blob> => {
    const pdfOptions = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      image: { type: 'jpeg' as const, quality: 0.95 },
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
        compress: true,
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break',
        after: '.page-break-after',
        avoid: ['img', '.no-break'],
      },
    };

    // .outputPdf('blob') returns the PDF as a Blob WITHOUT triggering download
    const pdfBlob: Blob = await html2pdf()
      .set(pdfOptions)
      .from(htmlString)
      .outputPdf('blob');

    return pdfBlob;
  };

  /**
   * Render HTML in a hidden iframe and trigger the browser's print dialog.
   * The user can then print to paper or choose "Save as PDF".
   */
  const printHtmlReport = (html: string) => {
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error('Could not open print preview');
      document.body.removeChild(iframe);
      return;
    }

    // Write the report HTML into the iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for images to load before printing
    const images = iframeDoc.querySelectorAll('img');
    const imagePromises = Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Don't block print on failed images
          }
        })
    );

    Promise.all(imagePromises).then(() => {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        iframe.contentWindow?.print();

        // Clean up iframe after print dialog closes
        // The onafterprint event fires when the dialog closes (print or cancel)
        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe);
        });

        // Fallback cleanup if afterprint doesn't fire (some mobile browsers)
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000); // 60 second fallback
      }, 500);
    });
  };

  const handleGenerateHTMLReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const mediaIds = selectedMedia.map(m => m.id);
      const projectId = selectedMedia[0]?.project_id;

      if (!projectId) {
        toast.error('Project ID not found');
        return;
      }

      if (deliveryMethod === 'email' && !recipientEmail) {
        toast.error('Please enter a recipient email address');
        return;
      }

      console.log(`🎨 Generating report (${deliveryMethod} delivery)...`);
      
      // Build request
      // For email delivery: first request gets HTML (use 'download'), second request sends email
      const requestBody: Record<string, unknown> = {
        projectId,
        mediaIds,
        reportTitle: reportTitle || `${projectName} - Media Report`,
        format: 'story',
        summary: reportSummary.trim() || undefined,
        delivery: deliveryMethod === 'email' ? 'download' : deliveryMethod,
      };

      setGenerationProgress(selectedMedia.length * 0.3);

      const { data, error } = await supabase.functions.invoke(
        'generate-media-report',
        { body: requestBody }
      );

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      setGenerationProgress(selectedMedia.length * 0.7);

      // ── Handle each delivery method ──────────────────────

      if (deliveryMethod === 'email') {
        // Email path: generate blob → save to project documents → send email with signed URL
        if (!data || typeof data !== 'string') {
          throw new Error('Invalid HTML response from server');
        }

        // 1. Generate PDF blob
        console.log('📄 Generating PDF for email...');
        const pdfBlob = await generatePdfBlob(data);
        console.log(`✅ PDF generated: ${(pdfBlob.size / 1024).toFixed(0)}KB`);

        setGenerationProgress(selectedMedia.length * 0.8);

        // 2. Save to project documents — gets both publicUrl and signedUrl
        console.log('💾 Saving report to project documents...');
        const { signedUrl, fileName } = await saveReportToProjectDocuments(
          pdfBlob,
          projectId,
          projectNumber,
          reportTitle || `${projectName} - Media Report`,
          selectedMedia.length
        );
        console.log('✅ Report saved to project documents');

        setGenerationProgress(selectedMedia.length * 0.9);

        // 3. Send email WITH the download URL
        console.log('📧 Sending email with download link...');
        const { error: emailError } = await supabase.functions.invoke('generate-media-report', {
          body: {
            projectId,
            mediaIds,
            reportTitle: reportTitle || `${projectName} - Media Report`,
            format: 'story',
            summary: reportSummary.trim() || undefined,
            delivery: 'email',
            recipientEmail,
            recipientName,
            pdfDownloadUrl: signedUrl,     // ← NEW: signed URL for 30-day access
            mediaCount: selectedMedia.length,
          },
        });

        if (emailError) throw new Error(`Failed to send email: ${emailError.message}`);

        toast.success('Report saved & emailed!', {
          description: `Saved to project documents • Sent to ${recipientEmail}`
        });
      } else if (deliveryMethod === 'print') {
        // Print path: render HTML in iframe → window.print()
        if (!data || typeof data !== 'string') {
          throw new Error('Invalid HTML response from server');
        }

        printHtmlReport(data);

        toast.success('Print dialog opened', {
          description: 'Choose "Save as PDF" to save a copy, or print directly.',
        });
      } else {
        // Download path: generate blob → save to project documents → trigger download
        if (!data || typeof data !== 'string') {
          throw new Error('Invalid HTML response from server');
        }

        // 1. Generate PDF blob (NOT auto-download)
        console.log('📄 Generating PDF...');
        const pdfBlob = await generatePdfBlob(data);
        console.log(`✅ PDF generated: ${(pdfBlob.size / 1024).toFixed(0)}KB`);

        setGenerationProgress(selectedMedia.length * 0.8);

        // 2. Save to project documents (Storage + DB record)
        console.log('💾 Saving report to project documents...');
        const { fileName } = await saveReportToProjectDocuments(
          pdfBlob,
          projectId,
          projectNumber,
          reportTitle || `${projectName} - Media Report`,
          selectedMedia.length
        );
        console.log('✅ Report saved to project documents');

        setGenerationProgress(selectedMedia.length * 0.95);

        // 3. Trigger browser download from the blob
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        console.log('✅ PDF downloaded');

        toast.success('Report saved & downloaded!', {
          description: `Saved to project documents • ${selectedMedia.length} items`
        });
      }

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      toast.error('Failed to generate report', {
        description: (error as Error).message,
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
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
            Generate a compact Story Timeline report with photos organized chronologically by date
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
              <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                📋 Compact timeline format showing multiple photos per page with inline comments
              </p>
            </div>

            {/* Report Summary Section - Collapsible */}
            <div className={cn("border rounded-lg", isMobile ? "p-2" : "p-3")}>
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-muted-foreground")} />
                  <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>
                    Report Summary (Optional) {reportSummary && '✓'}
                  </span>
                </div>
                <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                  {isSummaryExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isSummaryExpanded && (
                <div className={cn("space-y-2", isMobile ? "mt-2" : "mt-3")}>
                  <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                    📝 Add a quick voice summary to appear at the top of your report (30-90 seconds recommended)
                  </p>

                  {!reportSummary ? (
                    <Button
                      type="button"
                      onClick={() => setShowVoiceSummaryModal(true)}
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className="w-full"
                      disabled={isGenerating}
                    >
                      <Mic className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                      Add Voice Summary
                    </Button>
                  ) : (
                    <div className={cn("space-y-2")}>
                      <div className={cn("bg-muted/50 rounded-lg border", isMobile ? "p-2" : "p-3")}>
                        <p className={cn("text-foreground whitespace-pre-wrap", isMobile ? "text-xs" : "text-sm")}>
                          {reportSummary}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowVoiceSummaryModal(true)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setReportSummary('')}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <p className={cn("text-muted-foreground text-right", isMobile ? "text-[10px]" : "text-xs")}>
                        {reportSummary.length} characters
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delivery Method */}
            <div className={cn(isMobile ? "space-y-1.5" : "space-y-3")}>
              <Label className={cn(isMobile ? "text-xs" : "text-sm")}>
                Delivery Method
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={deliveryMethod === 'print' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeliveryMethod('print')}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  {isMobile ? 'Print' : 'Print / Save PDF'}
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === 'download' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeliveryMethod('download')}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeliveryMethod('email')}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              </div>

              {deliveryMethod === 'print' && (
                <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                  Opens your device's print dialog. Choose "Save as PDF" to save a copy,
                  or print directly.
                </p>
              )}

              {deliveryMethod === 'email' && (
                <div className={cn("space-y-2 pt-2")}>
                  <div>
                    <Label className={cn(isMobile ? "text-[10px]" : "text-xs")}>Recipient Email *</Label>
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <Label className={cn(isMobile ? "text-[10px]" : "text-xs")}>Recipient Name</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Client name"
                      className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              )}
            </div>

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

          {/* Generation Progress */}
          {isGenerating && (
            <div className={cn("border rounded-lg", isMobile ? "p-2" : "p-3")}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>
                  Generating Report...
                </span>
                <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                  {Math.round((generationProgress / selectedMedia.length) * 100)}%
                </span>
              </div>
              <p className={cn("text-muted-foreground mt-2", isMobile ? "text-[10px]" : "text-xs")}>
                ⏳ Processing media items... Please keep this window open.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={cn("flex gap-2", isMobile ? "flex-col" : "")}>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            size={isMobile ? "sm" : "default"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateHTMLReport}
            disabled={
              isGenerating ||
              selectedMedia.length === 0 ||
              (deliveryMethod === 'email' && !recipientEmail)
            }
            size={isMobile ? "sm" : "default"}
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating... {Math.round((generationProgress / selectedMedia.length) * 100)}%
              </>
            ) : (
              <>
                {deliveryMethod === 'print' ? (
                  <Printer className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                ) : deliveryMethod === 'email' ? (
                  <Mail className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                ) : (
                  <Download className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                )}
                {deliveryMethod === 'print'
                  ? `Print Report (${selectedMedia.length})`
                  : deliveryMethod === 'email'
                    ? `Email Report (${selectedMedia.length})`
                    : `Download PDF (${selectedMedia.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Voice Summary Modal */}
    <VoiceCaptionModal
      open={showVoiceSummaryModal}
      onClose={() => setShowVoiceSummaryModal(false)}
      onCaptionReady={(summary) => {
        setReportSummary(summary);
        setShowVoiceSummaryModal(false);
        toast.success('Summary added successfully');
      }}
      imageUrl={undefined}
    />
    </>
  );
}
