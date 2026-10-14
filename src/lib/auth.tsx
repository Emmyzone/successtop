import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
}

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionReady(true);
    });
    // Keep this callback synchronous: calling Supabase inside it can deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileFor(null);
      return;
    }
    let alive = true;
    supabase
      .from('bst_profiles')
      .select('id, full_name, role, is_active')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setProfile((data as Profile | null) ?? null);
        setProfileFor(userId);
      });
    return () => {
      alive = false;
    };
  }, [userId, tick]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return null;
    if (/invalid login/i.test(error.message)) return 'Wrong email or password.';
    if (/fetch|network/i.test(error.message)) return 'Could not reach the server. Check your internet connection.';
    return 'Could not sign in. Please try again.';
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      loading: !sessionReady || (userId !== null && profileFor !== userId),
      isAdmin: Boolean(profile?.is_active && profile.role === 'admin'),
      signIn,
      signOut,
      refreshProfile: () => setTick((t) => t + 1),
    }),
    [session, profile, sessionReady, userId, profileFor, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
