import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Building2, Loader2, Shield } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check if user needs to change password after login
  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single();

        if (profile?.must_change_password) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      }
    };

    checkPasswordChangeRequired();
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    setUserEmail(data.email);
    
    try {
      const result = await signIn(data.email, data.password);
      
      if (result.mfaRequired) {
        // User needs to complete 2FA
        await initiateMfaChallenge();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateMfaChallenge = async () => {
    try {
      setMfaLoading(true);
      setMfaError(null);

      // List available MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        setMfaError('Failed to retrieve authentication factors. Please contact support.');
        return;
      }

      // Find a verified TOTP factor
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        setMfaError('Two-factor authentication is not properly set up for this account. Please contact your administrator.');
        return;
      }

      // Create an MFA challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError || !challengeData) {
        setMfaError('Failed to initiate authentication challenge. Please try again.');
        return;
      }

      // Store factor and challenge IDs
      setFactorId(totpFactor.id);
      setChallengeId(challengeData.id);
      setMfaRequired(true);
    } catch (error: any) {
      setMfaError('An unexpected error occurred. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const onMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!factorId || !challengeId || otp.length !== 6) {
      setMfaError('Please enter a valid 6-digit code.');
      return;
    }

    setMfaLoading(true);
    setMfaError(null);

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: otp
      });

      if (error) {
        setMfaError('Invalid authentication code. Please try again.');
        setOtp('');
      } else {
        // Success! Auth state listener will handle redirect
      }
    } catch (error: any) {
      setMfaError('An unexpected error occurred. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setFactorId(null);
    setChallengeId(null);
    setOtp('');
    setMfaError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Construction Profit Tracker
          </CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mfaRequired ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          ) : (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  {userEmail}
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {mfaError && (
                <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded">
                  {mfaError}
                </div>
              )}

              <form onSubmit={onMfaSubmit} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={mfaLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button type="submit" className="w-full" disabled={mfaLoading || otp.length !== 6}>
                  {mfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToLogin}
                  disabled={mfaLoading}
                >
                  Back to Login
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}