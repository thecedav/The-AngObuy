import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { UserProfile } from '@/types';
import { getCurrentUserProfile } from '@/services/supabaseService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  store: any | null;
  loading: boolean;
  isAuthenticating: string | null;
  setIsAuthenticating: (val: string | null) => void;
  refreshProfile: () => Promise<void>;
  syncUserWithProfile: (user: User, extraData?: Partial<UserProfile>) => Promise<UserProfile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);
  
  const fetchInProgress = useRef(false);

  const refreshProfile = async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    try {
      const data = await getCurrentUserProfile();
      setProfile(data);
      
      if (data) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, status, is_active')
          .eq('owner_id', data.id)
          .maybeSingle();
        setStore(storeData);
      } else {
        setStore(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;

        if (data?.user) {
          setUser(data.user);
          // Fetch profile if user exists
          const profileData = await getCurrentUserProfile();
          if (mounted) {
            setProfile(profileData);
            if (profileData) {
              const { data: storeData } = await supabase
                .from('stores')
                .select('id, status, is_active')
                .eq('owner_id', profileData.id)
                .maybeSingle();
              if (mounted) setStore(storeData);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
          setStore(null);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        // Fetch profile on auth change
        const profileData = await getCurrentUserProfile();
        if (mounted) {
          setProfile(profileData);
          if (profileData) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('id, status, is_active')
              .eq('owner_id', profileData.id)
              .maybeSingle();
            if (mounted) setStore(storeData);
          }
        }
      } else {
        setProfile(null);
        setStore(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // SAFETY: prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const syncUserWithProfile = async (user: User, extraData?: Partial<UserProfile>) => {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const publicId = existing?.public_id || `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const payload: any = {
        id: user.id,
        email: user.email,
        full_name: extraData?.full_name || existing?.full_name || user.user_metadata.full_name || '',
        name: extraData?.name || existing?.name || user.user_metadata.full_name || user.email?.split('@')[0],
        whatsapp_number: extraData?.whatsapp_number || existing?.whatsapp_number || '',
        id_number: extraData?.id_number || existing?.id_number || '',
        photo_url: extraData?.photo_url || existing?.photo_url || user.user_metadata.avatar_url,
        public_id: publicId,
        is_admin: user.email === 'thecedav@gmail.com' || existing?.is_admin || extraData?.is_admin || false
      };

      if (extraData?.cover_image !== undefined) payload.cover_image = extraData.cover_image;
      if (extraData?.bio !== undefined) payload.bio = extraData.bio;
      if (extraData?.province_id !== undefined) payload.province_id = extraData.province_id;
      if (extraData?.municipality_id !== undefined) payload.municipality_id = extraData.municipality_id;

      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Sync process failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    setIsAuthenticating('saindo');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setStore(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsAuthenticating(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      store, 
      loading, 
      isAuthenticating, 
      setIsAuthenticating, 
      refreshProfile, 
      syncUserWithProfile, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthContext = useAuth;
