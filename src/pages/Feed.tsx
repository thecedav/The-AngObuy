import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Post, Advertisement } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Heart, MessageCircle, Share2, MoreHorizontal, ShoppingBag, Wrench, Bookmark, ExternalLink, Facebook, Instagram, Link, Send, Reply, Trash2, Plus, ShoppingCart, Minus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFollow } from '@/hooks/useFollow';
import { Comment } from '@/types';

export const FeedPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          store:stores(
            *,
            province:province_id(id, name),
            municipality:municipality_id(id, name)
          ),
          cart_count:cart_items(count)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          store:stores(
            *,
            province:province_id(id, name),
            municipality:municipality_id(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      // Combine and sort
      const combined = [
        ...(productsData || []).map((p: any) => ({ ...p, type: 'product' as const, content: p.description })),
        ...(servicesData || []).map((s: any) => ({ ...s, type: 'service' as const, content: s.description }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPosts(combined as any);

      // Fetch news feed ads
      const { data: adsData, error: adsError } = await supabase
        .from('advertisements')
        .select('*')
        .eq('active', true)
        .eq('placement', 'news_feed');

      if (adsError) throw adsError;
      setAds(adsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-96 bg-slate-900/50 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  // Combine posts and ads
  const combinedFeed: (Post | Advertisement)[] = [];
  const adFrequency = 3; // Show an ad every 3 posts

  posts.forEach((post, index) => {
    combinedFeed.push(post);
    if ((index + 1) % adFrequency === 0 && ads.length > 0) {
      const adIndex = Math.floor(index / adFrequency) % ads.length;
      combinedFeed.push(ads[adIndex]);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-3 mb-6">
        <h2 className="text-xl font-black uppercase tracking-tight">Feed do Marketplace</h2>
        
        {/* Marketplace Filters right below the title */}
        <div className="w-full max-w-xs bg-slate-900/50 backdrop-blur-md p-1 rounded-full border border-white/10 flex items-center justify-center gap-1">
          <button className="flex-1 px-3 py-1.5 rounded-full bg-orange-500 text-black text-[10px] font-black uppercase transition-all active:scale-95">Todos</button>
          <button className="flex-1 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase hover:text-white transition-all active:scale-95">Produtos</button>
          <button className="flex-1 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase hover:text-white transition-all active:scale-95">Serviços</button>
        </div>
      </div>

      {combinedFeed.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-500">Ainda não há publicações. Seja o primeiro a partilhar algo!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {combinedFeed.map((item, index) => {
            const isAd = 'placement' in item;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 5) * 0.1 }}
              >
                {isAd ? (
                  <AdCard ad={item as Advertisement} />
                ) : (
                  <PostCard post={item as Post} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdCard = ({ ad }: { ad: Advertisement }) => {
  return (
    <div className="bg-slate-900/40 border md:rounded-lg border-orange-500/30 mb-4 md:mb-6 overflow-hidden relative">
      <div className="absolute top-2 right-2 z-10">
        <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          Patrocinado
        </span>
      </div>

      {ad.image_url ? (
        <div className="aspect-video w-full overflow-hidden">
          <img 
            src={ad.image_url} 
            alt={ad.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-900 to-orange-900/20 min-h-[200px]">
          <h3 className="text-xl font-bold text-white mb-2">{ad.title}</h3>
          <p className="text-slate-300 text-sm max-w-md">{ad.content}</p>
        </div>
      )}

      <div className="p-4 flex items-center justify-between bg-black/40 backdrop-blur-sm border-t border-white/5">
        <div className="flex-1">
          {ad.image_url && <h3 className="font-bold text-white text-sm mb-1">{ad.title}</h3>}
          <p className="text-slate-400 text-xs line-clamp-1">{ad.content}</p>
        </div>
        {ad.link_url && (
          <a 
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
          >
            Saiba Mais
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
};

const PostCard = ({ post }: { post: Post }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { addItem, items } = useCart(user?.id);
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(post.store_id);
  const [isLiked, setIsLiked] = useState(false);
  const cartItem = items.find(item => item.product_id === post.id);
  const isInCart = !!cartItem;
  const currentCartCount = cartItem && !isNaN(cartItem.quantity) ? cartItem.quantity : 0;
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into hierarchy
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      data?.forEach((c: any) => {
        const comment = { ...c, replies: [] };
        commentMap.set(c.id, comment);
      });

      data?.forEach((c: any) => {
        const comment = commentMap.get(c.id)!;
        if (c.parent_id && commentMap.has(c.parent_id)) {
          commentMap.get(c.parent_id)!.replies!.push(comment);
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate('/auth');
    setIsLiked(!isLiked);
    // In a real app, update DB here
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate('/auth');
    if (post.type === 'service') {
      confirmAddToCart();
    } else {
      setShowQuantityModal(true);
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

  const confirmAddToCart = async () => {
    const { error } = await addItem(post.id, quantity, post.type);
    if (error) {
      alert(typeof error === 'string' ? error : (error as any).message || 'Erro ao adicionar ao carrinho');
    }
    setShowQuantityModal(false);
  };

  const handleShare = (platform: string) => {
    const url = `${window.location.origin}/product/${post.public_id}`;
    const text = `Confira este ${post.type === 'product' ? 'produto' : 'serviço'} no The Cedav: ${post.title}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
        // Instagram doesn't have a direct share URL for web, usually copy link is used
        navigator.clipboard.writeText(url);
        alert('Link copiado para o Instagram!');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copiado!');
        break;
    }
    setShowShare(false);
  };

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment,
          parent_id: replyTo?.id || null
        })
        .select('*, user:users(*)')
        .single();

      if (error) throw error;

      if (replyTo) {
        // Update local state for reply
        setComments(prev => {
          const updateReplies = (list: Comment[]): Comment[] => {
            return list.map(c => {
              if (c.id === replyTo.id) {
                return { ...c, replies: [...(c.replies || []), { ...data, replies: [] }] };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateReplies(c.replies) };
              }
              return c;
            });
          };
          return updateReplies(prev);
        });
      } else {
        setComments(prev => [...prev, { ...data, replies: [] }]);
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  return (
    <div className="ps6-card bg-black border-b md:border md:rounded-lg border-white/10 mb-4 md:mb-6 overflow-hidden relative group">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/store/${post.store_id}`)}
        >
          <div 
            className="w-10 h-10 rounded-full p-[2px] shadow-lg"
            style={{
              background: 'conic-gradient(#f97316 0deg 120deg, #3b82f6 120deg 240deg, #fff 240deg 360deg)'
            }}
          >
            <div className="w-full h-full rounded-full bg-black p-[2px]">
              {post.store?.profile_image ? (
                <img src={post.store.profile_image} alt={post.store.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                  {post.store?.name?.[0] || 'S'}
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-black text-sm hover:text-slate-400 cursor-pointer transition-colors flex items-center gap-1 uppercase tracking-tight">
              {post.store?.name}
              <span className="text-slate-500 font-normal ml-1">• {formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: false }).replace('cerca de ', '').replace('menos de ', '').replace('um minuto', '1m').replace('minutos', 'm').replace('horas', 'h').replace('hora', 'h').replace('dias', 'd').replace('dia', 'd')}</span>
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
              <span>{post.store?.province?.name}</span>
              <span>•</span>
              <span>{post.store?.municipality?.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(post.type === 'product' || post.type === 'service') && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAddToCart}
              className={cn(
                "p-2 rounded-full transition-colors relative bg-white/5 border border-white/10",
                isInCart ? "text-orange-500 border-orange-500/50" : "text-white hover:bg-white/10"
              )}
              title={isInCart ? "No Carrinho" : "Adicionar ao Carrinho"}
            >
              <ShoppingCart className="w-5 h-5" />
              {currentCartCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-orange-500 rounded-full flex items-center justify-center px-0.5 shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                  <span className="text-[8px] font-black text-white">{currentCartCount}</span>
                </div>
              )}
            </motion.button>
          )}
          {user?.id !== post.store?.owner_id && (
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
      </div>

      {/* Media */}
      {post.images && post.images.length > 0 && (
        <div 
          className="relative aspect-square overflow-hidden bg-slate-900 cursor-pointer"
          onClick={() => navigate(`/product/${post.public_id}`)}
          onDoubleClick={handleLike}
        >
          <img 
            src={post.images[0]} 
            alt={post.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          
          {/* Gradient Overlay for Title and Price */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
            <div className="flex flex-wrap gap-1 mb-2">
              {post.is_imported && (
                <span className="bg-blue-500/80 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  Importado
                </span>
              )}
              {post.is_preorder && (
                <span className="bg-purple-500/80 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  Sob Encomenda
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-2">{post.title}</h3>
            <p className="text-orange-500 font-black text-xl mt-1 drop-shadow-lg">
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: post.currency || 'AOA' }).format(post.price || 0)}
            </p>
          </div>

          <div className="absolute top-3 right-3">
            <div className="bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-white/10">
              {post.type === 'product' ? <ShoppingBag size={10} /> : <Wrench size={10} />}
              {post.type === 'product' ? 'PRODUTO' : 'SERVIÇO'}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={cn('flex items-center gap-1.5 transition-all active:scale-125 group', isLiked ? 'text-red-500' : 'text-white hover:text-slate-400')}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} className={cn(isLiked && "fill-red-500")} />
              <span className="text-xs font-bold">{(post.likes_count || 0) + (isLiked ? 1 : 0)}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className="flex items-center gap-1.5 text-white hover:text-blue-500 transition-all active:scale-125 group"
            >
              <MessageCircle size={24} className="group-hover:fill-blue-500 transition-colors" />
              <span className="text-xs font-bold">{comments.length}</span>
            </button>
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowShare(!showShare); }}
                className="text-white hover:text-slate-400 transition-all active:scale-125"
              >
                <Share2 size={24} />
              </button>
              
              <AnimatePresence>
                {showShare && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex gap-2"
                  >
                    <button onClick={() => handleShare('whatsapp')} className="p-2 hover:bg-white/5 rounded-lg text-green-500 transition-colors"><Send size={20} /></button>
                    <button onClick={() => handleShare('facebook')} className="p-2 hover:bg-white/5 rounded-lg text-blue-500 transition-colors"><Facebook size={20} /></button>
                    <button onClick={() => handleShare('instagram')} className="p-2 hover:bg-white/5 rounded-lg text-pink-500 transition-colors"><Instagram size={20} /></button>
                    <button onClick={() => handleShare('copy')} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"><Link size={20} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Cart button moved to header */}
          </div>
        </div>

        {/* Quantity Modal */}
        <AnimatePresence>
          {showQuantityModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuantityModal(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-black border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-[280px] text-center"
              >
                <h3 className="text-white font-bold mb-4">Escolher Quantidade</h3>
                <div className="flex items-center justify-center gap-6 mb-6">
                  <button 
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl font-black text-white w-8">{Number.isNaN(quantity) ? 1 : quantity}</span>
                  <button 
                    onClick={() => setQuantity(prev => (post.stock ? Math.min(post.stock, prev + 1) : prev + 1))}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {post.stock && <p className="text-[10px] text-slate-500 mb-4">Stock disponível: {post.stock}</p>}
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={confirmAddToCart}
                    className="w-full py-3 bg-orange-500 text-black rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button 
                    onClick={() => setShowQuantityModal(false)}
                    className="w-full py-3 bg-transparent text-slate-500 rounded-xl font-bold text-sm hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Info removed as requested */}

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5 mt-4 pt-4 space-y-4"
            >
              {/* Comment List */}
              <div className="max-h-60 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                {comments.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-4">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  comments.map(comment => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      onReply={(c) => { setReplyTo(c); }} 
                    />
                  ))
                )}
              </div>

              {/* Reply Indicator */}
              {replyTo && (
                <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400">Respondendo a <span className="text-white font-bold">@{replyTo.user?.name}</span></span>
                  <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white"><Trash2 size={12} /></button>
                </div>
              )}

              {/* Add Comment Input */}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? "Escreva uma resposta..." : "Adicione um comentário..."}
                  className="flex-1 bg-slate-900 border border-white/5 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                />
                <button 
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="text-orange-500 font-bold text-sm disabled:opacity-50 transition-opacity px-2"
                >
                  Publicar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onReply: (c: Comment) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply }) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
          {comment.user?.photo_url ? (
            <img src={comment.user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-500">
              {comment.user?.name?.[0] || 'U'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold">{comment.user?.name}</span>
            <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true })}</span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">{comment.content}</p>
          <button 
            onClick={() => onReply(comment)}
            className="text-[10px] text-slate-500 hover:text-white font-bold mt-1 transition-colors"
          >
            Responder
          </button>
        </div>
      </div>
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-9 space-y-3 border-l border-white/5 pl-4">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
};
