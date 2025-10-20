import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; mfaRequired?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || email,
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Account created! Check your email for verification link.');
      return { error: null };
    } catch (error: any) {
      toast.error('An unexpected error occurred');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if account is locked
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_locked_until, failed_login_attempts')
        .eq('email', email)
        .single();

      if (profile?.account_locked_until) {
        const lockoutEnd = new Date(profile.account_locked_until);
        if (lockoutEnd > new Date()) {
          const minutesRemaining = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000);
          toast.error(`Account is locked. Try again in ${minutesRemaining} minutes.`);
          return { error: { message: 'Account locked' } };
        }
      }

      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if this is an MFA-required error (not a credential failure)
        const isMfaRequired = error.message?.toLowerCase().includes('mfa') || 
                             error.message?.toLowerCase().includes('two-factor') ||
                             error.message?.toLowerCase().includes('aal2') ||
                             error.message?.includes('factor');
        
        if (isMfaRequired) {
          // Don't count MFA challenges as failed login attempts
          return { error: null, mfaRequired: true };
        }
        
        // Track failed login attempt for actual credential errors
        const failedAttempts = (profile?.failed_login_attempts || 0) + 1;
        
        if (failedAttempts >= 5) {
          // Lock account for 30 minutes
          const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
          await supabase
            .from('profiles')
            .update({
              failed_login_attempts: failedAttempts,
              account_locked_until: lockoutUntil.toISOString(),
            })
            .eq('email', email);
          
          toast.error('Too many failed attempts. Account locked for 30 minutes.');
        } else {
          await supabase
            .from('profiles')
            .update({ failed_login_attempts: failedAttempts })
            .eq('email', email);
          
          toast.error(error.message);
        }
        
        return { error };
      }

      // Check if session requires MFA (AAL level check)
      if (data?.session) {
        const aal = (data.session as any).aal;
        if (aal === 'aal1') {
          // Session exists but needs MFA upgrade
          return { error: null, mfaRequired: true };
        }
      }

      // Reset failed login attempts on successful login
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ 
            failed_login_attempts: 0,
            account_locked_until: null 
          })
          .eq('id', data.user.id);
      }

      toast.success('Welcome back!');
      return { error: null };
    } catch (error: any) {
      toast.error('An unexpected error occurred');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred');
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};