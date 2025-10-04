import { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Video as VideoIcon, Play } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { VideoLightbox } from './VideoLightbox';
import type { ProjectMedia } from '@/types/project';

interface ProjectVideoGalleryProps {
  projectId: string;
}

export function ProjectVideoGallery({ projectId }: ProjectVideoGalleryProps) {
  const { media, isLoading } = useProjectMedia(projectId, { fileType: 'video' });
  const [selectedVideo, setSelectedVideo] = useState<ProjectMedia | null>(null);

  // Group videos by date
  const groupedVideos = media.reduce((groups, video) => {
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
    <div className="space-y-6">
      {Object.entries(groupedVideos).map(([dateLabel, videos]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-medium text-foreground mb-3 sticky top-0 bg-background py-2 z-10">
            {dateLabel}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="relative aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
              >
                {/* Placeholder or thumbnail */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <VideoIcon className="h-8 w-8 text-primary/40" />
                </div>

                {/* Play Button Overlay */}
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
            ))}
          </div>
        </div>
      ))}

      {/* Video Lightbox */}
      {selectedVideo && (
        <VideoLightbox
          video={selectedVideo}
          allVideos={media}
          onClose={() => setSelectedVideo(null)}
          onNavigate={setSelectedVideo}
        />
      )}
    </div>
  );
}
