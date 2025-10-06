import { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Image as ImageIcon, Video as VideoIcon, Play, Search, Download, Trash2, Grid3x3, List, SortAsc, CheckSquare, Square, FileImage, FileVideo, FileText } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { PhotoLightbox } from './PhotoLightbox';
import { VideoLightbox } from './VideoLightbox';
import { MediaReportBuilderModal } from './MediaReportBuilderModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { deleteProjectMedia } from '@/utils/projectMedia';
import { formatFileSize, formatDuration } from '@/utils/videoUtils';
import type { ProjectMedia } from '@/types/project';

type ViewMode = 'grid' | 'list';
type SortBy = 'date-desc' | 'date-asc' | 'caption' | 'duration-desc' | 'duration-asc';
type MediaTab = 'all' | 'photos' | 'videos';

interface ProjectMediaGalleryProps {
  projectId: string;
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
}

export function ProjectMediaGallery({ 
  projectId, 
  projectName, 
  projectNumber, 
  clientName, 
  address 
}: ProjectMediaGalleryProps) {
  const { media: allMedia, isLoading, refetch } = useProjectMedia(projectId);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [selectedMedia, setSelectedMedia] = useState<ProjectMedia | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter media by tab
  const tabFilteredMedia = useMemo(() => {
    if (activeTab === 'photos') return allMedia.filter(m => m.file_type === 'image');
    if (activeTab === 'videos') return allMedia.filter(m => m.file_type === 'video');
    return allMedia;
  }, [allMedia, activeTab]);

  // Filter and sort media
  const filteredAndSortedMedia = useMemo(() => {
    let filtered = tabFilteredMedia;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.caption?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.location_name?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'duration-desc':
          return (b.duration || 0) - (a.duration || 0);
        case 'duration-asc':
          return (a.duration || 0) - (b.duration || 0);
        case 'caption':
          return (a.caption || '').localeCompare(b.caption || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [tabFilteredMedia, searchQuery, sortBy]);

  // Group media by date
  const groupedMedia = useMemo(() => {
    return filteredAndSortedMedia.reduce((groups, item) => {
      const date = new Date(item.created_at);
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
      groups[label].push(item);
      return groups;
    }, {} as Record<string, ProjectMedia[]>);
  }, [filteredAndSortedMedia]);

  // Calculate statistics
  const stats = useMemo(() => {
    const photos = tabFilteredMedia.filter(m => m.file_type === 'image');
    const videos = tabFilteredMedia.filter(m => m.file_type === 'video');
    const totalSize = tabFilteredMedia.reduce((sum, m) => sum + m.file_size, 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const withGPS = tabFilteredMedia.filter(m => m.latitude && m.longitude).length;
    const gpsPercentage = tabFilteredMedia.length > 0 ? Math.round((withGPS / tabFilteredMedia.length) * 100) : 0;

    return {
      photoCount: photos.length,
      videoCount: videos.length,
      totalCount: tabFilteredMedia.length,
      totalSize,
      totalDuration,
      gpsPercentage,
    };
  }, [tabFilteredMedia]);

  // Selection handlers
  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredAndSortedMedia.map(m => m.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    const itemIds = Array.from(selectedItems);
    
    try {
      const results = await Promise.allSettled(
        itemIds.map(id => deleteProjectMedia(id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Deleted ${successful} item${successful !== 1 ? 's' : ''}`);
        refetch();
      }
      
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item${failed !== 1 ? 's' : ''}`);
      }

      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete items');
      console.error('Batch delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDownload = async () => {
    const itemIds = Array.from(selectedItems);
    const itemsToDownload = allMedia.filter(m => itemIds.includes(m.id));

    toast.info(`Downloading ${itemsToDownload.length} item${itemsToDownload.length !== 1 ? 's' : ''}...`);

    for (const item of itemsToDownload) {
      try {
        const response = await fetch(item.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.caption || item.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed for item:', item.id, error);
      }
    }

    toast.success('Download complete');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allMedia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No media yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the camera buttons to capture photos and videos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="text-xs">
            All ({stats.photoCount + stats.videoCount})
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">
            <FileImage className="h-3 w-3 mr-1" />
            Photos ({stats.photoCount})
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">
            <FileVideo className="h-3 w-3 mr-1" />
            Videos ({stats.videoCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-3">
          {/* Statistics Card */}
          <Card className="p-3">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-semibold">{stats.totalCount}</div>
                <div className="text-xs text-muted-foreground">Items</div>
              </div>
              {activeTab !== 'photos' && stats.videoCount > 0 && (
                <div>
                  <div className="text-lg font-semibold">{formatDuration(stats.totalDuration)}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              )}
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
                placeholder="Search media..."
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
                  {activeTab !== 'photos' && (
                    <>
                      <SelectItem value="duration-desc">Longest First</SelectItem>
                      <SelectItem value="duration-asc">Shortest First</SelectItem>
                    </>
                  )}
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
          {selectedItems.size > 0 && (
            <Card className="p-2 bg-accent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedItems.size} selected</Badge>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                    Clear
                  </Button>
                  {selectedItems.size < filteredAndSortedMedia.length && (
                    <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2">
                      Select All ({filteredAndSortedMedia.length})
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReportModal(true)}
                    className="h-7 px-2"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Report
                  </Button>
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

          {/* Media Grid */}
          {filteredAndSortedMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No media matches your search</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMedia).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <h3 className="text-sm font-medium text-foreground mb-3 sticky top-0 bg-background py-2 z-10">
                    {dateLabel}
                  </h3>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
                    {items.map((item) => (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => setSelectedMedia(item)}
                          className={`relative ${viewMode === 'grid' ? 'aspect-square' : 'aspect-video'} w-full rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group`}
                        >
                          {/* Selection Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(item.id);
                            }}
                            className="absolute top-2 left-2 z-10"
                          >
                            {selectedItems.has(item.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary bg-white rounded" />
                            ) : (
                              <Square className="h-5 w-5 text-white/80 hover:text-white transition-colors" />
                            )}
                          </button>

                          {/* Media Type Badge */}
                          <Badge className="absolute top-2 right-2 text-xs bg-black/70 text-white border-0">
                            {item.file_type === 'video' ? (
                              <>{item.duration ? formatDuration(item.duration) : 'Video'}</>
                            ) : (
                              'Photo'
                            )}
                          </Badge>

                          {/* Thumbnail/Image */}
                          {item.file_type === 'image' ? (
                            <img
                              src={item.file_url}
                              alt={item.caption || 'Field photo'}
                              className="w-full h-full object-cover"
                            />
                          ) : item.thumbnail_url ? (
                            <img 
                              src={item.thumbnail_url} 
                              alt={item.caption || 'Video thumbnail'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <VideoIcon className="h-8 w-8 text-primary/40" />
                            </div>
                          )}

                          {/* Play Button for Videos */}
                          {item.file_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
                                <Play className="h-6 w-6 text-white fill-white ml-1" />
                              </div>
                            </div>
                          )}
                          
                          {/* Metadata Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                              {item.latitude && item.longitude && (
                                <div className="flex items-center gap-1 text-white text-xs">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">
                                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-white text-xs">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(item.created_at), 'h:mm a')}</span>
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
        </TabsContent>
      </Tabs>

      {/* Lightboxes */}
      {selectedMedia && selectedMedia.file_type === 'image' && (
        <PhotoLightbox
          photo={selectedMedia}
          allPhotos={allMedia.filter(m => m.file_type === 'image')}
          onClose={() => setSelectedMedia(null)}
          onNavigate={setSelectedMedia}
        />
      )}

      {selectedMedia && selectedMedia.file_type === 'video' && (
        <VideoLightbox
          video={selectedMedia}
          allVideos={allMedia.filter(m => m.file_type === 'video')}
          onClose={() => setSelectedMedia(null)}
          onNavigate={setSelectedMedia}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}. This action cannot be undone.
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

      {/* Report Builder Modal */}
      <MediaReportBuilderModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        projectName={projectName}
        projectNumber={projectNumber}
        clientName={clientName}
        address={address}
        selectedMedia={allMedia.filter(m => selectedItems.has(m.id))}
        onComplete={clearSelection}
      />
    </div>
  );
}
