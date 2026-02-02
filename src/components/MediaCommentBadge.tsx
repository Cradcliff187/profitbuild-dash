import { MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';

interface MediaCommentBadgeProps {
  count: number;
}

export function MediaCommentBadge({ count }: MediaCommentBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge className="absolute bottom-2 left-2 z-10 text-xs bg-black/70 text-white border-0">
      <MessageSquare className="h-3 w-3 mr-1" />
      {count}
    </Badge>
  );
}
