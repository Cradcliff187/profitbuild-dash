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
import { Loader2, Eye, EyeOff } from 'lucide-react';
const logoStackedDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/horiztonal%20glossy.png';

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
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12"
      style={{
        background: 'linear-gradient(165deg, #1b2b43 0%, #243752 30%, #d4dce4 65%, #f4f7f9 100%)',
      }}
    >
      {/* Main Content — vertically centered */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center">

        {/* Hero Logo */}
        <div className="mb-2 flex justify-center w-full">
          <img
            src={logoStacked}
            alt={companyName}
            className="w-auto h-auto max-h-[140px] sm:max-h-[170px] object-contain drop-shadow-lg transition-opacity duration-300 hover:opacity-95"
            style={{ maxWidth: '480px' }}
            onError={(e) => {
              console.error('Failed to load stacked logo from:', logoStacked);
              setLogoError(true);
              e.currentTarget.src = logoStackedDefault;
            }}
            onLoad={() => console.log('Successfully loaded stacked logo')}
          />
        </div>

        {/* Fallback company name when logo fails */}
        {logoError && (
          <h1
            className="text-2xl sm:text-3xl font-bold text-center tracking-tight mb-1"
            style={{ color: primaryColor }}
          >
            {companyName}
          </h1>
        )}

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-slate-400 mb-8 text-center select-none">
          {forgotPassword ? 'Reset your password' : 'Sign in to your account'}
        </p>

        {/* Card */}
        <Card className="w-full rounded-xl border-0 shadow-[0_10px_40px_-5px_rgba(27,43,67,0.13)] overflow-hidden">
          {/* Orange accent top border */}
          <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #cf791d 0%, #e8983f 100%)' }} />

          {/* ── Sign In Form ── */}
          {!forgotPassword && (
            <CardContent className="px-7 pt-8 pb-7">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-600">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="h-12 rounded-lg border-slate-200 bg-slate-50/60 px-4 text-[15px] placeholder:text-slate-350 focus:border-[#cf791d] focus:ring-[#cf791d]/20 transition-colors"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-600">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="h-12 rounded-lg border-slate-200 bg-slate-50/60 px-4 pr-11 text-[15px] placeholder:text-slate-350 focus:border-[#cf791d] focus:ring-[#cf791d]/20 transition-colors"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg text-[15px] font-semibold tracking-wide shadow-md hover:shadow-lg transition-all duration-200"
                  style={{
                    backgroundColor: '#1b2b43',
                    color: '#ffffff',
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Sign In
                </Button>

                {/* Forgot password link */}
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    className="text-sm text-slate-400 hover:text-[#cf791d] transition-colors duration-200 cursor-pointer"
                    onClick={() => setForgotPassword(true)}
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </CardContent>
          )}

          {/* ── Forgot Password Form / Confirmation ── */}
          {forgotPassword && (
            <CardContent className="px-7 pt-8 pb-7">
              {forgotSent ? (
                <div className="space-y-5">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-5 text-center space-y-2">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-700">Check your email</p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      If an account exists with that email, you will receive a password reset link. The link is valid for 24 hours.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-lg text-[15px] font-medium border-slate-200 hover:bg-slate-50 transition-colors"
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
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Enter the email address associated with your account and we will send you a link to reset your password.
                  </p>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="forgotEmail" className="text-sm font-medium text-slate-600">
                      Email Address
                    </Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="name@company.com"
                      className="h-12 rounded-lg border-slate-200 bg-slate-50/60 px-4 text-[15px] placeholder:text-slate-350 focus:border-[#cf791d] focus:ring-[#cf791d]/20 transition-colors"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-lg text-[15px] font-semibold tracking-wide shadow-md hover:shadow-lg transition-all duration-200"
                    style={{
                      backgroundColor: '#1b2b43',
                      color: '#ffffff',
                    }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : null}
                    Send Reset Link
                  </Button>

                  {/* Back link */}
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      className="text-sm text-slate-400 hover:text-[#cf791d] transition-colors duration-200 cursor-pointer"
                      onClick={() => {
                        setForgotPassword(false);
                        setForgotEmail('');
                      }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Footer pinned to bottom */}
      <p className="mt-auto pt-10 text-[11px] text-slate-400/80 tracking-wide text-center select-none">
        &copy; 2026 Radcliff Construction Group, LLC
      </p>
    </div>
  );
}