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

  // P0 (May 2026): Real-time subscription DISABLED.
  //
  // Companion to PR #65 (usePendingCounts) and PR #66 (autoRefreshToken=false).
  // useUnreadMentions runs in NotificationBell which mounts in AppLayout for
  // every authenticated user on every page — so its realtime subscription
  // fires on the same critical post-login path that's been driving the token-
  // refresh cascade and login-loop reports. Even with autoRefreshToken=false,
  // a realtime subscribe path internally calls supabase.auth.getSession()
  // (via _getAccessToken in @supabase/supabase-js), which can still trigger
  // a refresh when the access token is in the expiry-margin window.
  //
  // Counts refresh on hook mount + dependency change (sidebar mount, route
  // change, login), and the optimistic update in markAsRead/markAllAsRead
  // keeps the badge accurate for actions taken in this tab. Users in another
  // tab will see new mentions on next route navigation rather than instantly,
  // which is the same trade-off PR #65 made for pending counts.

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
