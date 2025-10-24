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
import { getCompanyBranding } from '@/utils/companyBranding';
import { Loader2 } from 'lucide-react';
import logoStackedDefault from '@/assets/branding/logo-stacked.svg';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  
  // Dynamic Branding State
  const [logoStacked, setLogoStacked] = useState(logoStackedDefault);
  const [companyName, setCompanyName] = useState('Construction Profit Tracker');
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
      navigate('/');
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    const result = await signIn(data.email, data.password);
    
    if (result.mustChangePassword) {
      navigate('/change-password');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {/* Hero Logo Section */}
        <div className="text-center">
          <div className="flex justify-center mb-0">
            <img 
              src={logoStacked} 
              alt={companyName} 
              className="h-[28rem] md:h-[36rem] w-auto transition-opacity hover:opacity-90"
              style={{ maxWidth: '800px' }}
              onError={(e) => {
                console.error('❌ Failed to load stacked logo from:', logoStacked);
                setLogoError(true);
                e.currentTarget.src = logoStackedDefault;
              }}
              onLoad={() => console.log('✅ Successfully loaded stacked logo')}
            />
          </div>
          <h1 className="text-2xl font-bold -mt-4" style={{ color: primaryColor }}>
            {companyName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account
          </p>
        </div>

        {/* Form Card */}
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}