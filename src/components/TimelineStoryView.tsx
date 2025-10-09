import { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Video as VideoIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectMedia } from '@/types/project';

interface TimelineStoryViewProps {
  media: ProjectMedia[];
  onMediaClick: (media: ProjectMedia) => void;
}

export function TimelineStoryView({ media, onMediaClick }: TimelineStoryViewProps) {
  // Group media by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ProjectMedia[]> = {};
    
    media.forEach(item => {
      const date = format(new Date(item.taken_at || item.created_at), 'MMMM d, yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    
    return groups;
  }, [media]);

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="space-y-6 p-2">
        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold mb-3 text-foreground">{date}</h3>
            <div className="space-y-4">
              {items.map(item => (
                <TimelineEntry key={item.id} media={item} onClick={onMediaClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface TimelineEntryProps {
  media: ProjectMedia;
  onClick: (media: ProjectMedia) => void;
}

function TimelineEntry({ media, onClick }: TimelineEntryProps) {
  const time = format(new Date(media.taken_at || media.created_at), 'h:mm a');

  return (
    <div 
      className="flex gap-3 p-2 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer" 
      onClick={() => onClick(media)}
    >
      {/* Time marker */}
      <div className="flex-shrink-0 w-14 pt-1">
        <p className="text-xs font-semibold text-muted-foreground">{time}</p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Thumbnail */}
        <div className="relative w-full h-40 bg-muted rounded overflow-hidden">
          {media.file_type === 'video' ? (
            <>
              {media.thumbnail_url ? (
                <img 
                  src={media.thumbnail_url} 
                  alt={media.caption || 'Video thumbnail'}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <VideoIcon className="h-8 w-8 text-primary/40" />
                </div>
              )}
            </>
          ) : (
            <img 
              src={media.file_url} 
              alt={media.caption || 'Photo'}
              className="w-full h-full object-cover" 
            />
          )}
        </div>

        {/* Caption */}
        {media.caption && (
          <p className="text-sm text-foreground leading-relaxed">{media.caption}</p>
        )}

        {/* Metadata row */}
        {(media.latitude && media.longitude) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="font-mono">{media.latitude.toFixed(4)}, {media.longitude.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
