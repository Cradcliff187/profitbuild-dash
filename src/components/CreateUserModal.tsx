import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/contexts/RoleContext';
import { Loader2, Copy, Check } from 'lucide-react';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export default function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('field_worker');
  const [method, setMethod] = useState<'temporary_password' | 'permanent_password'>('temporary_password');
  const [permanentPassword, setPermanentPassword] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset form state when modal closes
  useEffect(() => {
    if (!open) {
      setEmail('');
      setFullName('');
      setRole('field_worker');
      setMethod('temporary_password');
      setPermanentPassword('');
      setTemporaryPassword('');
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address with a proper domain (e.g., user@example.com)',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setTemporaryPassword('');

    try {
      // Call Edge Function to create user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim(),
          fullName: fullName.trim() || email.trim(),
          role,
          method: method === 'temporary_password' ? 'temporary' : 'permanent',
          password: method === 'permanent_password' ? permanentPassword : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Handle response based on method
      if (method === 'temporary_password') {
        setTemporaryPassword(data.tempPassword);
      }

      toast({
        title: 'User Created',
        description: method === 'temporary_password'
          ? 'User created successfully. Copy the temporary password before closing.'
          : 'User created with permanent password and is ready to log in.',
      });

      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New User</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new user to the system with assigned role
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
                User must change this password on first login. Copy it now - it won't be shown again.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full h-8 text-xs">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={loading}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={loading}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs">Initial Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AppRole)} disabled={loading}>
                <SelectTrigger id="role" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="field_worker">Field Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method" className="text-xs">Creation Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as any)} disabled={loading}>
                <SelectTrigger id="method" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary_password">
                    Temporary Password (Recommended for Invitations)
                  </SelectItem>
                  <SelectItem value="permanent_password">
                    Set Permanent Password
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Use temporary password to invite users - they'll receive an email with login credentials and will be required to change their password on first login.
              </p>
            </div>

            {method === 'permanent_password' && (
              <div className="space-y-1.5">
                <Label htmlFor="permanentPassword" className="text-xs">Permanent Password</Label>
                <Input
                  id="permanentPassword"
                  type="text"
                  value={permanentPassword}
                  onChange={(e) => setPermanentPassword(e.target.value)}
                  placeholder="Enter permanent password (min 8 chars)"
                  required
                  disabled={loading}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Note: You'll know this password. Use temporary password method for better security.
                </p>
              </div>
            )}

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
                Create User
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
