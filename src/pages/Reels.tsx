import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Music, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Post } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useFollow } from '@/hooks/useFollow';
import { cn } from '@/lib/utils';

export const ReelsPage = () => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, store:stores(*)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {reels.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-500">
          Nenhum reel disponível ainda.
        </div>
      ) : (
        reels.map((reel, index) => (
          <ReelItem key={reel.id} reel={reel} isActive={index === currentIndex} />
        ))
      )}
    </div>
  );
};

interface ReelItemProps {
  reel: Post;
  isActive: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({ reel, isActive }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(reel.store_id);
  const [isLiked, setIsLiked] = useState(false);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }
    await toggleFollow();
  };

  return (
    <div className="h-screen w-full snap-start relative bg-slate-900 flex items-center justify-center overflow-hidden">
      {/* Video Placeholder or Image */}
      {reel.images && reel.images.length > 0 ? (
        <img 
          src={reel.images[0]} 
          alt="Reel content" 
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-600">
          Conteúdo do Reel
        </div>
      )}

      {/* Overlay Content */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={(e) => { handleAction(e); setIsLiked(!isLiked); }}
            className="p-2 text-white transition-all active:scale-125"
          >
            <Heart size={32} fill={isLiked ? '#ef4444' : 'none'} className={isLiked ? 'text-red-500' : 'text-white'} />
          </button>
          <span className="text-xs font-bold text-white shadow-sm">{(reel.likes_count || 0) + (isLiked ? 1 : 0)}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button onClick={handleAction} className="p-2 text-white transition-all active:scale-125">
            <MessageCircle size={32} />
          </button>
          <span className="text-xs font-bold text-white shadow-sm">{reel.comments_count || 0}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button onClick={handleAction} className="p-2 text-white transition-all active:scale-125">
            <Share2 size={32} />
          </button>
        </div>

        <button className="p-2 text-white transition-all active:scale-125">
          <MoreHorizontal size={24} />
        </button>

        <div className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden mt-2">
          {reel.store?.profile_image ? (
            <img src={reel.store.profile_image} alt="Music" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white"><Music size={16} /></div>
          )}
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-6 left-4 right-16 z-10 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-10 h-10 rounded-full border-2 border-orange-500 overflow-hidden cursor-pointer"
            onClick={() => navigate(`/store/${reel.store_id}`)}
          >
            {reel.store?.profile_image ? (
              <img src={reel.store.profile_image} alt={reel.store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center font-bold">{reel.store?.name?.[0]}</div>
            )}
          </div>
          <span 
            className="font-bold text-sm cursor-pointer hover:text-orange-400 transition-colors"
            onClick={() => navigate(`/store/${reel.store_id}`)}
          >
            {reel.store?.name}
          </span>
          {user?.id !== reel.store?.owner_id && (
            <button 
              onClick={handleFollow}
              disabled={followLoading}
              className={cn(
                "px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all shadow-lg",
                isFollowing 
                  ? "bg-slate-800 text-slate-400 border border-white/10 shadow-none" 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20"
              )}
            >
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>

        <p className="text-sm line-clamp-2 mb-4 leading-relaxed">
          {reel.content}
        </p>

        {reel.type === 'product' && (
          <button 
            onClick={() => navigate(`/product/${reel.id}`)}
            className="mb-4 w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors pointer-events-auto"
          >
            Ver Produto
          </button>
        )}

        <div className="flex items-center gap-2 text-xs bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit">
          <Music size={12} className="animate-spin-slow" />
          <span className="max-w-[150px] truncate">Áudio original - {reel.store?.name}</span>
        </div>
      </div>
    </div>
  );
};
