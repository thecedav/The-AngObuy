import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useFollow = (storeId?: string, targetUserId?: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (storeId || targetUserId) {
      checkFollowStatus();
      fetchFollowerCount();
    }
  }, [storeId, targetUserId, user]);

  const checkFollowStatus = async () => {
    if (!user || (!storeId && !targetUserId)) return;
    try {
      let query = supabase
        .from('followers')
        .select('id')
        .eq('user_id', user.id);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (targetUserId) {
        query = query.eq('followed_user_id', targetUserId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowerCount = async () => {
    if (!storeId && !targetUserId) return;
    try {
      let query = supabase
        .from('followers')
        .select('*', { count: 'exact', head: true });
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      } else if (targetUserId) {
        query = query.eq('followed_user_id', targetUserId);
      }

      const { count, error } = await query;

      if (error) throw error;
      setFollowerCount(count || 0);
    } catch (error) {
      console.error('Error fetching follower count:', error);
    }
  };

  const toggleFollow = async () => {
    if (!user || (!storeId && !targetUserId)) return;
    setLoading(true);
    try {
      if (isFollowing) {
        let query = supabase
          .from('followers')
          .delete()
          .eq('user_id', user.id);
        
        if (storeId) {
          query = query.eq('store_id', storeId);
        } else if (targetUserId) {
          query = query.eq('followed_user_id', targetUserId);
        }

        const { error } = await query;

        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        const payload: any = { user_id: user.id };
        if (storeId) payload.store_id = storeId;
        if (targetUserId) payload.followed_user_id = targetUserId;

        const { error } = await supabase
          .from('followers')
          .insert(payload);

        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, loading, followerCount, toggleFollow };
};
