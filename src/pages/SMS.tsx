import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SMS() {
  const { isAdmin, isManager, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isManager) {
      toast.error("Access Denied", { description: 'Only administrators and managers can send SMS messages' });
      navigate('/');
    }
  }, [isAdmin, isManager, rolesLoading, navigate]);

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

