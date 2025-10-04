import { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MapPin, Clock, Loader2, Image as ImageIcon } from 'lucide-react';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { PhotoLightbox } from './PhotoLightbox';
import type { ProjectMedia } from '@/types/project';

interface ProjectPhotoGalleryProps {
  projectId: string;
}

export function ProjectPhotoGallery({ projectId }: ProjectPhotoGalleryProps) {
  const { media, isLoading } = useProjectMedia(projectId, { fileType: 'image' });
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectMedia | null>(null);

  // Group photos by date
  const groupedPhotos = media.reduce((groups, photo) => {
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
    <div className="space-y-6">
      {Object.entries(groupedPhotos).map(([dateLabel, photos]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-medium text-foreground mb-3 sticky top-0 bg-background py-2 z-10">
            {dateLabel}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
              >
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
            ))}
          </div>
        </div>
      ))}

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          allPhotos={media}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}
    </div>
  );
}
