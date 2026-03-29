import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { UserProfile } from '@/src/types';
import { User } from '@supabase/supabase-js';
import { getCurrentUserProfile } from '@/src/services/supabaseService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      const data = await getCurrentUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUserWithProfile = async (user: User, extraData?: Partial<UserProfile>) => {
    try {
      console.log('Syncing user with profile:', user.id, extraData);
      
      // Check for existing profile to preserve public_id
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('Error fetching existing profile (non-critical):', fetchError);
      }

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

      // Only add these if they are provided or we are updating
      if (extraData?.cover_image !== undefined) payload.cover_image = extraData.cover_image;
      if (extraData?.bio !== undefined) payload.bio = extraData.bio;
      if (extraData?.province_id !== undefined) payload.province_id = extraData.province_id;
      if (extraData?.municipality_id !== undefined) payload.municipality_id = extraData.municipality_id;

      console.log('Upserting user payload:', payload);

      // Tenta fazer o upsert. Se a trigger já criou o registro, o upsert apenas atualiza os campos extras.
      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase sync error:', error);
        // Se o erro for de permissão (RLS), pode ser que o usuário ainda não esteja totalmente logado na sessão do banco
        throw new Error(`Erro ao salvar perfil: ${error.message}`);
      }
      
      setProfile(data);
      return data;
    } catch (err: any) {
      console.error('Sync process failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    setIsAuthenticating('saindo');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticating(null);
  };

  return { user, profile, loading, isAuthenticating, setIsAuthenticating, refreshProfile, syncUserWithProfile, getCurrentUserProfile, signOut };
}
