import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function SMS() {
  const { isAdmin, isManager, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isManager) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators and managers can send SMS messages',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isAdmin, isManager, rolesLoading, navigate, toast]);

  if (rolesLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !isManager) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3 min-w-0">
          <MessageSquare className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">SMS Messages</h1>
            <p className="text-sm text-muted-foreground">
              Send text messages with app links to field workers
            </p>
          </div>
        </div>
      </div>
      <SMSComposer />
    </div>
  );
}

