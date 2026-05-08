import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; mustChangePassword?: boolean }>;
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
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle magic link sign-in - Supabase redirects automatically via redirectTo
        // Log for debugging purposes
        if (event === 'SIGNED_IN' && session) {
          // Check if this was a magic link authentication
          const hash = window.location.hash;
          if (hash && hash.includes('type=magiclink')) {
            console.log('✅ Magic link authentication successful');
          }
        }
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
      // P0 (May 8, 2026): use the user from signInWithPassword's response
      // directly. Previously this code called supabase.auth.getUser() after
      // signInWithPassword to fetch user.id. That second call races against
      // the session being fully written/picked up — and on a slow miss it
      // surfaces as AuthSessionMissingError, which makes supabase-js
      // unconditionally fire `_removeSession()` → SIGNED_OUT event →
      // AuthContext clears `user` → AppLayout `useEffect(() => { if (!user)
      // navigate('/auth') })` bounces the user back to login. Symptom:
      // "Login → spinner → straight back to /auth" even though the auth API
      // call succeeded. signInWithPassword already returns `data.user`, so
      // the second round-trip is unnecessary AND the source of the race.
      // (See node_modules/@supabase/auth-js/src/GoTrueClient.ts:1491.)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      // Check if user must change password using user from signin response.
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', data.user.id)
          .single();

        if (profile?.must_change_password) {
          return { error: null, mustChangePassword: true };
        }
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
      // Check if we have a valid session before attempting to sign out
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        // No active session - silently clear local state and redirect
        setSession(null);
        setUser(null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        // Handle "Session not found" errors gracefully
        if (error.message.includes('Session not found') || error.message.includes('session_not_found')) {
          // Session already invalidated - just clear local state
          setSession(null);
          setUser(null);
          return;
        }
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
      }
    } catch (error: any) {
      // Handle any unexpected errors gracefully
      if (error?.message?.includes('Session not found') || error?.message?.includes('session_not_found')) {
        setSession(null);
        setUser(null);
        return;
      }
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