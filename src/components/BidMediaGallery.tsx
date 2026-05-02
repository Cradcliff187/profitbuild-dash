import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Image as ImageIcon, Video as VideoIcon, Trash2, Grid3x3, List, Download, Play } from 'lucide-react';
import { useBidMedia } from '@/hooks/useBidMedia';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { BidPhotoLightbox } from './BidPhotoLightbox';
import { VideoLightbox } from './VideoLightbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { BrandedLoader } from './ui/branded-loader';
import { formatFileSize, formatDuration } from '@/utils/videoUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BidMedia } from '@/types/bid';

type ViewMode = 'grid' | 'list';
type MediaTab = 'all' | 'photos' | 'videos';

interface BidMediaGalleryProps {
  bidId: string;
}

export function BidMediaGallery({ bidId }: BidMediaGalleryProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { media: allMedia, isLoading } = useBidMedia(bidId);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [selectedMedia, setSelectedMedia] = useState<BidMedia | null>(null);
  // Mobile locks to grid (Google Photos / Apple Photos pattern). The list
  // toggle and its companion icon button compete with the filter pills for
  // horizontal space on a 393px viewport — hiding it lets "Videos (N)"
  // breathe regardless of count length, and grid is the better mobile default.
  const [viewModeState, setViewModeState] = useState<ViewMode>('grid');
  const viewMode: ViewMode = isMobile ? 'grid' : viewModeState;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<BidMedia | null>(null);

  // Filter media by tab
  const filteredMedia = useMemo(() => {
    if (activeTab === 'photos') return allMedia.filter(m => m.file_type === 'image');
    if (activeTab === 'videos') return allMedia.filter(m => m.file_type === 'video');
    return allMedia;
  }, [allMedia, activeTab]);

  // Separate photos and videos for lightbox navigation
  const allPhotos = useMemo(() => allMedia.filter(m => m.file_type === 'image'), [allMedia]);
  const allVideos = useMemo(() => allMedia.filter(m => m.file_type === 'video'), [allMedia]);

  // Count media types
  const photoCount = allPhotos.length;
  const videoCount = allVideos.length;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (media: BidMedia) => {
      // Delete from storage
      const bucket = media.file_type === 'document' ? 'bid-documents' : 'bid-media';
      const path = media.file_url.split(`${bucket}/`)[1];
      
      if (path) {
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .remove([path]);
        
        if (storageError) console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('bid_media')
        .delete()
        .eq('id', media.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
      toast.success('Media deleted successfully');
      setShowDeleteDialog(false);
      setMediaToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete media', {
        description: error.message,
      });
    },
  });

  const handleDeleteClick = (media: BidMedia) => {
    setMediaToDelete(media);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (mediaToDelete) {
      deleteMutation.mutate(mediaToDelete);
    }
  };

  const handleMediaClick = (media: BidMedia) => {
    setSelectedMedia(media);
  };

  const handleDownload = async (media: BidMedia) => {
    try {
      const response = await fetch(media.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download media');
    }
  };

  if (isLoading) {
    return <BrandedLoader message="Loading media..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header Controls — stack tabs and view-mode toggle on narrow viewports
          so "Videos (N)" is not clipped by the right-aligned icon buttons. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaTab)} className="w-full sm:w-auto min-w-0">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="all" className="whitespace-nowrap">
              All ({allMedia.length})
            </TabsTrigger>
            <TabsTrigger value="photos" className="whitespace-nowrap">
              <ImageIcon className="h-4 w-4 mr-1" />
              Photos ({photoCount})
            </TabsTrigger>
            <TabsTrigger value="videos" className="whitespace-nowrap">
              <VideoIcon className="h-4 w-4 mr-1" />
              Videos ({videoCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {!isMobile && (
          <div className="flex gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewModeState('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewModeState('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Media Display */}
      {filteredMedia.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex justify-center mb-4">
            {activeTab === 'photos' ? (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            ) : activeTab === 'videos' ? (
              <VideoIcon className="h-12 w-12 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">No media found</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'all' && 'Use the buttons above to capture photos or videos'}
            {activeTab === 'photos' && 'No photos captured yet'}
            {activeTab === 'videos' && 'No videos captured yet'}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((media) => (
            <Card key={media.id} className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
              <div className="relative aspect-square bg-muted" onClick={() => handleMediaClick(media)}>
                {media.file_type === 'image' ? (
                  <img
                    src={media.thumbnail_url || media.file_url}
                    alt={media.caption || media.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/90">
                    <Play className="h-12 w-12 text-white" />
                    {media.duration && (
                      <Badge className="absolute bottom-2 right-2">
                        {formatDuration(media.duration)}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(media);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(media);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {media.caption && (
                <div className="p-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{media.caption}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((media) => (
            <Card key={media.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded overflow-hidden bg-muted flex-shrink-0">
                  {media.file_type === 'image' ? (
                    <img
                      src={media.thumbnail_url || media.file_url}
                      alt={media.caption || media.file_name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => handleMediaClick(media)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center bg-black/90 cursor-pointer"
                      onClick={() => handleMediaClick(media)}
                    >
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{media.caption || media.file_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {media.file_type === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : <VideoIcon className="h-3 w-3 mr-1" />}
                      {media.file_type}
                    </Badge>
                    <span className="whitespace-nowrap">{formatFileSize(media.file_size)}</span>
                    {media.duration && <span className="whitespace-nowrap">{formatDuration(media.duration)}</span>}
                    <span className="whitespace-nowrap">{format(new Date(media.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDownload(media)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeleteClick(media)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lightboxes */}
      {selectedMedia?.file_type === 'image' && (
        <BidPhotoLightbox
          photo={selectedMedia}
          allPhotos={allPhotos}
          onClose={() => setSelectedMedia(null)}
          onNavigate={(photo) => setSelectedMedia(photo)}
          bidId={bidId}
        />
      )}

      {selectedMedia?.file_type === 'video' && selectedMedia && (
        <VideoLightbox
          video={{
            ...selectedMedia,
            project_id: bidId,
          } as any}
          allVideos={allVideos.map(v => ({ ...v, project_id: bidId }) as any)}
          onClose={() => setSelectedMedia(null)}
          onNavigate={(video) => {
            const bidVideo = allVideos.find(v => v.id === video.id);
            if (bidVideo) setSelectedMedia(bidVideo);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {mediaToDelete?.file_type}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMediaToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

