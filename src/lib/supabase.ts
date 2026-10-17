import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Default project credentials from .env.txt
const DEFAULT_SUPABASE_URL = 'https://woxmwwujbvjftfenmxgn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aa7GsOY_PY2GnjROq2SrQA_X66tuYdz';

// Prefer environment variables injected by Vite, fallback to active project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      timeout: 20000,
    },
  }
);
