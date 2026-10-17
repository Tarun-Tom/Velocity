import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[VELOCITY: SUPABASE] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Realtime multiplayer features will operate in fallback mode.'
  );
}

// Fallback dummy credentials to prevent createClient from throwing if env is absent
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-velocity.supabase.co',
  supabaseAnonKey || 'placeholder-velocity-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
