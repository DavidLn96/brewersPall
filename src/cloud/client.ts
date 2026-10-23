import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// VITE_* for local .env files; NEXT_PUBLIC_* as set by Vercel's Supabase integration.
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The Supabase client, or null when the app is built without Supabase settings.
 * Without them the app runs in browser-only mode (Phase 1 behavior).
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;

export function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export function signOut() {
  return supabase?.auth.signOut();
}
