import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface MediaCommentsListProps {
  mediaId: string;
}

export function MediaCommentsList({ mediaId }: MediaCommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('media_comments')
        .select(`
          id,
          user_id,
          comment_text,
          created_at,
          updated_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments');
      } else {
        setComments(data || []);
      }
      setIsLoading(false);
    };

    fetchComments();
  }, [mediaId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`media-comments-${mediaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_comments',
          filter: `media_id=eq.${mediaId}`,
        },
        () => {
          // Refetch comments on any change
          queryClient.invalidateQueries({ queryKey: ['media-comments', mediaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mediaId, queryClient]);

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('media_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to delete comment');
    } else {
      toast.success('Comment deleted');
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground p-2">Loading comments...</div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-2">No comments yet</div>
    );
  }

  return (
    <ScrollArea className="max-h-48">
      <div className="space-y-2 p-2">
        {comments.map((comment) => {
          const isOwner = currentUserId === comment.user_id;
          const userName = comment.profiles?.full_name || comment.profiles?.email?.split('@')[0] || 'Unknown User';
          const initials = userName.substring(0, 2).toUpperCase();

          return (
            <div key={comment.id} className="flex gap-2 text-xs">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground">{userName}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-foreground mt-0.5">{comment.comment_text}</p>
              </div>

              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
