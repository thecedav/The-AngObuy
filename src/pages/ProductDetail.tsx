import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Post, Store, Comment } from '@/types/index';
import { 
  Heart, 
  Share2, 
  ShoppingBag, 
  ArrowLeft, 
  Store as StoreIcon, 
  MapPin, 
  Globe, 
  ShieldCheck,
  CheckCircle,
  Plus,
  Minus,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Link,
  Trash2,
  Reply,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/helpers/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCart } from '@/features/cart/hooks/useCart';
import { useFollow } from '@/features/stores/hooks/useFollow';
import { recordStoreView } from '@/services/supabase/supabaseService';

export const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addItem, items } = useCart(user?.id);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isCedavPayExpanded, setIsCedavPayExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(product?.store_id);
  const isInCart = items.some(item => item.product_id === product?.id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      fetchComments();
      if (product.store_id) {
        recordStoreView(product.store_id, user?.id);
      }
    }
  }, [product, user?.id]);

  const fetchComments = async () => {
    if (!product) return;
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('post_id', product.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

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

  const handlePostComment = async () => {
    if (!user || !newComment.trim() || !product) return;
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: product.id,
          user_id: user.id,
          content: newComment,
          parent_id: replyTo?.id || null
        })
        .select('*, user:users(*)')
        .single();

      if (error) throw error;

      if (replyTo) {
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

  const handleShare = (platform: string) => {
    if (!product) return;
    const url = window.location.href;
    const text = `Confira este ${product.type === 'product' ? 'produto' : 'serviço'} no The Cedav: ${product.title}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
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

  const fetchProduct = async () => {
    try {
      // Try products first
      let { data, error } = await supabase
        .from('products')
        .select(`
          *,
          store:stores(*, province:province_id(id, name), municipality:municipality_id(id, name)),
          province:province_id(id, name),
          municipality:municipality_id(id, name),
          cart_count:cart_items(count)
        `)
        .eq('public_id', productId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProduct({ ...data, type: 'product', content: data.description } as any);
        return;
      }

      // Try services
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`
          *,
          store:stores(*, province:province_id(id, name), municipality:municipality_id(id, name)),
          province:province_id(id, name),
          municipality:municipality_id(id, name),
          cart_count:cart_items(count)
        `)
        .eq('public_id', productId)
        .maybeSingle();

      if (serviceError) throw serviceError;

      if (serviceData) {
        setProduct({ ...serviceData, type: 'service', content: serviceData.description } as any);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && (!product?.stock || newQty <= product.stock)) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = () => {
    if (!user) return navigate('/auth');
    if (product?.type === 'service') {
      confirmAddToCart();
    } else {
      setShowQuantityModal(true);
    }
  };

  const confirmAddToCart = async () => {
    if (product) {
      const { error } = await addItem(product.id, quantity, product.type);
      if (error) {
        alert(typeof error === 'string' ? error : (error as any).message || 'Erro ao adicionar ao carrinho');
        return;
      }
      setIsAddedToCart(true);
      setShowQuantityModal(false);
      setTimeout(() => setIsAddedToCart(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (!user) return navigate('/auth');
    setShowBuyModal(true);
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await toggleFollow();
  };

  const handleDirectPayment = async () => {
    if (!product || !user) return;
    try {
      // 1. Create Private Chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'private',
          product_id: product.type === 'product' ? product.id : null,
          service_id: product.type === 'service' ? product.id : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // 2. Add Participants (Buyer and Seller)
      const participants = [
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: product.store?.owner_id }
      ];

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (partError) throw partError;

      // 3. Send Automated Message
      const message = product.type === 'service'
        ? `Quero solicitar este serviço (ID: ${product.public_id}, Quantidade: ${quantity})`
        : (product.is_preorder 
          ? `Quero encomendar este produto (ID: ${product.public_id}, Quantidade: ${quantity})`
          : `Quero comprar este item (ID: ${product.public_id}, Quantidade: ${quantity})`);
      
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: user.id,
        content: message,
        tipo: 'texto'
      });

      navigate(`/messages?chatId=${chat.id}`);
    } catch (error) {
      console.error('Error starting direct payment:', error);
      alert('Erro ao iniciar o chat com o vendedor.');
    }
  };

  const handleCedavPay = async () => {
    if (!product || !user) return;
    try {
      // 1. Create Business Chat (status: ativo)
      const { data: chat, error: chatError } = await supabase
        .from('business_chats')
        .insert({
          tipo: product.type,
          product_id: product.type === 'product' ? product.id : null,
          service_id: product.type === 'service' ? product.id : null,
          criado_por: user.id,
          status: 'ativo',
          marcado_como_feito: false
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // 2. Find Admin
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();

      // 3. Add Participants (Buyer, Seller, Admin)
      const participants = [
        { chat_id: chat.id, user_id: user.id, is_admin: false },
        { chat_id: chat.id, user_id: product.store?.owner_id, is_admin: false }
      ];
      if (adminUser) {
        participants.push({ chat_id: chat.id, user_id: adminUser.id, is_admin: true });
      }

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (partError) throw partError;

      // 4. Send Automated Message
      const message = product.is_preorder
        ? `Nova encomenda iniciada com The Cedav-Pay (ID do item: ${product.public_id}, Quantidade: ${quantity})`
        : `Nova negociação iniciada com The Cedav-Pay (ID do item: ${product.public_id}, Quantidade: ${quantity})`;
      
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: user.id,
        content: message,
        tipo: 'sistema'
      });

      navigate(`/messages?chatId=${chat.id}`);
    } catch (error) {
      console.error('Error starting Cedav-Pay:', error);
      alert('Erro ao iniciar o pagamento seguro. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Produto não encontrado.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 flex items-center gap-2 justify-center mx-auto">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2 relative">
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className={cn("p-2 rounded-full transition-colors", isFavorite ? "text-red-500 bg-red-500/10" : "text-white hover:bg-white/5")}
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={() => setShowShare(!showShare)}
            className="p-2 text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <Share2 size={20} />
          </button>
          
          <AnimatePresence>
            {showShare && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute top-full right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex gap-2"
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

      <div className="grid md:grid-cols-2 gap-8 p-4 md:p-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div 
            className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 cursor-zoom-in group relative"
            onClick={() => setShowFullScreen(true)}
          >
            {product.images && product.images.length > 0 ? (
              <>
                <img 
                  src={product.images[selectedImageIndex]} 
                  alt={product.title} 
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-black/50 backdrop-blur-md p-3 rounded-full text-white">
                    <Grid size={24} />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700">
                <ShoppingBag size={64} />
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {product.images.map((img: string, i: number) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedImageIndex(i)}
                  className={cn(
                    "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0",
                    selectedImageIndex === i ? "border-orange-500 scale-95" : "border-white/10 opacity-50 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-orange-500/20">
                {product.condition}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-white/5">
                {product.public_id}
              </span>
              {product.is_imported && (
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-blue-500/20 flex items-center gap-1">
                  Importado
                </span>
              )}
              {product.is_preorder && (
                <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-purple-500/20 flex items-center gap-1">
                  Sob Encomenda
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-500">
                {product.price?.toLocaleString()} {product.currency}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                {(product.cart_count as any)?.[0]?.count || 0} no carrinho
              </span>
            </div>
          </div>

          {/* Stock & Location Info */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <ShoppingBag size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Estoque</p>
                <p className="text-sm font-bold">{product.stock && !isNaN(product.stock) ? `${product.stock} disponíveis` : 'Em Estoque'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Localização</p>
                <p className="text-sm font-bold truncate">{product.municipality?.name}, {product.province?.name}</p>
              </div>
            </div>
            {product.importer_region && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Importador</p>
                  <p className="text-sm font-bold">{product.importer_region}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Verificado</p>
                <p className="text-sm font-bold">Loja Segura</p>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          {product.type === 'product' && (
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
              <span className="font-bold">Quantidade</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold text-lg">{Number.isNaN(quantity) ? 1 : quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(1)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Store Card */}
          <Card className="p-4 flex items-center justify-between border-white/5 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                {product.store?.profile_image ? (
                  <img src={product.store.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500"><StoreIcon size={24} /></div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm">{product.store?.name}</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{product.store?.public_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "text-xs h-8 px-4 rounded-full transition-all shadow-lg",
                  isFollowing 
                    ? "bg-slate-800 text-slate-400 border-white/10 shadow-none" 
                    : "bg-blue-600 text-white hover:bg-blue-500 border-none shadow-blue-600/20"
                )}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 px-4 rounded-full border-white/10 hover:bg-white/5"
                onClick={() => navigate(`/store/${product.store_id}`)}
              >
                Visitar Loja
              </Button>
            </div>
          </Card>

          {/* Description */}
          <div className="space-y-4">
            {product.is_preorder && (
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-purple-500 uppercase tracking-widest">Informações de Encomenda</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Origem</p>
                    <p className="font-bold">{product.country}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Tempo de Entrega</p>
                    <p className="font-bold">{product.delivery_time}</p>
                  </div>
                  {product.payment_type && (
                    <div>
                      <p className="text-slate-500 mb-1">Pagamento</p>
                      <p className="font-bold">{product.payment_type}</p>
                    </div>
                  )}
                  {product.delivery_method && (
                    <div>
                      <p className="text-slate-500 mb-1">Entrega</p>
                      <p className="font-bold">{product.delivery_method}</p>
                    </div>
                  )}
                </div>
                {product.preorder_info && (
                  <div className="pt-2 border-t border-purple-500/10">
                    <p className="text-slate-500 mb-1">Nota</p>
                    <p className="text-[11px] leading-relaxed">{product.preorder_info}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Descrição</h3>
              <div className="relative">
                <p className={cn(
                  "text-slate-300 text-sm leading-relaxed whitespace-pre-wrap transition-all duration-300",
                  !isDescriptionExpanded && product.content?.length > 150 && "line-clamp-3"
                )}>
                  {product.content}
                </p>
                {!isDescriptionExpanded && product.content?.length > 150 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent" />
                )}
              </div>
              {product.content?.length > 150 && (
                <button 
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-orange-500 text-xs font-bold uppercase tracking-widest hover:text-orange-400 transition-colors mt-2"
                >
                  {isDescriptionExpanded ? 'Ver Menos' : 'Ver Mais'}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className={cn(
                "flex-1 h-12 rounded-xl border-white/10 transition-all duration-300 flex items-center justify-center gap-2",
                isInCart ? "bg-blue-900 border-blue-800 text-white" : "hover:bg-white/5"
              )}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} />
              {isInCart ? 'Adicionado!' : 'Adicionar ao Carrinho'}
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl bg-orange-500 text-black hover:bg-orange-400"
              onClick={handleBuyNow}
            >
              {product.type === 'service' ? 'Solicitar serviço Agora' : (product.is_preorder ? 'Encomendar Agora' : 'Comprar Agora')}
            </Button>
          </div>
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
                    onClick={() => setQuantity(prev => (product.stock ? Math.min(product.stock, prev + 1) : prev + 1))}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              {product.stock && <p className="text-[10px] text-slate-500 mb-4">Stock disponível: {product.stock}</p>}
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

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#0B1421] rounded-3xl border border-white/10 overflow-hidden my-auto shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Finalizar Compra</h3>
              <button 
                onClick={() => setShowBuyModal(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 pt-0 space-y-8">
              {/* Product Info Card */}
              <div className="bg-[#0F172A] rounded-2xl p-6 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">ID: {product.public_id}</p>
                <h4 className="font-bold text-white text-xl mb-6">{product.title}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Preço unitário:</span>
                  <span className="text-2xl font-black text-white">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: product.currency || 'AOA' }).format(product.price || 0)}
                  </span>
                </div>
              </div>

              {/* Quantity Selector */}
              {product.type === 'product' && (
                <div className="space-y-4">
                  <label className="text-lg font-bold text-slate-300">Quantidade</label>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-8">
                      <button 
                        onClick={() => handleQuantityChange(-1)}
                        className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-white/5 flex items-center justify-center hover:bg-slate-800 transition-colors text-white"
                      >
                        <Minus size={24} />
                      </button>
                      <span className="text-6xl font-black text-white w-20 text-center">{Number.isNaN(quantity) ? 1 : quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(1)}
                        className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-white/5 flex items-center justify-center hover:bg-slate-800 transition-colors text-white"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">máx: {product.stock || 15}</span>
                  </div>
                </div>
              )}

              {/* Total Section */}
              <div className="bg-[#1E293B]/50 rounded-2xl p-8 border border-white/5 flex justify-between items-center">
                <span className="text-xl font-bold text-slate-300">Total:</span>
                <span className="text-5xl font-black text-white">
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: product.currency || 'AOA' }).format((product.price || 0) * quantity)}
                </span>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-300">Escolha a forma de pagamento:</p>
                
                {/* The Cedav-Pay Option */}
                <div className="space-y-2">
                  <button 
                    onClick={() => setIsCedavPayExpanded(!isCedavPayExpanded)}
                    className={cn(
                      "w-full p-6 rounded-2xl transition-all flex flex-col gap-4 text-left",
                      isCedavPayExpanded 
                        ? "bg-[#2563EB] shadow-lg shadow-blue-500/20" 
                        : "bg-[#0F172A] border border-white/5 hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                          <div className="w-10 h-6 border-2 border-white/40 rounded flex items-center justify-center">
                            <div className="w-2 h-2 bg-white/40 rounded-full" />
                          </div>
                        </div>
                        <span className="font-bold text-white text-xl">The Cedav-Pay</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">Recomendado</span>
                        {isCedavPayExpanded ? <ChevronUp size={24} className="text-white" /> : <ChevronDown size={24} className="text-white" />}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isCedavPayExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-white/90 leading-relaxed mb-6">
                            Pagamento seguro com mediação do administrador. Chat em grupo com a loja e equipe da plataforma.
                          </p>
                          
                          <div className="bg-black/20 rounded-2xl p-5 space-y-4 text-sm">
                            <div className="space-y-2">
                              <p className="font-bold text-blue-200">Vantagens:</p>
                              <ul className="space-y-1 text-xs text-white/70">
                                <li className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-blue-400" />
                                  Proteção contra fraudes
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-blue-400" />
                                  Mediação do administrador
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-blue-400" />
                                  Chat em grupo transparente
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-blue-400" />
                                  Suporte em caso de problemas
                                </li>
                              </ul>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-3">
                              <div className="flex justify-between text-white/70">
                                <span>Subtotal:</span>
                                <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: product.currency || 'AOA' }).format((product.price || 0) * quantity)}</span>
                              </div>
                              <div className="flex justify-between text-white/70">
                                <span>Taxa (5%):</span>
                                <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: product.currency || 'AOA' }).format((product.price || 0) * quantity * 0.05)}</span>
                              </div>
                              <div className="pt-3 border-t border-white/10 flex justify-between font-black text-lg text-white">
                                <span>Total Final:</span>
                                <span className="text-yellow-400">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: product.currency || 'AOA' }).format((product.price || 0) * quantity * 1.05)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleCedavPay(); }}
                            className="w-full mt-6 h-14 bg-white text-blue-600 hover:bg-blue-50 font-black text-lg rounded-xl shadow-xl"
                          >
                            Confirmar com The Cedav-Pay
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                {/* Direct Payment Option */}
                <button 
                  onClick={handleDirectPayment}
                  className="w-full p-6 rounded-2xl bg-[#0F172A] border border-white/5 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <MessageCircle size={24} className="text-slate-400 group-hover:text-white transition-colors" />
                    <span className="font-bold text-white text-xl">Pagar Direto à Loja</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                    Negocie diretamente com <span className="font-bold">{product.store?.name}</span> por mensagem privada.
                  </p>
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center pt-6 opacity-60">
                Ao continuar, você será redirecionado para as mensagens
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Comments Section */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pb-20">
        <div className="pt-8 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Comentários <span className="text-slate-500 text-sm font-normal">({product.comments_count})</span>
            </h3>
          </div>

          {/* Comment Input */}
          <div className="mb-8 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            {replyTo && (
              <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-lg text-xs mb-3">
                <span className="text-slate-400">Respondendo a <span className="text-white font-bold">@{replyTo.user?.name}</span></span>
                <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white"><Trash2 size={12} /></button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500">
                    {profile?.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? "Escreva uma resposta..." : "O que achou deste produto?"}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none placeholder:text-slate-600"
                  rows={2}
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
                  >
                    Publicar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comment List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-dashed border-white/5">
                <MessageCircle size={32} className="mx-auto text-slate-700 mb-2" />
                <p className="text-slate-500 text-sm">Nenhum comentário ainda. Seja o primeiro!</p>
              </div>
            ) : (
              comments.map(comment => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  storeOwnerId={product.store?.owner_id}
                  storeName={product.store?.name}
                  onReply={(c) => { setReplyTo(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {showFullScreen && product.images && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">
                {selectedImageIndex + 1} / {product.images.length}
              </span>
              <button 
                onClick={() => setShowFullScreen(false)}
                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => (prev - 1 + product.images!.length) % product.images!.length);
                }}
                className="absolute left-4 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
              >
                <ChevronLeft size={32} />
              </button>
              
              <motion.img 
                key={selectedImageIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={product.images[selectedImageIndex]} 
                alt="" 
                className="max-w-full max-h-full object-contain"
              />

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => (prev + 1) % product.images!.length);
                }}
                className="absolute right-4 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            <div className="p-6 flex gap-2 overflow-x-auto no-scrollbar justify-center">
              {product.images.map((img: string, i: number) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedImageIndex(i)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                    selectedImageIndex === i ? "border-orange-500 scale-110" : "border-white/10 opacity-30"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onReply: (c: Comment) => void;
  storeOwnerId?: string;
  storeName?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, storeOwnerId, storeName }) => {
  const isStoreOwner = storeOwnerId && comment.user_id === storeOwnerId;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
          {comment.user?.photo_url ? (
            <img src={comment.user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500">
              {comment.user?.name?.[0] || 'U'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {isStoreOwner ? storeName : comment.user?.name}
              </span>
              {isStoreOwner && (
                <span className="text-[10px] bg-orange-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                  Loja
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true })}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1">{comment.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => onReply(comment)}
              className="text-xs text-slate-500 hover:text-white font-bold transition-colors flex items-center gap-1"
            >
              <Reply size={12} /> Responder
            </button>
          </div>
        </div>
      </div>
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-10 space-y-4 border-l border-white/5 pl-6">
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onReply={onReply} 
              storeOwnerId={storeOwnerId}
              storeName={storeName}
            />
          ))}
        </div>
      )}
    </div>
  );
};
