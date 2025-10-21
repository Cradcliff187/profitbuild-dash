import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserCog, Lock, AlertCircle } from 'lucide-react';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    must_change_password: boolean | null;
    failed_login_attempts: number | null;
    account_locked_until: string | null;
  };
  onSuccess: () => void;
}

export default function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [mustChangePassword, setMustChangePassword] = useState(user.must_change_password || false);

  const isLocked = user.account_locked_until && new Date(user.account_locked_until) > new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          must_change_password: mustChangePassword,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'User profile updated successfully',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAccount = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_locked_until: null,
          failed_login_attempts: 0,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Account Unlocked',
        description: 'User account has been unlocked',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error unlocking account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlock account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-4 w-4" />
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update user profile settings and account status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email (read-only)</Label>
            <Input
              value={user.email}
              disabled
              className="h-8 text-sm bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md border">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="mustChange" className="text-xs font-medium">
                  Must Change Password
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  User will be required to change password on next login
                </p>
              </div>
            </div>
            <Switch
              id="mustChange"
              checked={mustChangePassword}
              onCheckedChange={setMustChangePassword}
              disabled={loading}
            />
          </div>

          {isLocked && (
            <div className="p-2 rounded-md border border-destructive/50 bg-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-destructive" />
                <p className="text-xs font-medium text-destructive">Account Locked</p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Locked until: {new Date(user.account_locked_until!).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Failed attempts: {user.failed_login_attempts || 0}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnlockAccount}
                disabled={loading}
                className="h-7 text-xs w-full"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Unlock Account
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-8 text-xs">
              {loading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
