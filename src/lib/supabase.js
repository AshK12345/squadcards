import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = !!(url && key);

export const supabase = SUPABASE_ENABLED
  ? createClient(url, key, {
      auth: {
        flowType: 'implicit',   // no PKCE verifier needed — works across mail apps / new tabs
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
