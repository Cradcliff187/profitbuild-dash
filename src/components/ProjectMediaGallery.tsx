import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Image as ImageIcon, Video as VideoIcon, Play, Search, Download, Trash2, Grid3x3, List, SortAsc, CheckSquare, Square, FileImage, FileVideo, FileText, Clock4, X, CloudUpload, MoreVertical, Check } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { PhotoLightbox } from './PhotoLightbox';
import { VideoLightbox } from './VideoLightbox';
import { MediaReportBuilderModal } from './MediaReportBuilderModal';
import { MediaCommentBadge } from './MediaCommentBadge';
import { TimelineStoryView } from './TimelineStoryView';
import { BrandedLoader } from './ui/branded-loader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { toast } from 'sonner';
import { deleteProjectMedia, refreshMediaSignedUrl } from '@/utils/projectMedia';
import { formatFileSize, formatDuration } from '@/utils/videoUtils';
import { getPendingCount } from '@/utils/syncQueue';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectMedia } from '@/types/project';

type ViewMode = 'grid' | 'list';
type SortBy = 'date-desc' | 'date-asc' | 'caption' | 'duration-desc' | 'duration-asc';
type MediaTab = 'all' | 'photos' | 'videos' | 'timeline';

interface ProjectMediaGalleryProps {
  projectId: string;
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
  externalActiveTab?: MediaTab; // Optional external tab control
  hideInternalTabs?: boolean; // Hide internal tabs if external tabs are used
}

