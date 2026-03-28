import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file or Vercel environment variables.'
  );
}

// Production-safe client initialization
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'angobuy-auth-token',
      flowType: 'pkce'
    },
    global: {
      headers: { 'x-application-name': 'angobuy-marketplace' }
    },
    db: {
      schema: 'public'
    }
  }
);

// Helper to check if Supabase is properly configured (useful for conditional rendering/logic)
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
