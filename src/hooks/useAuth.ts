import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { getCurrentUserProfile } from '@/services/supabaseService';

export function useAuth() {
  const context = useAuthContext();
  
  return { 
    ...context, 
    getCurrentUserProfile // Re-exporting for compatibility if needed
  };
}
