import { useMemo } from 'react';
import { format, isToday, isYesterday, isSameYear } from 'date-fns';
import { MapPin, Video as VideoIcon, Play, MessageSquare, Smartphone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDeviceLabel } from '@/utils/formatDeviceLabel';
import type { ProjectMedia } from '@/types/project';

interface TimelineStoryViewProps {
  media: ProjectMedia[];
  onMediaClick: (media: ProjectMedia) => void;
}

// Gives the day header a natural label: "Today", "Yesterday", "Thu, Apr 18",
// or the full "April 10, 2026" when it crosses the year boundary. Uses the
// first item in each group — grouping is by calendar day.
function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isSameYear(date, new Date())) return format(date, 'EEEE, MMM d');
  return format(date, 'MMMM d, yyyy');
}

// Groups media by calendar date (stable within the locale), preserving the
// original order within each group so the input's sort direction (newest-first
// or oldest-first) is honored.
function useMediaGroupedByDay(media: ProjectMedia[]) {
  return useMemo(() => {
    const groups = new Map<string, { date: Date; items: ProjectMedia[] }>();
    for (const item of media) {
      const d = new Date(item.taken_at || item.created_at);
      const key = format(d, 'yyyy-MM-dd');
      const existing = groups.get(key);
      if (existing) existing.items.push(item);
      else groups.set(key, { date: d, items: [item] });
    }
    return Array.from(groups.values());
  }, [media]);
}

export function TimelineStoryView({ media, onMediaClick }: TimelineStoryViewProps) {
  const groups = useMediaGroupedByDay(media);

  if (media.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No media in this period.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="relative pb-8">
        {groups.map(({ date, items }, groupIdx) => (
          <section key={date.toISOString()} className={cn(groupIdx > 0 && 'mt-10')}>
            {/* Sticky date header so the user never loses their place while scrolling. */}
            <header className="sticky top-0 z-10 -mx-2 px-2 py-2 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-foreground">{formatDayLabel(date)}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(date, 'MMM d, yyyy')} · {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </header>

            <ol className="relative space-y-4 pl-6 md:pl-8">
              {/* Vertical spine — subtle, stops at the last entry in the group. */}
              <div
                aria-hidden
                className="absolute left-[7px] md:left-[11px] top-1 bottom-1 w-px bg-border"
              />
              {items.map((item) => (
                <TimelineEntry key={item.id} media={item} onClick={onMediaClick} />
              ))}
            </ol>
          </section>
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
  const when = new Date(media.taken_at || media.created_at);
  const time = format(when, 'h:mm a');
  const isVideo = media.file_type === 'video';
  const isNoteSourced = media.source === 'note';

  // Prefer a human-readable name; raw decimal coords aren't useful to a PM.
  // If we only have coords, render a compact "GPS" pill (let the lightbox show
  // the precise numbers when the user actually wants them).
  const locationLabel = media.location_name
    ? media.location_name
    : media.latitude && media.longitude
      ? 'GPS'
      : null;

  const deviceLabel = formatDeviceLabel(media.device_model);
  const caption = media.caption?.trim() || media.note_text?.trim() || null;

  return (
    <li className="relative">
      {/* Spine dot — aligns with the vertical line; filled on click for hover feedback. */}
      <span
        aria-hidden
        className="absolute -left-6 md:-left-8 top-[14px] h-3 w-3 rounded-full bg-background border-2 border-primary ring-2 ring-background"
      />

      <button
        onClick={() => onClick(media)}
        className="group w-full text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
      >
        {/* Header row — time + source/device chips. Keeps context visible when
           the photo loads or fails. */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground tabular-nums">{time}</span>
          {isNoteSourced && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-medium">
              <MessageSquare className="h-3 w-3" />
              From note
            </Badge>
          )}
          {isVideo && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-medium">
              <VideoIcon className="h-3 w-3" />
              Video
            </Badge>
          )}
          {deviceLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Smartphone className="h-3 w-3" />
              {deviceLabel}
            </span>
          )}
        </div>

        {/* Thumbnail — preserves aspect ratio. Uses object-contain inside a
           capped-height container so portrait phones and wide ladders both
           render without cropping. Background fills any letterbox. */}
        <div className="relative bg-muted">
          {isVideo ? (
            media.thumbnail_url ? (
              <img
                src={media.thumbnail_url}
                alt={media.caption || 'Video thumbnail'}
                className="w-full max-h-[360px] object-contain bg-black/5"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                <VideoIcon className="h-10 w-10 text-primary/40" />
              </div>
            )
          ) : (
            <img
              src={media.file_url}
              alt={media.caption || 'Project photo'}
              className="w-full max-h-[360px] object-contain bg-black/5"
              loading="lazy"
            />
          )}

          {/* Video play overlay */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-12 w-12 rounded-full bg-black/55 flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Caption + metadata footer */}
        {(caption || locationLabel) && (
          <div className="px-3 py-2.5 space-y-1.5">
            {caption && (
              <p className="text-sm text-foreground leading-snug line-clamp-2">{caption}</p>
            )}
            {locationLabel && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
          </div>
        )}
      </button>
    </li>
  );
}
