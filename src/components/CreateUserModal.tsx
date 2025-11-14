import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to the system with assigned role
          </SheetDescription>
        </SheetHeader>

        {temporaryPassword ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <Label className="mb-2 block">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-background p-2 rounded border">
                      {temporaryPassword}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyPassword}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    User must change this password on first login. Copy it now - it won't be shown again.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-4" id="create-user-form">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Initial Role</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as AppRole)} disabled={loading}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="field_worker">Field Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Creation Method</Label>
                  <Select value={method} onValueChange={(value) => setMethod(value as any)} disabled={loading}>
                    <SelectTrigger id="method">
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
                  <div className="space-y-2">
                    <Label htmlFor="permanentPassword">Permanent Password</Label>
                    <Input
                      id="permanentPassword"
                      type="text"
                      value={permanentPassword}
                      onChange={(e) => setPermanentPassword(e.target.value)}
                      placeholder="Enter permanent password (min 8 chars)"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Note: You'll know this password. Use temporary password method for better security.
                    </p>
                  </div>
                )}
              </form>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" form="create-user-form" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
