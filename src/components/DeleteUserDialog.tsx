import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AppRole } from '@/contexts/RoleContext';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: AppRole[];
  } | null;
  onSuccess: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || confirmEmail !== user.email) {
      toast.error('Email confirmation does not match');
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('User deleted successfully');
      onOpenChange(false);
      setConfirmEmail('');
      onSuccess();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmEmail('');
      }
    }
  };

  if (!user) return null;

  const emailMatches = confirmEmail === user.email;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ This action cannot be undone!
              </p>
              <p className="text-xs text-muted-foreground">
                This will permanently delete the user account and all associated data.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">User:</span> {user.full_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Roles:</span>
                <div className="flex gap-1 flex-wrap">
                  {user.roles.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground border-t pt-3">
              <p className="font-medium text-foreground">The following will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>User authentication and login access</li>
                <li>Profile information</li>
                <li>All role assignments</li>
                <li>Time entries and expense records</li>
                <li>Project assignments</li>
                <li>All related audit logs</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-email" className="text-sm font-medium">
                Type the user's email to confirm deletion:
              </Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder={user.email}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                disabled={isDeleting}
                className="font-mono text-sm"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!emailMatches || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Permanently Delete User'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
