import { useState, useEffect } from 'react';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase';

export function useAuth() {
  // undefined = still resolving session; null = signed out; object = signed in
  const [user, setUser]       = useState(undefined);
  const [profile, setProfile] = useState(null);

  const loadProfile = async (uid) => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data ?? null);
  };

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setUser(null); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Sign up with email + password. Returns error or null. */
  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ?? null;
  };

  /**
   * Sign in with username (or email) + password.
   * If the input has no '@', treats it as a username and looks up the email
   * from the profiles table first.
   */
  const signIn = async (usernameOrEmail, password) => {
    let email = usernameOrEmail.trim();
    if (!email.includes('@')) {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', email.toLowerCase())
        .maybeSingle();
      if (!data?.email) return { message: 'Username not found. Check the spelling or sign up.' };
      email = data.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ?? null;
  };

  const signOut = () => supabase.auth.signOut();

  const createProfile = async (username) => {
    if (!user) return { error: 'Not signed in' };
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: clean, email: user.email })
      .select().single();
    if (!error) setProfile(data);
    return { data, error };
  };

  /** Count unclaimed device cards (user_id IS NULL for this device_id) */
  const countDeviceCards = async (deviceId) => {
    if (!deviceId) return 0;
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .is('user_id', null);
    return count || 0;
  };

  /** Migrate all unclaimed device cards to the current user */
  const claimDeviceCards = async (deviceId) => {
    if (!user || !deviceId) return 0;
    const { data } = await supabase
      .from('cards')
      .update({ user_id: user.id })
      .eq('device_id', deviceId)
      .is('user_id', null)
      .select('id');
    return data?.length || 0;
  };

  return {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    createProfile,
    countDeviceCards,
    claimDeviceCards,
  };
}
