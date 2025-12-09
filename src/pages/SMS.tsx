import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="container mx-auto p-6 max-w-4xl">
      <SMSComposer />
    </div>
  );
}

