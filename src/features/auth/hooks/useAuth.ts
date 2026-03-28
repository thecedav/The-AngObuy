import { useAuth as useAuthContext } from '@/features/auth/context/AuthContext';
import { getCurrentUserProfile } from '@/services/supabase/supabaseService';

export function useAuth() {
  const context = useAuthContext();
  
  return { 
    ...context, 
    getCurrentUserProfile // Re-exporting for compatibility if needed
  };
}
