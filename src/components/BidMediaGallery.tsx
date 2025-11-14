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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { BrandedLoader } from './ui/branded-loader';
import { formatFileSize, formatDuration } from '@/utils/videoUtils';
import type { BidMedia } from '@/types/bid';

type ViewMode = 'grid' | 'list';
type MediaTab = 'all' | 'photos' | 'videos';

interface BidMediaGalleryProps {
  bidId: string;
  bidName: string;
}

export function BidMediaGallery({ bidId, bidName }: BidMediaGalleryProps) {
  const queryClient = useQueryClient();
  const { media: allMedia, isLoading } = useBidMedia(bidId);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [selectedMedia, setSelectedMedia] = useState<BidMedia | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaTab)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({allMedia.length})
            </TabsTrigger>
            <TabsTrigger value="photos">
              <ImageIcon className="h-4 w-4 mr-1" />
              Photos ({photoCount})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <VideoIcon className="h-4 w-4 mr-1" />
              Videos ({videoCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">
                      {media.file_type === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : <VideoIcon className="h-3 w-3 mr-1" />}
                      {media.file_type}
                    </Badge>
                    <span>{formatFileSize(media.file_size)}</span>
                    {media.duration && <span>{formatDuration(media.duration)}</span>}
                    <span>{format(new Date(media.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
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

