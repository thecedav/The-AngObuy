import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please configure them in the setup screen or environment variables.');
}

// Singleton pattern for the Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Helper to check connection
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('provinces').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
};
