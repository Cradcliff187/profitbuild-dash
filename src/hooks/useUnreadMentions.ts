import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserNotification } from '@/types/notification';

const QUERY_KEY = 'unread-mentions';

export function useUnreadMentions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as UserNotification[];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription — listen to ALL events (INSERT, UPDATE, DELETE)
  // so marking as read triggers a re-fetch across all hook instances
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic: remove from cache immediately
    queryClient.setQueryData(
      [QUERY_KEY, user?.id],
      (old: UserNotification[] | undefined) =>
        (old || []).filter((n) => n.id !== notificationId)
    );

    await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    // Optimistic: clear cache immediately
    queryClient.setQueryData([QUERY_KEY, user.id], []);

    await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  return {
    unreadCount: notifications.length,
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
