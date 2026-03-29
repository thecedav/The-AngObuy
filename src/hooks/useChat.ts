import { useState, useEffect } from 'react';
import { Chat, Message } from '../types';
import { fetchUserChats, fetchChatMessages, sendMessage as sendMessageService } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';

export function useChat(userId: string | undefined) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadChats = async () => {
      const data = await fetchUserChats(userId);
      setChats(data);
      setLoading(false);
    };

    loadChats();

    // 10. REALTIME CHAT SUBSCRIPTION
    const channel = supabase
      .channel('public:chat_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${userId}` }, () => {
        loadChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { chats, loading };
}

export function useChatMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      const data = await fetchChatMessages(chatId);
      setMessages(data);
      setLoading(false);
    };

    loadMessages();

    // 10. REALTIME MESSAGE SUBSCRIPTION
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const send = async (senderId: string, content: string, tipo: 'texto' | 'sistema' = 'texto') => {
    if (!chatId) return { error: 'Chat não selecionado' };
    return await sendMessageService(chatId, senderId, content, tipo);
  };

  return { messages, loading, send };
}
