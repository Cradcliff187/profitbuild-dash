import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCompanyBranding } from '@/utils/companyBranding';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
const logoStackedDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked%20Icon+Logo%20Transparent%202000x2000.png';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  // Dynamic Branding State
  const [logoStacked, setLogoStacked] = useState(logoStackedDefault);
  const [companyName, setCompanyName] = useState('RCG Work');
  const [primaryColor, setPrimaryColor] = useState('#1b2b43');
  const [logoError, setLogoError] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // Load company branding
    const loadBranding = async () => {
      const branding = await getCompanyBranding();
      if (branding) {
        if (branding.logo_stacked_url) setLogoStacked(branding.logo_stacked_url);
        if (branding.company_name) setCompanyName(branding.company_name);
        if (branding.primary_color) setPrimaryColor(branding.primary_color);
      }
    };
    loadBranding();
  }, []);

  useEffect(() => {
    if (user) {
      // Respect redirect parameter if present, otherwise go to dashboard
      navigate(redirectTo || '/', { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    const result = await signIn(data.email, data.password);
    
    if (result.mustChangePassword) {
      // Preserve redirect parameter when navigating to password change
      const redirectParam = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
      navigate(`/change-password${redirectParam}`);
    }
    // Note: If password change is not required, the useEffect above will handle redirect
    
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast.error("Email Required", { description: 'Please enter your email address.' });
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.functions.invoke('forgot-password', {
        body: { email: forgotEmail.trim() }
      });

      if (error) throw error;

      setForgotSent(true);
      toast.success("Reset Link Sent", { description: 'If an account exists with that email, you will receive a password reset link.' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Hero Logo Section */}
        <div className="flex justify-center">
          <img 
            src={logoStacked} 
            alt={companyName} 
            className="block w-auto h-32 sm:h-36 transition-opacity hover:opacity-90"
            style={{ maxWidth: '250px', objectFit: 'contain' }}
            onError={(e) => {
              console.error('❌ Failed to load stacked logo from:', logoStacked);
              setLogoError(true);
              e.currentTarget.src = logoStackedDefault;
            }}
            onLoad={() => console.log('✅ Successfully loaded stacked logo')}
          />
        </div>
        
        {logoError && (
          <h1 className="text-2xl font-bold text-center" style={{ color: primaryColor }}>
            {companyName}
          </h1>
        )}
        
        <p className="text-sm text-muted-foreground text-center">
          {forgotPassword ? 'Reset your password' : 'Sign in to your account'}
        </p>

        {/* Form Card */}
        <Card className="w-full max-w-md mx-auto shadow-lg">
          {!forgotPassword && (
            <CardContent className="p-6 space-y-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  style={{
                    backgroundColor: '#1b2b43',
                    color: '#ffffff'
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => setForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
              </form>
            </CardContent>
          )}

          {forgotPassword && (
            <CardContent className="p-6 space-y-4">
              {forgotSent ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-md text-center space-y-2">
                    <p className="text-sm font-medium">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      If an account exists with that email, you'll receive a password reset link. The link is valid for 24 hours.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      setForgotPassword(false);
                      setForgotSent(false);
                      setForgotEmail('');
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="forgotEmail">Email</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium"
                    style={{
                      backgroundColor: '#1b2b43',
                      color: '#ffffff'
                    }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm"
                    onClick={() => {
                      setForgotPassword(false);
                      setForgotEmail('');
                    }}
                  >
                    Back to Sign In
                  </Button>
                </form>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}