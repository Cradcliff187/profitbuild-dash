import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Clock, ExternalLink, CheckCircle, FileText, Film, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingContent } from '@/types/training';
import { useMyTraining } from '@/hooks/useTrainingAssignments';
import { getVideoEmbedUrl, getTrainingFileUrl } from '@/utils/trainingStorage';
import { toast } from 'sonner';

export default function TrainingViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, markComplete, refresh } = useMyTraining();
  
  const [content, setContent] = useState<TrainingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Find if user has completed this
  const myItem = items.find(i => i.content.id === id);
  const isCompleted = myItem?.status === 'completed';

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      if (!id) return;
      
      setIsLoading(true);
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
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        toast.error('Failed to load training content');
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [id]);

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          );
        }
        return (
          <div className="w-full">
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={content.title}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
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
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading presentation...</p>
            </div>
          );
        }
        // Use Google Docs Viewer for PowerPoint
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return (
          <div className="w-full">
            <iframe
              src={googleViewerUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={content.title}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
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
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/training')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Training
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon()}
                <Badge variant={isCompleted ? 'default' : 'secondary'}>
                  {isCompleted ? 'Completed' : content.content_type.replace('_', ' ')}
                </Badge>
                {content.is_required && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
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
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={() => setShowCompleteDialog(true)}>
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
