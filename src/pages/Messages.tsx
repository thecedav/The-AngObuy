import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle, User, MoreHorizontal, Send, Camera, Phone, Video, ArrowLeft, ShoppingBag, ShieldCheck, X, StickyNote, Calendar, Trash2, CheckCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChat, useChatMessages } from '@/features/messaging/hooks/useChat';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/helpers/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';

export const MessagesPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chatId');
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatIdFromUrl);
  const { chats, loading: chatsLoading } = useChat(user?.id);
  const { messages, loading: messagesLoading, send } = useChatMessages(selectedChatId || undefined);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'business' | 'private'>('business');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [markedDate, setMarkedDate] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatIdFromUrl) {
      setSelectedChatId(chatIdFromUrl);
      const chat = chats.find(c => c.id === chatIdFromUrl);
      if (chat) {
        setActiveTab(chat.is_business ? 'business' : 'private');
      }
    }
  }, [chatIdFromUrl, chats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId || !user) return;
    
    await send(user.id, newMessage);
    setNewMessage('');
  };

  const handleMarkAsDone = async () => {
    if (!selectedChatId || !user) return;
    try {
      await supabase
        .from('business_chats')
        .update({ marcado_como_feito: true })
        .eq('id', selectedChatId);
      
      if (user) {
        await send(user.id, 'Negociação concluída ✅', 'sistema');
      }
    } catch (error) {
      console.error('Error marking as done:', error);
    }
  };

  const handleAdminAction = async (action: 'delete' | 'note' | 'date') => {
    if (!selectedChatId || !profile?.is_admin) return;
    
    try {
      if (action === 'delete') {
        if (confirm('Tem certeza que deseja excluir este chat?')) {
          await supabase.from('business_chats').delete().eq('id', selectedChatId);
          setSelectedChatId(null);
        }
      } else if (action === 'note') {
        await supabase.from('business_chats').update({ nota_admin: adminNote }).eq('id', selectedChatId);
        if (user) {
          await send(user.id, `Nota do Admin: ${adminNote}`, 'sistema');
        }
        setAdminNote('');
      } else if (action === 'date') {
        await supabase.from('business_chats').update({ data_marcada: markedDate }).eq('id', selectedChatId);
        if (user) {
          await send(user.id, `Data marcada pelo Admin: ${format(new Date(markedDate), 'dd/MM/yyyy HH:mm')}`, 'sistema');
        }
        setMarkedDate('');
      }
    } catch (error) {
      console.error('Error admin action:', error);
    }
  };

  const selectedChat = chats.find((c: any) => c.id === selectedChatId);
  const filteredChats = chats.filter((c: any) => {
    if (activeTab === 'business') return c.is_business;
    return !c.is_business;
  });

  return (
    <div className="flex h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] overflow-hidden bg-[#0b141a]">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-[400px] border-r border-[#222d34] flex flex-col transition-all",
        selectedChatId ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-4 bg-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="text-slate-400" />
              )}
            </div>
            <h2 className="font-bold text-white">Conversas</h2>
          </div>
          <div className="flex gap-4 text-slate-400">
            <MoreHorizontal size={20} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#222d34] bg-[#111b21]">
          <button
            onClick={() => setActiveTab('business')}
            className={cn(
              "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'business' ? "text-orange-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            The Cedav-Pay
            {activeTab === 'business' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={cn(
              "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'private' ? "text-orange-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Conversas Diretas
            {activeTab === 'private' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-2 bg-[#111b21]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Pesquisar conversas..."
              className="w-full bg-[#202c33] border-none rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-0 outline-none"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-[#111b21] scrollbar-hide">
          {chatsLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma conversa encontrada.</div>
          ) : (
            filteredChats.map((chat: any) => (
              <div 
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-[#222d34]/50",
                  selectedChatId === chat.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {chat.is_business ? (
                    <div className="w-full h-full bg-orange-500/20 flex items-center justify-center">
                      <ShieldCheck className="text-orange-500" size={24} />
                    </div>
                  ) : (
                    <User className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-white text-sm truncate">
                      {chat.is_business ? (
                        chat.product?.title || chat.service?.title || 'Negociação'
                      ) : (
                        'Conversa Direta'
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {chat.last_message_at && format(new Date(chat.last_message_at), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {chat.last_message || 'Inicie uma conversa'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0b141a] relative",
        !selectedChatId ? "hidden md:flex items-center justify-center" : "flex"
      )}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 bg-[#202c33] flex items-center justify-between border-l border-[#222d34] sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden text-slate-400 p-1"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  {selectedChat.is_business ? (
                    <ShieldCheck className="text-orange-500" size={20} />
                  ) : (
                    <User className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedChat.is_business ? (
                      selectedChat.product?.title || selectedChat.service?.title || 'Negociação'
                    ) : (
                      'Conversa Direta'
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {selectedChat.is_business ? 'Mediação The Cedav-Pay' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <Search size={20} className="cursor-pointer hover:text-white" />
                <MoreHorizontal 
                  size={20} 
                  className="cursor-pointer hover:text-white" 
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90 scrollbar-hide">
              {messagesLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                messages.map((msg: any, index: number) => (
                  <div 
                    key={msg.id || index}
                    className={cn(
                      "flex flex-col max-w-[85%] md:max-w-[70%]",
                      msg.sender_id === user?.id ? "ml-auto items-end" : "items-start",
                      msg.tipo === 'sistema' && "mx-auto w-full items-center max-w-full"
                    )}
                  >
                    {msg.tipo === 'sistema' ? (
                      <div className="bg-[#182229] text-[#ffd279] px-4 py-2 rounded-lg text-[10px] font-medium border border-[#ffd279]/10 my-2 text-center">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={cn(
                        "p-3 rounded-xl relative shadow-sm",
                        msg.sender_id === user?.id 
                          ? "bg-[#005c4b] text-white rounded-tr-none" 
                          : "bg-[#202c33] text-white rounded-tl-none"
                      )}>
                        {msg.sender?.is_admin && (
                          <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter block mb-1">
                            ADMINISTRADOR
                          </span>
                        )}
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <span className="text-[9px] text-white/50 block text-right mt-1">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin Panel Overlay */}
            <AnimatePresence>
              {showAdminPanel && profile?.is_admin && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-4 right-4 bg-[#202c33] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Painel do Administrador</h4>
                    <button onClick={() => setShowAdminPanel(false)} className="text-slate-500 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Nota do Admin</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={adminNote}
                          onChange={e => setAdminNote(e.target.value)}
                          className="flex-1 bg-[#111b21] border-none rounded-lg p-2 text-xs text-white"
                          placeholder="Adicionar nota..."
                        />
                        <Button size="sm" onClick={() => handleAdminAction('note')} className="bg-blue-500 hover:bg-blue-600">
                          <StickyNote size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Marcar Data</label>
                      <div className="flex gap-2">
                        <input 
                          type="datetime-local" 
                          value={markedDate}
                          onChange={e => setMarkedDate(e.target.value)}
                          className="flex-1 bg-[#111b21] border-none rounded-lg p-2 text-xs text-white"
                        />
                        <Button size="sm" onClick={() => handleAdminAction('date')} className="bg-purple-500 hover:bg-purple-600">
                          <Calendar size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleAdminAction('delete')}
                      >
                        <Trash2 size={14} className="mr-2" />
                        Excluir Chat
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-3 bg-[#202c33] flex items-center gap-3 border-l border-[#222d34]">
              {selectedChat.is_business && !selectedChat.marcado_como_feito && (
                <button 
                  onClick={handleMarkAsDone}
                  className="p-2 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors shrink-0"
                  title="Marcar como Concluído"
                >
                  <CheckCircle size={20} />
                </button>
              )}
              <form onSubmit={handleSend} className="flex-1 flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mensagem"
                  className="flex-1 bg-[#2a3942] border-none rounded-xl py-2.5 px-4 text-sm text-white focus:ring-0 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 rounded-full bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 transition-all"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#222d34]/20">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
              <ShieldCheck size={48} className="text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-300 mb-2">The AngObuy Web</h2>
            <p className="text-slate-500 max-w-md">
              Selecione uma conversa para começar a negociar com segurança através do The Cedav-Pay.
            </p>
            <div className="mt-12 flex items-center gap-2 text-slate-600 text-xs uppercase tracking-widest font-bold">
              <ShieldCheck size={14} />
              Criptografia de ponta a ponta
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
