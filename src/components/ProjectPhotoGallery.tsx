import { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Image as ImageIcon, Search, Download, Trash2, Grid3x3, List, SortAsc, CheckSquare, Square } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { PhotoLightbox } from './PhotoLightbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { deleteProjectMedia } from '@/utils/projectMedia';
import { formatFileSize } from '@/utils/videoUtils';
import type { ProjectMedia } from '@/types/project';

type ViewMode = 'grid' | 'list';
type SortBy = 'date-desc' | 'date-asc' | 'caption';

interface ProjectPhotoGalleryProps {
  projectId: string;
}

export function ProjectPhotoGallery({ projectId }: ProjectPhotoGalleryProps) {
  const { media, isLoading, refetch } = useProjectMedia(projectId, { fileType: 'image' });
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectMedia | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort photos
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = media;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.caption?.toLowerCase().includes(query) ||
        photo.description?.toLowerCase().includes(query) ||
        photo.location_name?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'caption':
          return (a.caption || '').localeCompare(b.caption || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [media, searchQuery, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSize = media.reduce((sum, p) => sum + p.file_size, 0);
    const withGPS = media.filter(p => p.latitude && p.longitude).length;
    const gpsPercentage = media.length > 0 ? Math.round((withGPS / media.length) * 100) : 0;

    return {
      count: media.length,
      totalSize,
      gpsPercentage,
    };
  }, [media]);

  // Selection handlers
  const toggleSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(filteredAndSortedPhotos.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    const photoIds = Array.from(selectedPhotos);
    
    try {
      const results = await Promise.allSettled(
        photoIds.map(id => deleteProjectMedia(id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Deleted ${successful} photo${successful !== 1 ? 's' : ''}`);
        refetch();
      }
      
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} photo${failed !== 1 ? 's' : ''}`);
      }

      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete photos');
      console.error('Batch delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDownload = async () => {
    const photoIds = Array.from(selectedPhotos);
    const photosToDownload = media.filter(p => photoIds.includes(p.id));

    toast.info(`Downloading ${photosToDownload.length} photo${photosToDownload.length !== 1 ? 's' : ''}...`);

    for (const photo of photosToDownload) {
      try {
        const response = await fetch(photo.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.caption || `photo-${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed for photo:', photo.id, error);
      }
    }

    toast.success('Download complete');
  };

  // Group photos by date
  const groupedPhotos = filteredAndSortedPhotos.reduce((groups, photo) => {
    const date = new Date(photo.created_at);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'MMMM d, yyyy');
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(photo);
    return groups;
  }, {} as Record<string, ProjectMedia[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No photos yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the camera button to capture field photos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Statistics Card */}
      <Card className="p-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold">{stats.count}</div>
            <div className="text-xs text-muted-foreground">Photos</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatFileSize(stats.totalSize)}</div>
            <div className="text-xs text-muted-foreground">Storage</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats.gpsPercentage}%</div>
            <div className="text-xs text-muted-foreground">GPS Tagged</div>
          </div>
        </div>
      </Card>

      {/* Controls Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-[140px] h-8">
              <SortAsc className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="caption">By Caption</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Selection Bar */}
      {selectedPhotos.size > 0 && (
        <Card className="p-2 bg-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedPhotos.size} selected</Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                Clear
              </Button>
              {selectedPhotos.size < filteredAndSortedPhotos.length && (
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2">
                  Select All ({filteredAndSortedPhotos.length})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBatchDownload}
                className="h-7 px-2"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Photos Grid */}
      {filteredAndSortedPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No photos match your search</p>
        </div>
      ) : (

        <div className="space-y-6">
          {Object.entries(groupedPhotos).map(([dateLabel, photos]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-medium text-foreground mb-3 sticky top-0 bg-background py-2 z-10">
                {dateLabel}
              </h3>
              <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative"
                  >
                    <button
                      onClick={() => setSelectedPhoto(photo)}
                      className={`relative ${viewMode === 'grid' ? 'aspect-square' : 'aspect-video'} w-full rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group`}
                    >
                      {/* Selection Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(photo.id);
                        }}
                        className="absolute top-2 left-2 z-10"
                      >
                        {selectedPhotos.has(photo.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary bg-white rounded" />
                        ) : (
                          <Square className="h-5 w-5 text-white/80 hover:text-white transition-colors" />
                        )}
                      </button>

                      <img
                        src={photo.file_url}
                        alt={photo.caption || 'Field photo'}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Metadata Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                          {photo.latitude && photo.longitude && (
                            <div className="flex items-center gap-1 text-white text-xs">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-white text-xs">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(photo.created_at), 'h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          allPhotos={media}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Photos?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
