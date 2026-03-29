import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/src/hooks/useCart';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, ChevronDown, ChevronUp, X, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { cn } from '@/src/lib/utils';

export const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, total } = useCart(user?.id);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedItemForBuy, setSelectedItemForBuy] = useState<any>(null);
  const [isCedavPayExpanded, setIsCedavPayExpanded] = useState(false);

  const handleDirectPayment = async (cartItem: any) => {
    if (!cartItem.product || !user) return;
    try {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'private',
          product_id: cartItem.product.type === 'product' || !cartItem.product.type ? cartItem.product.id : null,
          service_id: cartItem.product.type === 'service' ? cartItem.product.id : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) throw chatError;

      const participants = [
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: cartItem.product.store?.owner_id }
      ];

      const { error: partError } = await supabase.from('chat_participants').insert(participants);
      if (partError) throw partError;

      const message = cartItem.product.type === 'service'
        ? `Quero solicitar este serviço (ID: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`
        : (cartItem.product.is_preorder 
          ? `Quero encomendar este produto (ID: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`
          : `Quero comprar este item (ID: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`);
      
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

  const handleCedavPay = async (cartItem: any) => {
    if (!cartItem.product || !user) return;
    try {
      const { data: chat, error: chatError } = await supabase
        .from('business_chats')
        .insert({
          tipo: cartItem.product.type || 'product',
          product_id: cartItem.product.type === 'product' || !cartItem.product.type ? cartItem.product.id : null,
          service_id: cartItem.product.type === 'service' ? cartItem.product.id : null,
          criado_por: user.id,
          status: 'ativo',
          marcado_como_feito: false
        })
        .select()
        .single();

      if (chatError) throw chatError;

      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();

      const participants = [
        { chat_id: chat.id, user_id: user.id, is_admin: false },
        { chat_id: chat.id, user_id: cartItem.product.store?.owner_id, is_admin: false }
      ];
      if (adminUser) {
        participants.push({ chat_id: chat.id, user_id: adminUser.id, is_admin: true });
      }

      const { error: partError } = await supabase.from('chat_participants').insert(participants);
      if (partError) throw partError;

      const message = cartItem.product.type === 'service'
        ? `Nova solicitação de serviço iniciada com The Cedav-Pay (ID do item: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`
        : (cartItem.product.is_preorder
          ? `Nova encomenda iniciada com The Cedav-Pay (ID do item: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`
          : `Nova negociação iniciada com The Cedav-Pay (ID do item: ${cartItem.product.public_id}, Quantidade: ${cartItem.quantity})`);
      
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <ShoppingCart size={64} className="text-slate-800 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inicie sessão para ver o seu carrinho</h2>
        <Button onClick={() => navigate('/auth')} className="bg-orange-500 text-black font-bold px-8">
          Entrar
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">O Meu Carrinho</h1>
        </div>
        <div className="h-px w-24 bg-orange-500/50" />
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-white/5 backdrop-blur-xl">
          <ShoppingBag size={80} className="mx-auto text-slate-800 mb-6" />
          <h2 className="text-xl font-bold text-slate-400 mb-4">O seu carrinho está vazio</h2>
          <Button onClick={() => navigate('/marketplace')} className="bg-orange-500 text-black font-bold px-8 rounded-full">
            Explorar Marketplace
          </Button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const itemTotal = (item.product?.price || 0) * item.quantity;
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -50 }}
                  className={cn(
                    "bg-slate-900/40 backdrop-blur-md border rounded-2xl overflow-hidden transition-colors cursor-pointer",
                    isExpanded ? "border-orange-500/50" : "border-white/10 hover:border-white/20"
                  )}
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                >
                  <div className="p-4 flex gap-4">
                    <div className="w-24 h-24 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <ShoppingBag size={24} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg line-clamp-1 uppercase tracking-tight">{item.product?.title}</h3>
                          <p className="text-orange-500 font-black">
                            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.product?.price || 0)}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                      </div>
                      
                      <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        {item.product?.type === 'product' ? (
                          <div className="flex items-center bg-black/50 rounded-full border border-white/10 p-1">
                            <button 
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center bg-black/50 rounded-full border border-white/10 px-3 py-1">
                            <span className="text-xs font-bold text-slate-400">Serviço</span>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                      >
                        <div className="p-6 space-y-6">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Resumo do Produto</h4>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-slate-300">
                              <span>Subtotal ({item.quantity}x)</span>
                              <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(itemTotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Entrega</span>
                              <span className="text-green-500 font-bold">A combinar</span>
                            </div>
                            <div className="h-px bg-white/10 my-2" />
                            <div className="flex justify-between text-xl font-black text-white">
                              <span>Total do Produto</span>
                              <span className="text-orange-500">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(itemTotal)}</span>
                            </div>
                          </div>

                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemForBuy(item);
                              setShowBuyModal(true);
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                          >
                            Finalizar Compra Deste Item
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && selectedItemForBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#0B1421] rounded-3xl border border-white/10 overflow-hidden my-auto shadow-2xl"
          >
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Finalizar Compra</h3>
              <button 
                onClick={() => {
                  setShowBuyModal(false);
                  setSelectedItemForBuy(null);
                }}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 pt-0 space-y-8">
              <div className="bg-[#0F172A] rounded-2xl p-6 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">ID: {selectedItemForBuy.product?.public_id}</p>
                <h4 className="font-bold text-white text-xl mb-6">{selectedItemForBuy.product?.title}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Preço unitário:</span>
                  <span className="text-2xl font-black text-white">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: selectedItemForBuy.product?.currency || 'AOA' }).format(selectedItemForBuy.product?.price || 0)}
                  </span>
                </div>
              </div>

              {selectedItemForBuy.product?.type === 'product' && (
                <div className="space-y-4">
                  <label className="text-lg font-bold text-slate-300">Quantidade</label>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-8">
                      <button 
                        onClick={() => updateQuantity(selectedItemForBuy.id, Math.max(1, selectedItemForBuy.quantity - 1))}
                        className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-white/5 flex items-center justify-center hover:bg-slate-800 transition-colors text-white"
                      >
                        <Minus size={24} />
                      </button>
                      <span className="text-6xl font-black text-white w-20 text-center">{selectedItemForBuy.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(selectedItemForBuy.id, selectedItemForBuy.quantity + 1)}
                        className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-white/5 flex items-center justify-center hover:bg-slate-800 transition-colors text-white"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#1E293B]/50 rounded-2xl p-8 border border-white/5 flex justify-between items-center">
                <span className="text-xl font-bold text-slate-300">Total:</span>
                <span className="text-5xl font-black text-white">
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: selectedItemForBuy.product?.currency || 'AOA' }).format((selectedItemForBuy.product?.price || 0) * selectedItemForBuy.quantity)}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-300">Escolha a forma de pagamento:</p>
                
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
                              </ul>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-3">
                              <div className="flex justify-between text-white/70">
                                <span>Subtotal:</span>
                                <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: selectedItemForBuy.product?.currency || 'AOA' }).format((selectedItemForBuy.product?.price || 0) * selectedItemForBuy.quantity)}</span>
                              </div>
                              <div className="flex justify-between text-white/70">
                                <span>Taxa (5%):</span>
                                <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: selectedItemForBuy.product?.currency || 'AOA' }).format((selectedItemForBuy.product?.price || 0) * selectedItemForBuy.quantity * 0.05)}</span>
                              </div>
                              <div className="pt-3 border-t border-white/10 flex justify-between font-black text-lg text-white">
                                <span>Total Final:</span>
                                <span className="text-yellow-400">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: selectedItemForBuy.product?.currency || 'AOA' }).format((selectedItemForBuy.product?.price || 0) * selectedItemForBuy.quantity * 1.05)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleCedavPay(selectedItemForBuy); }}
                            className="w-full mt-6 h-14 bg-white text-blue-600 hover:bg-blue-50 font-black text-lg rounded-xl shadow-xl"
                          >
                            Confirmar com The Cedav-Pay
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <button 
                  onClick={() => handleDirectPayment(selectedItemForBuy)}
                  className="w-full p-6 rounded-2xl bg-[#0F172A] border border-white/5 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <MessageCircle size={24} className="text-slate-400 group-hover:text-white transition-colors" />
                    <span className="font-bold text-white text-xl">Pagar Direto à Loja</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                    Negocie diretamente com <span className="font-bold">{selectedItemForBuy.product?.store?.name}</span> por mensagem privada.
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
    </motion.div>
  );
};
