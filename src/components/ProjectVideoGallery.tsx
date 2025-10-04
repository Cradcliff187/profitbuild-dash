import { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Video as VideoIcon, Play, Search, Download, Trash2, Grid3x3, List, SortAsc, Filter, CheckSquare, Square } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { deleteProjectMedia } from '@/utils/projectMedia';
import { VideoLightbox } from './VideoLightbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { formatDuration, formatFileSize } from '@/utils/videoUtils';
import { toast } from 'sonner';
import type { ProjectMedia } from '@/types/project';

interface ProjectVideoGalleryProps {
  projectId: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc' | 'caption';

export function ProjectVideoGallery({ projectId }: ProjectVideoGalleryProps) {
  const { media, isLoading, refetch } = useProjectMedia(projectId, { fileType: 'video' });
  const [selectedVideo, setSelectedVideo] = useState<ProjectMedia | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = media;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video => 
        video.caption?.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.location_name?.toLowerCase().includes(query)
      );
    }

    // Sort
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
  }, [media, searchQuery, sortBy]);

  // Group videos by date
  const groupedVideos = useMemo(() => {
    return filteredAndSortedVideos.reduce((groups, video) => {
      const date = new Date(video.created_at);
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
      groups[label].push(video);
      return groups;
    }, {} as Record<string, ProjectMedia[]>);
  }, [filteredAndSortedVideos]);

  // Statistics
  const stats = useMemo(() => {
    const totalDuration = media.reduce((sum, v) => sum + (v.duration || 0), 0);
    const totalSize = media.reduce((sum, v) => sum + v.file_size, 0);
    const withGPS = media.filter(v => v.latitude && v.longitude).length;
    const gpsPercentage = media.length > 0 ? Math.round((withGPS / media.length) * 100) : 0;

    return {
      count: media.length,
      totalDuration,
      totalSize,
      gpsPercentage,
    };
  }, [media]);

  // Selection handlers
  const toggleSelection = (videoId: string) => {
    setSelectedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVideos(new Set(filteredAndSortedVideos.map(v => v.id)));
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const videoId of selectedVideos) {
      try {
        await deleteProjectMedia(videoId);
        successCount++;
      } catch (error) {
        console.error('Delete error:', error);
        errorCount++;
      }
    }

    setIsDeleting(false);
    setShowDeleteDialog(false);
    clearSelection();
    refetch();

    if (errorCount === 0) {
      toast.success(`Deleted ${successCount} video${successCount !== 1 ? 's' : ''}`);
    } else {
      toast.error(`Deleted ${successCount}, failed ${errorCount}`);
    }
  };

  const handleBatchDownload = async () => {
    const selectedVideosList = filteredAndSortedVideos.filter(v => selectedVideos.has(v.id));
    
    for (const video of selectedVideosList) {
      try {
        const response = await fetch(video.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = video.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download error:', error);
        toast.error(`Failed to download ${video.file_name}`);
      }
    }
    
    toast.success(`Downloaded ${selectedVideosList.length} video${selectedVideosList.length !== 1 ? 's' : ''}`);
  };

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
        <VideoIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No videos yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the video button to capture field videos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Statistics Card */}
      <Card className="p-3">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold">{stats.count}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatDuration(stats.totalDuration)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by caption or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="duration-desc">Longest First</SelectItem>
            <SelectItem value="duration-asc">Shortest First</SelectItem>
            <SelectItem value="caption">By Caption</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 px-2"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Batch Selection Bar */}
      {selectedVideos.size > 0 && (
        <Card className="p-2 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 text-xs"
              >
                Clear ({selectedVideos.size})
              </Button>
              {selectedVideos.size < filteredAndSortedVideos.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDownload}
                className="h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Videos */}
      {filteredAndSortedVideos.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No videos match your search
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedVideos).map(([dateLabel, videos]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-medium text-foreground mb-2 sticky top-0 bg-background py-1 z-10">
                {dateLabel}
              </h3>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-2">
                  {videos.map((video) => (
                    <div key={video.id} className="relative group">
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="w-full aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                      >
                        {/* Placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <VideoIcon className="h-8 w-8 text-primary/40" />
                        </div>

                        {/* Duration Badge */}
                        {video.duration && (
                          <Badge className="absolute top-2 right-2 text-xs bg-black/70 text-white border-0">
                            {formatDuration(video.duration)}
                          </Badge>
                        )}

                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
                            <Play className="h-6 w-6 text-white fill-white ml-1" />
                          </div>
                        </div>

                        {/* Metadata Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                            {video.latitude && video.longitude && (
                              <div className="flex items-center gap-1 text-white text-xs">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">
                                  {video.latitude.toFixed(4)}, {video.longitude.toFixed(4)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-white text-xs">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(video.created_at), 'h:mm a')}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Selection Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(video.id);
                        }}
                        className="absolute top-2 left-2 z-10"
                      >
                        {selectedVideos.has(video.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary bg-white rounded" />
                        ) : (
                          <Square className="h-5 w-5 text-white/80 hover:text-white transition-colors" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {videos.map((video) => (
                    <Card
                      key={video.id}
                      className="p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(video.id);
                          }}
                        >
                          {selectedVideos.has(video.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        <div className="w-16 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <VideoIcon className="h-5 w-5 text-primary/40" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {video.caption || video.file_name}
                            </span>
                            {video.duration && (
                              <Badge variant="outline" className="text-xs">
                                {formatDuration(video.duration)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(video.created_at), 'MMM d, h:mm a')}</span>
                            <span>•</span>
                            <span>{formatFileSize(video.file_size)}</span>
                            {video.latitude && video.longitude && (
                              <>
                                <span>•</span>
                                <MapPin className="h-3 w-3" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video Lightbox */}
      {selectedVideo && (
        <VideoLightbox
          video={selectedVideo}
          allVideos={filteredAndSortedVideos}
          onClose={() => setSelectedVideo(null)}
          onNavigate={setSelectedVideo}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVideos.size} video{selectedVideos.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected videos will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
