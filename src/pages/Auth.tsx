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
const logoStackedDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked%20Icon+Logo%20Transparent%202000x2000.png';

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
          Sign in to your account
        </p>

        {/* Form Card */}
        <Card className="w-full max-w-md mx-auto shadow-lg">
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}