import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Store, Post, Advertisement } from '@/types/index';
import { Grid, ShoppingBag, Wrench, User, ArrowLeft, MessageCircle, CheckCircle, Star, MapPin, MoreHorizontal, Camera, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight, Plus, Heart, Share2, LayoutDashboard } from 'lucide-react';
import { recordStoreView } from '@/services/supabase/supabaseService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/helpers/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFollow } from '@/features/stores/hooks/useFollow';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const StoreProfilePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, loading: followLoading, followerCount, toggleFollow } = useFollow(storeId);
  
  const [store, setStore] = useState<Store | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'reviews'>('products');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user?.id === store?.owner_id;

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
      fetchStorePosts();
      fetchAds();
      fetchReviews();
      recordStoreView(storeId, user?.id);
    }
  }, [storeId, user?.id]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, user:user_id(id, full_name, photo_url)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Reviews table not found. Please create it in Supabase.');
          setReviews([]);
          return;
        }
        throw error;
      }
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !storeId) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          store_id: storeId,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment
        });

      if (error) {
        if (error.code === 'PGRST205') {
          alert('A funcionalidade de avaliações ainda não está configurada no banco de dados.');
          return;
        }
        throw error;
      }
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [ads]);

  const fetchStoreData = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*, province:province_id(id, name), municipality:municipality_id(id, name)')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setStore(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  };

  const fetchStorePosts = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      // Combine and sort
      const combined = [
        ...(productsData || []).map((p: any) => ({ ...p, type: 'product' as const, content: p.description })),
        ...(servicesData || []).map((s: any) => ({ ...s, type: 'service' as const, content: s.description }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPosts(combined as any);
    } catch (error) {
      console.error('Error fetching store posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async () => {
    try {
      // Fetch news ads for this store or global cover ads
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('active', true)
        .eq('placement', 'cover')
        .or(`target_store_id.is.null,target_store_id.eq.${storeId}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    setUploadingProfile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${store.id}-profile.${fileExt}`;
      const filePath = `store-profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stores')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stores')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('stores')
        .update({ profile_image: publicUrl })
        .eq('id', store.id);

      if (updateError) throw updateError;
      setStore({ ...store, profile_image: publicUrl });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await toggleFollow();
  };

  const handleMessage = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?chatId=${storeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-8 text-center bg-black min-h-screen text-white">
        <p className="text-slate-500">Loja não encontrada.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 flex items-center gap-2 justify-center mx-auto">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    );
  }

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'products') return post.type === 'product';
    if (activeTab === 'services') return post.type === 'service';
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Cover Image / Ads Carousel */}
      <div className="h-48 md:h-80 bg-slate-900 relative overflow-hidden">
        {ads.length > 0 ? (
          <div className="w-full h-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={ads[currentAdIndex].id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="w-full h-full"
              >
                {ads[currentAdIndex].media_urls?.[0] || ads[currentAdIndex].image_url ? (
                  <div className="w-full h-full">
                    { (ads[currentAdIndex].media_urls?.[0]?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || ads[currentAdIndex].media_urls?.[0]?.includes('video')) ? (
                      <video 
                        src={ads[currentAdIndex].media_urls[0]} 
                        autoPlay 
                        muted 
                        loop 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={ads[currentAdIndex].media_urls?.[0] || ads[currentAdIndex].image_url} 
                        alt="Ad" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 p-8 text-center">
                    <p className="text-xl font-bold text-white">{ads[currentAdIndex].content}</p>
                  </div>
                )}
                
                {/* Ad Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <div className="max-w-xl">
                    {ads[currentAdIndex].title && <h2 className="text-2xl font-bold mb-2">{ads[currentAdIndex].title}</h2>}
                    {ads[currentAdIndex].link_url && (
                      <a 
                        href={ads[currentAdIndex].link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-orange-500 text-black rounded-lg font-bold text-sm hover:bg-orange-600 transition-all"
                      >
                        Ver Mais
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Carousel Controls */}
            {ads.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentAdIndex(prev => (prev - 1 + ads.length) % ads.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setCurrentAdIndex(prev => (prev + 1) % ads.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 right-6 flex gap-1.5">
                  {ads.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === currentAdIndex ? "bg-orange-500 w-4" : "bg-white/30"
                      )} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <p className="text-slate-700 italic">Espaço para publicidade</p>
          </div>
        )}

        {/* Action Buttons over Banner */}
        {!isOwner && (
          <div className="absolute bottom-4 left-4 md:left-8 z-30 flex items-center gap-2">
            <button 
              onClick={handleFollow}
              disabled={followLoading}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-bold transition-all shadow-lg",
                isFollowing 
                  ? "bg-slate-800/80 backdrop-blur-md text-white border border-white/10" 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
              )}
            >
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
            <button 
              onClick={handleMessage}
              className="px-6 py-2 bg-black/50 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-black/70 transition-all text-xs font-bold shadow-lg"
            >
              Mensagem
            </button>
          </div>
        )}
      </div>

      {/* Profile Header (Instagram Style) */}
      <div className="max-w-4xl mx-auto px-4 relative">
        {/* Overlapping Avatar */}
        <div className="absolute -top-14 md:-top-24 left-4 md:left-8 z-20 group">
          <div 
            className="w-28 h-28 md:w-48 md:h-48 rounded-full p-1 shadow-2xl"
            style={{
              background: 'conic-gradient(#f97316 0deg 120deg, #3b82f6 120deg 240deg, #fff 240deg 360deg)'
            }}
          >
            <div className="w-full h-full rounded-full border-4 border-black bg-slate-800 overflow-hidden relative">
              {store.profile_image ? (
                <img src={store.profile_image} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User size={64} />
                </div>
              )}
              {isOwner && (
                <div 
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                >
                  <Camera size={32} className="text-white" />
                </div>
              )}
              {uploadingProfile && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <input type="file" ref={profileInputRef} onChange={handleProfileUpload} className="hidden" accept="image/*" />
        </div>

        <div className="flex flex-col gap-6 pt-4 md:pt-10 mb-10">
          {/* Store Name Row */}
          <div className="pl-32 md:pl-60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-widest">{store.name}</h1>
              {store.status === 'approved' && <CheckCircle className="text-blue-500 fill-blue-500" size={20} />}
            </div>
            
            {isOwner && (
              <div className="flex items-center gap-2">
                {(store.status === 'approved' || store.is_active) && (
                  <>
                    <button 
                      onClick={() => navigate(`/business-management/${storeId}`)}
                      className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <LayoutDashboard size={14} />
                      Gestão
                    </button>
                    <button 
                      onClick={() => navigate(`/edit-store/${storeId}`)}
                      className="px-6 py-1.5 bg-slate-900 text-white rounded-lg border border-white/10 hover:bg-slate-800 transition-all text-sm font-bold"
                    >
                      Editar Perfil
                    </button>
                  </>
                )}
                <button 
                  onClick={() => navigate('/create')}
                  className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Stats - Separated */}
          <div className="flex items-center justify-center gap-12 text-sm md:text-base border-y border-white/5 py-4">
            <div className="text-center">
              <span className="block font-black text-lg">{posts.length}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Publicações</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-lg">{followerCount}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Seguidores</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-lg">{reviews.length}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Avaliações</span>
            </div>
          </div>

          {/* Bio - Centered */}
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <p className="text-lg font-medium text-slate-200 leading-relaxed italic">
              {store.description || 'Moda africana premium e acessórios exclusivos para quem valoriza a cultura e o estilo.'}
            </p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <ShoppingBag size={10} className="text-orange-500" />
                <span>{store.type === 'selling' ? 'Moda & Acessórios' : 'Prestação de Serviços'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <Grid size={10} className="text-orange-500" />
                <span>ID: {store.public_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicator for Owner */}
        {isOwner && (
          <div className="mb-6">
            <div className={cn(
              "inline-flex items-center gap-2 text-[10px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold",
              store.status === 'approved' 
                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                : store.status === 'pending'
                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              {store.status === 'approved' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              <span>Loja {store.status === 'approved' ? 'Ativada' : store.status === 'pending' ? 'Em Aprovação' : 'Desativada'}</span>
            </div>
          </div>
        )}

        {/* Divider with Gradient */}
        <div className="h-[1px] w-full bg-white/10 mb-2" />

        {/* Tabs Row */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex bg-slate-900/50 p-1 rounded-full border border-white/5 shrink-0 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('products')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                activeTab === 'products' ? "bg-white text-black" : "text-slate-400 hover:text-white"
              )}
            >
              Produtos ({posts.filter(p => p.type === 'product').length})
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                activeTab === 'services' ? "bg-white text-black" : "text-slate-400 hover:text-white"
              )}
            >
              Serviços ({posts.filter(p => p.type === 'service').length})
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                activeTab === 'reviews' ? "bg-white text-black" : "text-slate-400 hover:text-white"
              )}
            >
              Avaliações ({reviews.length})
            </button>
          </div>
        </div>

        {/* Feed Area */}
        <div className="space-y-6">
          {activeTab === 'reviews' ? (
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Review Form */}
              {!isOwner && user && (
                <Card className="p-6 bg-slate-900/50 border-white/10">
                  <h3 className="text-lg font-bold mb-4">Avaliar Loja</h3>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={cn(
                            "p-1 transition-colors",
                            star <= newReview.rating ? "text-yellow-400" : "text-slate-600"
                          )}
                        >
                          <Star size={24} fill={star <= newReview.rating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Escreva sua avaliação..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500 h-32"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                      {submittingReview ? 'Enviando...' : 'Publicar Avaliação'}
                    </button>
                  </form>
                </Card>
              )}

              {/* Reviews List */}
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500">Ainda não há avaliações para esta loja.</p>
                  </div>
                ) : (
                  reviews.map((review: any) => (
                    <div key={review.id} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                            {review.user?.photo_url ? (
                              <img src={review.user.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{review.user?.full_name || 'Usuário'}</p>
                            <p className="text-[10px] text-slate-500">{format(new Date(review.created_at), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={star <= review.rating ? "text-yellow-400" : "text-slate-700"}
                              fill={star <= review.rating ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              Nenhum item encontrado nesta categoria.
            </div>
          ) : activeTab === 'products' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {filteredPosts.map((post: any) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate(`/product/${post.public_id}`)}
                  className="bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden hover:bg-slate-900/50 transition-all cursor-pointer group"
                >
                  <div className="relative aspect-square overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                      <img 
                        src={post.images[0]} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700 text-[8px]">Sem imagem</div>
                    )}
                    <div className="absolute top-1 left-1">
                      <span className={cn(
                        "text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full border",
                        "bg-orange-500/20 text-orange-500 border-orange-500/30"
                      )}>
                        P
                      </span>
                    </div>
                  </div>

                  <div className="p-2">
                    <h3 className="font-bold text-[8px] line-clamp-1 group-hover:text-orange-500 transition-colors mb-1">{post.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white">
                        {post.price ? `${post.price.toLocaleString()}` : 'Consulta'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {filteredPosts.map((post: any, index: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/service/${post.public_id}`)}
                  className="flex gap-4 p-4 bg-slate-900/30 border border-white/5 rounded-2xl hover:bg-slate-900/50 transition-all cursor-pointer group"
                >
                  <div className="w-24 h-24 md:w-40 md:h-40 shrink-0 rounded-2xl overflow-hidden border border-white/5">
                    {post.images && post.images.length > 0 ? (
                      <img 
                        src={post.images[0]} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                        <Wrench size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-base md:text-xl group-hover:text-orange-500 transition-colors">{post.title}</h3>
                        <span className="text-sm md:text-lg font-black text-orange-500">
                          {post.price ? `${post.price.toLocaleString()} AOA` : 'Consulta'}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-2 md:line-clamp-3 mb-4">{post.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">
                          <MapPin size={12} className="text-orange-500" />
                          <span>{store.province?.name}, {store.municipality?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-slate-300">4.8</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
