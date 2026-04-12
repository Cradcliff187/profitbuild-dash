import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';

export function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMentions();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-800 shrink-0 relative"
      onClick={() => navigate('/mentions')}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-orange-500 rounded-full ring-2 ring-slate-900" />
      )}
      <span className="sr-only">
        {unreadCount > 0 ? `${unreadCount} unread mentions` : 'No unread mentions'}
      </span>
    </Button>
  );
}
