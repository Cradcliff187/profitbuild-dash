import { useState } from 'react';
import { Image as ImageIcon, Video, Camera } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { VideoLightbox } from '@/components/VideoLightbox';
import type { ProjectMedia } from '@/types/project';
import { format } from 'date-fns';

interface FieldMediaGalleryProps {
  projectId: string;
}

function MediaThumbnail({
  item,
  onTap,
}: {
  item: ProjectMedia;
  onTap: () => void;
}) {
  const isVideo = item.file_type === 'video';

  return (
    <button
      onClick={onTap}
      className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/30 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {isVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.caption || 'Video'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Video className="h-8 w-8 text-muted-foreground/40" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <img
          src={item.file_url}
          alt={item.caption || 'Photo'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Caption overlay */}
      {(item.caption || item.taken_at) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
          {item.caption && (
            <p className="text-[10px] text-white font-medium truncate">{item.caption}</p>
          )}
          {item.taken_at && (
            <p className="text-[9px] text-white/70">
              {format(new Date(item.taken_at), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-1.5 right-1.5">
        <Badge className="h-5 px-1 text-[9px] bg-black/50 text-white border-0">
          {isVideo ? <Video className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
        </Badge>
      </div>
    </button>
  );
}

export function FieldMediaGallery({ projectId }: FieldMediaGalleryProps) {
  const { media, isLoading } = useProjectMedia(projectId);
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectMedia | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ProjectMedia | null>(null);

  const photos = media.filter((m) => m.file_type === 'image');
  const videos = media.filter((m) => m.file_type === 'video');

  const handleTap = (item: ProjectMedia) => {
    if (item.file_type === 'video') {
      setSelectedVideo(item);
    } else {
      setSelectedPhoto(item);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading media...</p>
      </Card>
    );
  }

  if (media.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground font-medium">No photos or videos yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Media captured for this project will appear here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {photos.length > 0 && (
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> {photos.length} photos
          </span>
        )}
        {videos.length > 0 && (
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" /> {videos.length} videos
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {media.map((item) => (
          <MediaThumbnail key={item.id} item={item} onTap={() => handleTap(item)} />
        ))}
      </div>

      {/* Lightboxes */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          allPhotos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}
      {selectedVideo && (
        <VideoLightbox
          video={selectedVideo}
          allVideos={videos}
          onClose={() => setSelectedVideo(null)}
          onNavigate={setSelectedVideo}
        />
      )}
    </div>
  );
}
