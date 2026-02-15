import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Mic, MessageSquare, Pencil, Trash2, Mail, Printer, Settings2, Eye, ArrowLeft, RefreshCw } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { estimatePDFSize } from '@/utils/pdfHelpers';
import { saveReportToProjectDocuments } from '@/utils/reportStorageUtils';
import { VoiceCaptionModal } from './VoiceCaptionModal';
import type { ProjectMedia } from '@/types/project';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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

type ModalStep = 'configure' | 'preview';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Modal step
  const [step, setStep] = useState<ModalStep>('configure');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Config state
  const [reportTitle, setReportTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportSummary, setReportSummary] = useState('');
  const [showVoiceSummaryModal, setShowVoiceSummaryModal] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState(clientName || '');

  // Report display options (persist across modal open/close within session)
  const [showComments, setShowComments] = useState(true);
  const [showGps, setShowGps] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showNumbering, setShowNumbering] = useState(true);
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

  // Delivery state (used from preview step)
  const [isDelivering, setIsDelivering] = useState(false);

  // Cached report — generated and saved once, reused for download + email
  const [savedReport, setSavedReport] = useState<{
    pdfBlob: Blob;
    signedUrl: string;
    fileName: string;
    documentId: string;
  } | null>(null);

  // Set dynamic default title on open, reset transient state on close
  useEffect(() => {
    if (open) {
      setReportTitle(`${projectNumber} ${projectName}`);
    } else {
      setReportTitle('');
      setReportSummary('');
      setShowVoiceSummaryModal(false);
      setIsSummaryExpanded(false);
      setIsOptionsExpanded(false);
      setStep('configure');
      setPreviewHtml(null);
      setIsDelivering(false);
      setSavedReport(null);
    }
  }, [open, projectNumber, projectName]);

  // Clear cached report when preview changes (user regenerated with new options)
  useEffect(() => {
    setSavedReport(null);
  }, [previewHtml]);

  const photoCount = selectedMedia.filter(m => m.file_type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.file_type === 'video').length;

  const reportOptions = {
    showComments,
    showGps,
    showTimestamps,
    showNumbering,
    imageSize,
  };

  // ── Shared helpers ──────────────────────────────────────

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

    const pdfBlob: Blob = await html2pdf()
      .set(pdfOptions)
      .from(htmlString)
      .outputPdf('blob');

    return pdfBlob;
  };

  const printHtmlReport = (html: string) => {
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

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const images = iframeDoc.querySelectorAll('img');
    const imagePromises = Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    );

    Promise.all(imagePromises).then(() => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe);
        });
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000);
      }, 500);
    });
  };

  // ── Ensure report is generated & saved (once) ──────────

  const ensureReportSaved = async () => {
    if (savedReport) return savedReport;

    const projectId = selectedMedia[0]?.project_id;
    if (!projectId) throw new Error('Project ID not found');

    console.log('📄 Generating PDF...');
    const pdfBlob = await generatePdfBlob(previewHtml!);
    console.log(`✅ PDF generated: ${(pdfBlob.size / 1024).toFixed(0)}KB`);

    console.log('💾 Saving report to project documents...');
    const result = await saveReportToProjectDocuments(
      pdfBlob,
      projectId,
      projectNumber,
      reportTitle || `${projectName} - Media Report`,
      selectedMedia.length
    );

    const cached = {
      pdfBlob,
      signedUrl: result.signedUrl,
      fileName: result.fileName,
      documentId: result.documentId,
    };
    setSavedReport(cached);
    return cached;
  };

  // ── Step 1: Generate Preview ────────────────────────────

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const mediaIds = selectedMedia.map(m => m.id);
      const projectId = selectedMedia[0]?.project_id;

      if (!projectId) {
        toast.error('Project ID not found');
        return;
      }

      console.log('🎨 Generating report preview...');

      const requestBody: Record<string, unknown> = {
        projectId,
        mediaIds,
        reportTitle: reportTitle || `${projectName} - Media Report`,
        format: 'story',
        summary: reportSummary.trim() || undefined,
        delivery: 'download', // always get HTML for preview
        options: reportOptions,
      };

      setGenerationProgress(selectedMedia.length * 0.3);

      const { data, error } = await supabase.functions.invoke(
        'generate-media-report',
        { body: requestBody }
      );

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      if (!data || typeof data !== 'string') {
        throw new Error('Invalid HTML response from server');
      }

      setGenerationProgress(selectedMedia.length);
      setPreviewHtml(data);
      setStep('preview');

      console.log('✅ Preview ready');
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

  // ── Step 2: Deliver from preview ────────────────────────

  const handlePrint = () => {
    if (!previewHtml) return;
    printHtmlReport(previewHtml);
    toast.success('Print dialog opened', {
      description: 'Choose "Save as PDF" to save a copy, or print directly.',
    });
  };

  const handleDownload = async () => {
    if (!previewHtml) return;
    setIsDelivering(true);

    try {
      const { pdfBlob, fileName } = await ensureReportSaved();

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success('Report saved & downloaded!', {
        description: `Saved to project documents • ${selectedMedia.length} items`
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Download failed:', error);
      toast.error('Failed to download report', { description: (error as Error).message });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleEmail = async () => {
    if (!previewHtml) return;
    if (!recipientEmail) {
      toast.error('Please enter a recipient email address');
      return;
    }

    setIsDelivering(true);

    try {
      const { signedUrl } = await ensureReportSaved();

      const projectId = selectedMedia[0]?.project_id;
      const mediaIds = selectedMedia.map(m => m.id);

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
          pdfDownloadUrl: signedUrl,
          mediaCount: selectedMedia.length,
          options: reportOptions,
        },
      });

      if (emailError) throw new Error(`Failed to send email: ${emailError.message}`);

      toast.success('Report emailed!', {
        description: `Sent to ${recipientEmail}`
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Email failed:', error);
      toast.error('Failed to email report', { description: (error as Error).message });
    } finally {
      setIsDelivering(false);
    }
  };

  // Write HTML into preview iframe when it mounts or html changes
  const writePreviewToIframe = useCallback(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  useEffect(() => {
    if (step === 'preview' && previewHtml) {
      // Small delay to ensure iframe is mounted
      const timer = setTimeout(writePreviewToIframe, 50);
      return () => clearTimeout(timer);
    }
  }, [step, previewHtml, writePreviewToIframe]);

  // ── Render ──────────────────────────────────────────────

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={step !== 'preview'}
        className={cn(
          "flex flex-col overflow-hidden",
          isMobile
            ? "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl pb-safe max-w-full w-full p-3 max-h-[90vh]"
            : step === 'preview'
              ? "max-w-4xl max-h-[92vh] p-6"
              : "max-w-2xl max-h-[85vh] p-6"
        )}
      >
        {/* ──────── PREVIEW STEP ──────── */}
        {step === 'preview' && previewHtml ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className={cn("flex items-center gap-2", isMobile && "text-base")}>
                  <Eye className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
                  Report Preview
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('configure')}
                  disabled={isDelivering}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Edit
                </Button>
              </div>
              <DialogDescription className={cn(isMobile && "text-xs")}>
                Review your report below, then print, download, or email it
              </DialogDescription>
            </DialogHeader>

            {/* Document Preview - iframe like training viewer */}
            <div className="flex-1 min-h-0">
              <div
                className="w-full relative bg-muted/20 rounded-lg border"
                style={{ height: isMobile ? '55vh' : '65vh' }}
              >
                <iframe
                  ref={iframeRef}
                  className="absolute inset-0 w-full h-full rounded-lg border-0"
                  title="Report Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Email fields (shown inline if needed) */}
            {recipientEmail === '' && (
              <div className={cn("flex gap-2 items-end", isMobile ? "flex-col" : "")}>
                <div className="flex-1">
                  <Label className={cn(isMobile ? "text-[10px]" : "text-xs")}>Recipient Email (for email delivery)</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                    disabled={isDelivering}
                  />
                </div>
                <div className="flex-1">
                  <Label className={cn(isMobile ? "text-[10px]" : "text-xs")}>Recipient Name</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Client name"
                    className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                    disabled={isDelivering}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <DialogFooter className={cn("flex gap-2", isMobile ? "flex-col" : "")}>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={isDelivering}
                size={isMobile ? "sm" : "default"}
              >
                <Printer className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isDelivering}
                size={isMobile ? "sm" : "default"}
              >
                <Download className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                {isDelivering ? 'Saving...' : 'Download PDF'}
              </Button>
              <Button
                onClick={handleEmail}
                disabled={isDelivering || !recipientEmail}
                size={isMobile ? "sm" : "default"}
              >
                <Mail className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                {isDelivering ? 'Sending...' : 'Email Report'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* ──────── CONFIGURE STEP ──────── */}
            <DialogHeader>
              <DialogTitle className={cn("flex items-center gap-2", isMobile && "text-base")}>
                <FileText className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
                Generate Media Report
              </DialogTitle>
              <DialogDescription className={cn(isMobile && "text-xs")}>
                Configure your report, then preview it before sending
              </DialogDescription>
            </DialogHeader>

            <div className={cn("flex-1 overflow-y-auto", isMobile ? "space-y-2" : "space-y-4")}>
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
                    placeholder={`${projectNumber} ${projectName}`}
                    disabled={isGenerating}
                    className={cn(isMobile ? "h-8 text-sm" : "h-9")}
                  />
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
                        Add a quick voice summary to appear at the top of your report (30-90 seconds recommended)
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

                {/* Report Options - Collapsible */}
                <div className={cn("border rounded-lg", isMobile ? "p-2" : "p-3")}>
                  <button
                    type="button"
                    onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-muted-foreground")} />
                      <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>
                        Report Options
                      </span>
                    </div>
                    <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                      {isOptionsExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {isOptionsExpanded && (
                    <div className={cn("space-y-3", isMobile ? "mt-2" : "mt-3")}>
                      {([
                        { label: 'Show Comments', description: 'Include team comments on photos', checked: showComments, onChange: setShowComments },
                        { label: 'Show GPS Coordinates', description: 'Display coordinates when no location name', checked: showGps, onChange: setShowGps },
                        { label: 'Show Timestamps', description: 'Display capture time for each photo', checked: showTimestamps, onChange: setShowTimestamps },
                        { label: 'Show Photo Numbers', description: 'Sequential numbering on each item', checked: showNumbering, onChange: setShowNumbering },
                      ] as const).map(({ label, description, checked, onChange }) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <Label className={cn("block", isMobile ? "text-xs" : "text-sm")}>{label}</Label>
                            <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>{description}</p>
                          </div>
                          <Switch
                            checked={checked}
                            onCheckedChange={onChange}
                            disabled={isGenerating}
                          />
                        </div>
                      ))}

                      <div className={cn(isMobile ? "space-y-1" : "space-y-1.5")}>
                        <Label className={cn(isMobile ? "text-xs" : "text-sm")}>Image Size</Label>
                        <div className="flex gap-2">
                          {(['small', 'medium', 'large'] as const).map((size) => (
                            <Button
                              key={size}
                              type="button"
                              variant={imageSize === size ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setImageSize(size)}
                              className="flex-1 capitalize"
                              disabled={isGenerating}
                            >
                              {size}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email fields (pre-fill so they're ready at preview step) */}
                <div className={cn("space-y-2")}>
                  <div>
                    <Label className={cn(isMobile ? "text-xs" : "text-sm")}>Recipient Email</Label>
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="client@example.com (optional — needed for email delivery)"
                      className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <Label className={cn(isMobile ? "text-xs" : "text-sm")}>Recipient Name</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Client name"
                      className={cn("mt-1", isMobile ? "h-8 text-xs" : "h-9")}
                      disabled={isGenerating}
                    />
                  </div>
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
                      Generating Preview...
                    </span>
                    <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                      {Math.round((generationProgress / selectedMedia.length) * 100)}%
                    </span>
                  </div>
                  <p className={cn("text-muted-foreground mt-2", isMobile ? "text-[10px]" : "text-xs")}>
                    Processing media items... Please keep this window open.
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
                onClick={handleGeneratePreview}
                disabled={isGenerating || selectedMedia.length === 0}
                size={isMobile ? "sm" : "default"}
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Generating... {Math.round((generationProgress / selectedMedia.length) * 100)}%
                  </>
                ) : (
                  <>
                    <Eye className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "mr-2")} />
                    Generate Preview ({selectedMedia.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
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