export function ProjectMediaGallery({ 
  projectId, 
  projectName, 
  projectNumber, 
  clientName, 
  address,
  externalActiveTab,
  hideInternalTabs = false
}: ProjectMediaGalleryProps) {
  const queryClient = useQueryClient();
  const { media: allMedia, isLoading, refetch } = useProjectMedia(projectId);
  const [internalActiveTab, setInternalActiveTab] = useState<MediaTab>('all');
  
  // Use external tab if provided, otherwise use internal tab
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalActiveTab !== undefined ? () => {} : setInternalActiveTab;
  const [selectedMedia, setSelectedMedia] = useState<ProjectMedia | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTip, setShowTip] = useState(() => {
    return !localStorage.getItem('media-report-tip-dismissed');
  });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [refreshingImages, setRefreshingImages] = useState<Set<string>>(new Set());

  // Check for pending media uploads in queue
  const { data: queueCount } = useQuery({
    queryKey: ['media-queue-count'],
    queryFn: getPendingCount,
    refetchInterval: 5000 // Check every 5 seconds
  });

  // Filter media by tab
  const tabFilteredMedia = useMemo(() => {
    if (activeTab === 'photos') return allMedia.filter(m => m.file_type === 'image');
    if (activeTab === 'videos') return allMedia.filter(m => m.file_type === 'video');
    return allMedia;
  }, [allMedia, activeTab]);

  // Filter and sort media
  const filteredAndSortedMedia = useMemo(() => {
    // Apply sorting
    const sorted = [...tabFilteredMedia].sort((a, b) => {
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
  }, [tabFilteredMedia, sortBy]);

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

  // Render controls bar - clean, professional design
  const renderControlsBar = () => (
    <div className="flex items-center gap-2">
      {/* Generate Report - Primary Action */}
      <Button
        onClick={() => {
          if (selectedItems.size === 0) {
            toast.info("Select photos or videos first to generate a report");
          } else {
            setShowReportModal(true);
          }
        }}
        size="sm"
        className="h-9"
      >
        <FileText className="h-4 w-4 mr-2" />
        Generate Report
        {selectedItems.size > 0 && (
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
            {selectedItems.size}
          </Badge>
        )}
      </Button>

      {/* Sort Dropdown */}
      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
        <SelectTrigger className="w-[140px] h-9 border-input">
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

      {/* View Toggle - Grouped */}
      <div className="flex items-center border rounded-md bg-background">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="h-9 px-3 rounded-r-none border-r"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="h-9 px-3 rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+A / Cmd+A = Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        selectAll();
      }

      // Escape = Clear Selection
      if (e.key === 'Escape' && selectedItems.size > 0) {
        clearSelection();
      }

      // Ctrl+G / Cmd+G = Generate Report (if items selected)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedItems.size > 0) {
        e.preventDefault();
        setShowReportModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedItems, filteredAndSortedMedia]);

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    const itemIds = Array.from(selectedItems);
    
    // Optimistic update - remove from UI immediately
    queryClient.setQueryData(
      ['project-media', projectId],
      (oldData: ProjectMedia[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(item => !itemIds.includes(item.id));
      }
    );
    
    try {
      const results = await Promise.allSettled(
        itemIds.map(id => deleteProjectMedia(id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Deleted ${successful} item${successful !== 1 ? 's' : ''}`);
      }
      
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item${failed !== 1 ? 's' : ''}`);
        // Rollback - refetch if delete failed
        refetch();
      }

      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete items');
      console.error('Batch delete error:', error);
      // Rollback - refetch on error
      refetch();
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

  const handleImageError = async (mediaId: string) => {
    // Prevent infinite retry loops
    if (failedImages.has(mediaId)) return;
    
    setFailedImages(prev => new Set(prev).add(mediaId));
    setRefreshingImages(prev => new Set(prev).add(mediaId));

    try {
      const { signedUrl, thumbnailUrl, error } = await refreshMediaSignedUrl(mediaId);
      
      if (error || !signedUrl) {
        toast.error('Failed to reload image. Try refreshing the page.');
        return;
      }

      // Update only this specific media item in the cache
      queryClient.setQueryData(
        ['project-media', projectId],
        (oldData: ProjectMedia[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item =>
            item.id === mediaId
              ? { ...item, file_url: signedUrl, thumbnail_url: thumbnailUrl || item.thumbnail_url }
              : item
          );
        }
      );
      
      setFailedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to refresh media URL:', error);
      toast.error('Image loading failed. Please refresh the page.');
    } finally {
      setRefreshingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return <BrandedLoader message="Loading media..." />;
  }

  if (allMedia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-xs font-medium text-muted-foreground">No media yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the camera buttons to capture photos and videos
        </p>
      </div>
    );
  }

  // Portal target for external controls - use state to ensure it exists
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (hideInternalTabs) {
      const target = document.getElementById('field-media-controls');
      setPortalTarget(target);
    }
  }, [hideInternalTabs]);

  return (
    <div className="space-y-2">
      {/* Render controls in portal when external tabs are used (desktop only) */}
      {hideInternalTabs && portalTarget && createPortal(
        renderControlsBar(),
        portalTarget
      )}

      {/* Statistics Card - Only show when internal tabs are visible */}
      {!hideInternalTabs && (
        <Card className="hidden md:block p-2">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold">{stats.totalCount}</div>
              <div className="text-xs text-muted-foreground">Items</div>
            </div>
            {activeTab !== 'photos' && stats.videoCount > 0 && (
              <div>
                <div className="text-sm font-semibold">{formatDuration(stats.totalDuration)}</div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">{formatFileSize(stats.totalSize)}</div>
              <div className="text-xs text-muted-foreground">Storage</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.gpsPercentage}%</div>
              <div className="text-xs text-muted-foreground">GPS Tagged</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaTab)}>
        {!hideInternalTabs && (
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs h-6">
              All ({stats.photoCount + stats.videoCount})
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs h-6">
              <FileImage className="h-3 w-3 mr-1" />
              Photos ({stats.photoCount})
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs h-6">
              <FileVideo className="h-3 w-3 mr-1" />
              Videos ({stats.videoCount})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs h-6">
              <Clock4 className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
          </TabsList>
        )}

        {/* Gallery Tab Content */}
        <TabsContent value={activeTab === 'timeline' ? 'all' : activeTab} className="space-y-2 mt-2" hidden={activeTab === 'timeline'}>

          {/* Queue Status Banner */}
          {queueCount > 0 && (
            <Alert className="border-primary/50 bg-primary/5 py-2">
              <CloudUpload className="h-3 w-3" />
              <AlertDescription className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs font-medium">
                  {queueCount} media {queueCount === 1 ? 'item' : 'items'} pending upload
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* First-Time User Guidance - Compact */}
          {showTip && allMedia.length > 0 && (
            <Alert className="border-primary/50 bg-primary/5 py-2">
              <FileText className="h-3 w-3" />
              <AlertDescription className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium">Generate Professional Reports</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select items, then click "Generate Report" to create a PDF.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTip(false);
                    localStorage.setItem('media-report-tip-dismissed', 'true');
                  }}
                  className="shrink-0 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Controls Bar - Desktop via portal, Mobile inline */}
          <div className="sm:hidden">
            {renderControlsBar()}
          </div>
          {/* For internal tabs (non-Field Media), show controls here on desktop too */}
          {!hideInternalTabs && (
            <div className="hidden sm:block">
              {renderControlsBar()}
            </div>
          )}

          {/* Selection Actions */}
          {selectedItems.size > 0 ? (
            // Active selection bar
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedItems.size} selected
                </span>
                {selectedItems.size < filteredAndSortedMedia.length && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <button
                      onClick={selectAll}
                      className="text-sm text-primary hover:underline"
                    >
                      Select all {filteredAndSortedMedia.length}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={clearSelection}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          ) : (
            // Subtle select all hint
            filteredAndSortedMedia.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {filteredAndSortedMedia.length} {filteredAndSortedMedia.length === 1 ? 'item' : 'items'}
                </span>
                <button
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Select all
                </button>
              </div>
            )
          )}

          {/* Media Grid */}
          {filteredAndSortedMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No media found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMedia).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <h3 className="text-sm font-medium text-foreground mb-3 sticky top-0 bg-background py-2 z-10">
                    {dateLabel}
                  </h3>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' : 'space-y-2'}>
                    {items.map((item) => (
                      <div key={item.id} className="relative">
                        <div
                          onClick={() => setSelectedMedia(item)}
                          className={`relative ${viewMode === 'grid' ? 'aspect-square' : 'aspect-video'} w-full rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group cursor-pointer`}
                        >
                          {/* Selection Checkbox - Larger touch target on mobile */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(item.id);
                            }}
                            className="absolute top-2 left-2 z-10 p-2 sm:p-1 rounded-md bg-background/90 backdrop-blur-sm hover:bg-background transition-colors"
                            aria-label={selectedItems.has(item.id) ? "Deselect item" : "Select item"}
                          >
                            {selectedItems.has(item.id) ? (
                              <CheckSquare className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
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

                          {/* Comment Count Badge */}
                          <MediaCommentBadge mediaId={item.id} />

                          {/* Thumbnail/Image */}
                          {item.file_type === 'image' ? (
                            <div className="relative w-full h-full">
                              <img
                                src={item.file_url}
                                alt={item.caption || 'Field photo'}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(item.id)}
                              />
                              
                              {refreshingImages.has(item.id) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                                </div>
                              )}
                              
                              {failedImages.has(item.id) && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 p-2">
                                  <ImageIcon className="h-8 w-8 text-white/70" />
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFailedImages(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(item.id);
                                        return newSet;
                                      });
                                      handleImageError(item.id);
                                    }}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : item.thumbnail_url ? (
                            <div className="relative w-full h-full">
                              <img 
                                src={item.thumbnail_url} 
                                alt={item.caption || 'Video thumbnail'} 
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(item.id)}
                              />
                              
                              {refreshingImages.has(item.id) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                                </div>
                              )}
                            </div>
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab Content */}
        <TabsContent value="timeline" className="mt-3">
          {isLoading ? (
            <BrandedLoader message="Loading timeline..." />
          ) : filteredAndSortedMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock4 className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No media to display</p>
            </div>
          ) : (
            <TimelineStoryView 
              media={filteredAndSortedMedia}
              onMediaClick={setSelectedMedia}
            />
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
