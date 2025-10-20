import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Check } from 'lucide-react';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
}

export default function ResetPasswordModal({ open, onOpenChange, userId, userEmail }: ResetPasswordModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'temporary_password' | 'email_reset'>('temporary_password');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTemporaryPassword('');

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          targetUserId: userId,
          method
        }
      });

      if (error) throw error;

      if (data.temporaryPassword) {
        setTemporaryPassword(data.temporaryPassword);
        toast({
          title: 'Password Reset',
          description: 'Temporary password generated. Copy it before closing.',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Password Reset Email Sent',
          description: `Reset link sent to ${userEmail}`,
        });
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMethod('temporary_password');
    setTemporaryPassword('');
    setEmailSent(false);
    setCopied(false);
    onOpenChange(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Reset Password</DialogTitle>
          <DialogDescription className="text-xs">
            Reset password for {userEmail}
          </DialogDescription>
        </DialogHeader>

        {temporaryPassword ? (
          <div className="space-y-3">
            <div className="bg-muted p-3 rounded-md">
              <Label className="text-xs mb-1 block">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-background p-2 rounded border">
                  {temporaryPassword}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyPassword}
                  className="h-8"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                User must change this password on next login.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">
                ⚠️ If this account has Two-Factor Authentication enabled, the user will still need to enter their 6-digit code after using the temporary password.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full h-8 text-xs">
              Close
            </Button>
          </div>
        ) : emailSent ? (
          <div className="space-y-3">
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-green-600" />
                <Label className="text-xs font-medium">Password Reset Email Sent</Label>
              </div>
              <p className="text-sm mb-2">
                A password reset link has been sent to:
              </p>
              <code className="block text-sm font-mono bg-background p-2 rounded border">
                {userEmail}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                The user will receive an email with a link to reset their password.
                The link is valid for 24 hours.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full h-8 text-xs">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="method" className="text-xs">Reset Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as any)} disabled={loading}>
                <SelectTrigger id="method" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary_password">Temporary Password</SelectItem>
                  <SelectItem value="email_reset">Email Reset Link</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {method === 'temporary_password' 
                  ? 'Generate a temporary password to share with the user'
                  : 'Send a password reset link to the user\'s email'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 h-8 text-xs">
                {loading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
