import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Clock, ExternalLink, CheckCircle, FileText, Film, Download, AlertCircle } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { supabase } from '@/integrations/supabase/client';
import { TrainingContent } from '@/types/training';
import { useMyTraining } from '@/hooks/useTrainingAssignments';
import { getVideoEmbedUrl, getTrainingFileUrl, downloadTrainingFileBlob } from '@/utils/trainingStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { isIOSDevice, isIOSPWA } from '@/utils/platform';
import { toast } from 'sonner';

export default function TrainingViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, markComplete, refresh } = useMyTraining();
  const isMobile = useIsMobile();
  
  const [content, setContent] = useState<TrainingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Mobile-specific state
  const [showDownloadFallback, setShowDownloadFallback] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Find if user has completed this
  const myItem = items.find(i => i.content.id === id);
  const isCompleted = myItem?.status === 'completed';

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      if (!id) return;
      
      setIsLoading(true);
      // Reset mobile-specific state
      setContentLoaded(false);
      setLoadError(false);
      setShowDownloadFallback(false);
      setDataUrl(null);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      
      try {
        const { data, error } = await supabase
          .from('training_content')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setContent(data);

        // Get signed URL for documents/presentations
        if (data.storage_path && (data.content_type === 'document' || data.content_type === 'presentation')) {
          const url = await getTrainingFileUrl(data.storage_path);
          setFileUrl(url);
          
          // Use Supabase SDK download to bypass CORS restrictions
          if (data.content_type === 'document' && data.storage_path) {
            try {
              const blob = await downloadTrainingFileBlob(data.storage_path);
              if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                  setDataUrl(reader.result as string);
                };
                reader.readAsDataURL(blob);
              }
            } catch (err) {
              console.error('Error creating data URL:', err);
            }
          }
          
          // Start fallback timer for mobile
          if (isMobile) {
            setContentLoaded(false);
            setLoadError(false);
            setShowDownloadFallback(false);
            
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
            }
            
            fallbackTimerRef.current = setTimeout(() => {
              setShowDownloadFallback(true);
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        toast.error('Failed to load training content');
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
    
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [id, isMobile]);

  // Handle mark complete
  const handleMarkComplete = async () => {
    if (!id) return;
    
    setIsCompleting(true);
    const success = await markComplete(id);
    setIsCompleting(false);
    
    if (success) {
      setShowCompleteDialog(false);
      await refresh();
      // Navigate back to My Training page after successful completion
      navigate('/training');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandedLoader size="md" message="Loading training content..." />
      </div>
    );
  }

  // Not found
  if (!content) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Training content not found</p>
        <Button variant="link" onClick={() => navigate('/training')}>
          ← Back to My Training
        </Button>
      </div>
    );
  }

  // Render content based on type
  const renderContent = () => {
    switch (content.content_type) {
      case 'video_link': {
        const embedUrl = getVideoEmbedUrl(content.content_url || '');
        if (!embedUrl) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Unable to embed this video</p>
              <Button onClick={() => window.open(content.content_url || '', '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Video in New Tab
              </Button>
            </div>
          );
        }
        return (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      case 'video_embed': {
        return (
          <div 
            className="aspect-video w-full"
            dangerouslySetInnerHTML={{ __html: content.embed_code || '' }}
          />
        );
      }

      case 'document': {
        if (!fileUrl) {
          return (
            <div className="text-center py-8">
              <BrandedLoader size="sm" message="Loading document..." />
            </div>
          );
        }
        
        const handleDownload = () => {
          window.open(fileUrl, '_blank');
        };
        
        const handleOpenInViewer = () => {
          const src = dataUrl || fileUrl;
          if (src) {
            window.open(src, '_blank');
          }
        };
        
        // Mobile: Download-first with optional viewer
        if (isMobile) {
          return (
            <div className="w-full space-y-3">
              {/* Download button - prominent on mobile */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleDownload} 
                  size={isMobile ? "default" : "sm"}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {dataUrl && (
                  <Button 
                    variant="outline" 
                    onClick={handleOpenInViewer}
                    size={isMobile ? "default" : "sm"}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Viewer
                  </Button>
                )}
              </div>
              
              {/* Fallback UI if content fails to load */}
              {showDownloadFallback && !contentLoaded && (
                <div className="flex flex-col items-center justify-center gap-4 p-6 border rounded-lg bg-muted/20">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Preview not available</p>
                    <p className="text-xs text-muted-foreground">Use the download button above to view the PDF</p>
                  </div>
                </div>
              )}
              
              {/* PDF Viewer - iOS uses embed, others use iframe */}
              {!showDownloadFallback && (
                <div className="w-full relative bg-muted/20 rounded-lg border" style={{ height: '60vh', minHeight: '400px' }}>
                  {!contentLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/20">
                      <BrandedLoader size="sm" />
                    </div>
                  )}

                  {isIOSDevice() && dataUrl ? (
                    <embed
                      type="application/pdf"
                      src={dataUrl}
                      title={content.title}
                      className="absolute inset-0 w-full h-full rounded-lg border-0"
                      onLoad={() => {
                        setContentLoaded(true);
                        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                      }}
                      onError={() => {
                        setLoadError(true);
                        setShowDownloadFallback(true);
                      }}
                    />
                  ) : (
                    <iframe
                      src={fileUrl}
                      className="absolute inset-0 w-full h-full rounded-lg border-0"
                      title={content.title}
                      onLoad={() => {
                        setContentLoaded(true);
                        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                      }}
                      onError={() => {
                        setLoadError(true);
                        setShowDownloadFallback(true);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        }
        
        // Desktop: Viewer-first with download option
        return (
          <div className="w-full">
            <div className="w-full relative bg-muted/20 rounded-lg border" style={{ height: '70vh' }}>
              <iframe
                src={dataUrl || fileUrl}
                className="absolute inset-0 w-full h-full rounded-lg border-0"
                title={content.title}
              />
            </div>
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        );
      }

      case 'presentation': {
        if (!fileUrl) {
          return (
            <div className="text-center py-8">
              <BrandedLoader size="sm" message="Loading presentation..." />
            </div>
          );
        }
        
        const handleDownload = () => {
          window.open(fileUrl, '_blank');
        };
        
        // Use Google Docs Viewer for PowerPoint
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        
        // Mobile: Download-first (Google Docs Viewer unreliable on mobile)
        if (isMobile) {
          return (
            <div className="w-full space-y-3">
              {/* Download button - prominent on mobile */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleDownload} 
                  size={isMobile ? "default" : "sm"}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Presentation
                </Button>
                <p className="text-xs text-muted-foreground text-center px-2">
                  For best experience on mobile, download and open in PowerPoint or Keynote
                </p>
              </div>
              
              {/* Fallback UI if Google Docs Viewer fails */}
              {showDownloadFallback && !contentLoaded && (
                <div className="flex flex-col items-center justify-center gap-4 p-6 border rounded-lg bg-muted/20">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Preview not available on mobile</p>
                    <p className="text-xs text-muted-foreground">Please download the presentation to view it</p>
                  </div>
                </div>
              )}
              
              {/* Google Docs Viewer - optional on mobile, with fallback */}
              {!showDownloadFallback && (
                <div className="w-full relative bg-muted/20 rounded-lg border" style={{ height: '60vh', minHeight: '400px' }}>
                  {!contentLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/20">
                      <BrandedLoader size="sm" />
                    </div>
                  )}

                  <iframe
                    src={googleViewerUrl}
                    className="absolute inset-0 w-full h-full rounded-lg border-0"
                    title={content.title}
                    onLoad={() => {
                      setContentLoaded(true);
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    }}
                    onError={() => {
                      setLoadError(true);
                      setShowDownloadFallback(true);
                    }}
                  />
                </div>
              )}
            </div>
          );
        }
        
        // Desktop: Google Docs Viewer with download option
        return (
          <div className="w-full">
            <div className="w-full relative bg-muted/20 rounded-lg border" style={{ height: '70vh' }}>
              <iframe
                src={googleViewerUrl}
                className="absolute inset-0 w-full h-full rounded-lg border-0"
                title={content.title}
              />
            </div>
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Presentation
              </Button>
            </div>
          </div>
        );
      }

      case 'external_link': {
        return (
          <div className="text-center py-12">
            <ExternalLink className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">This training opens in a new window</p>
            <p className="text-muted-foreground mb-6">
              Click the button below to access the training content
            </p>
            <Button size="lg" onClick={() => window.open(content.content_url || '', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Training Content
            </Button>
          </div>
        );
      }

      default:
        return <p className="text-muted-foreground">Unknown content type</p>;
    }
  };

  // Content type icon
  const getTypeIcon = () => {
    switch (content.content_type) {
      case 'video_link':
      case 'video_embed':
        return <Film className="h-5 w-5" />;
      case 'document':
      case 'presentation':
        return <FileText className="h-5 w-5" />;
      case 'external_link':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-5xl mx-auto">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size={isMobile ? "default" : "sm"} 
        onClick={() => navigate('/training')}
        className={isMobile ? "min-h-[44px]" : ""}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Training
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {getTypeIcon()}
                <Badge variant={isCompleted ? 'default' : 'secondary'}>
                  {isCompleted ? 'Completed' : content.content_type.replace('_', ' ')}
                </Badge>
                {content.is_required && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl break-words">{content.title}</CardTitle>
              {content.description && (
                <CardDescription className="mt-2">{content.description}</CardDescription>
              )}
            </div>
            
            {content.duration_minutes && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {content.duration_minutes} min
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Complete button */}
      {!isCompleted && (
        <div className="flex justify-center pt-3 sm:pt-4">
          <Button 
            size={isMobile ? "default" : "lg"} 
            onClick={() => setShowCompleteDialog(true)}
            className={isMobile ? "w-full min-h-[44px]" : ""}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}

      {/* Completion confirmation dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Training as Complete?</DialogTitle>
            <DialogDescription>
              By clicking confirm, you acknowledge that you have completed this training: "{content.title}"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={isCompleting}>
              {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
