import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BrandedLoader } from '@/components/ui/branded-loader';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 3;
    let retryTimeout: NodeJS.Timeout;
    
    const checkToken = () => {
      // Check both URL hash and search params for tokens
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      
      console.log(`🔍 Token check attempt ${attempts + 1}/${maxAttempts}:`, {
        hash: hash ? `${hash.substring(0, 30)}...` : 'none',
        search: searchParams.toString(),
        fullUrl: window.location.href
      });
      
      // Check for access_token in hash (from /auth/confirm redirect)
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (accessToken && (type === 'recovery' || type === 'magiclink')) {
          console.log('✅ Valid recovery token found in hash');
          setHasToken(true);
          return;
        }
      }
      
      // Check for token_hash in search params (direct link before redirect)
      if (searchParams.has('token_hash') && searchParams.get('type') === 'recovery') {
        console.log('✅ Valid token_hash found in search params');
        setHasToken(true);
        return;
      }
      
      // Retry if no token found yet
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`⏳ Token not found, retrying in 500ms (${attempts}/${maxAttempts})...`);
        retryTimeout = setTimeout(checkToken, 500);
      } else {
        console.error('❌ No reset token found after 3 attempts');
        toast({
          title: 'Invalid Link',
          description: 'This password reset link is invalid or has expired. Please request a new reset link.',
          variant: 'destructive',
        });
        navigate('/auth');
      }
    };
    
    checkToken();
    
    // Cleanup timeout on unmount
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Password Updated',
        description: 'Your password has been reset successfully. Please sign in.',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/auth');
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

  if (!hasToken) {
    return <BrandedLoader message="Validating reset link..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
