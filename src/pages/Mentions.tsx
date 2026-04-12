import { useNavigate } from 'react-router-dom';
import { AtSign, Bell, CheckCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { format } from 'date-fns';

export default function Mentions() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useUnreadMentions();

  const handleTap = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id);
    if (notification.link_url) {
      navigate(notification.link_url + '?tab=notes');
    }
  };

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={AtSign}
        title="Mentions"
        description="Notes where you've been tagged"
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="min-h-[44px]">
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-2 mt-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">No unread mentions</p>
            <p className="text-xs text-muted-foreground mt-1">
              When someone tags you in a project note, it'll appear here
            </p>
          </Card>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleTap(n)}
              className="w-full text-left rounded-xl border border-primary/20 bg-card hover:bg-muted/50 active:bg-muted/80 transition-all p-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AtSign className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{format(new Date(n.created_at), "MMM d 'at' h:mm a")}</span>
                  </div>
                </div>
                <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
              </div>
            </button>
          ))
        )}
      </div>
    </MobilePageWrapper>
  );
}
