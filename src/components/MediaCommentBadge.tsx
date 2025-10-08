import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from './ui/badge';

interface MediaCommentBadgeProps {
  mediaId: string;
}

export function MediaCommentBadge({ mediaId }: MediaCommentBadgeProps) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Fetch initial count
    const fetchCount = async () => {
      const { count: initialCount } = await supabase
        .from('media_comments')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', mediaId);
      
      setCount(initialCount || 0);
    };

    fetchCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`comments-${mediaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_comments',
          filter: `media_id=eq.${mediaId}`,
        },
        () => {
          // Refetch count when changes occur
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mediaId]);

  // Don't show badge if no comments
  if (count === 0) return null;

  return (
    <Badge className="absolute bottom-2 left-2 z-10 text-xs bg-black/70 text-white border-0">
      <MessageSquare className="h-3 w-3 mr-1" />
      {count}
    </Badge>
  );
}
