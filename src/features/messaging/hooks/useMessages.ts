import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Chat, Message } from '@/types/index';

export const useMessages = (chatId?: string) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`chat-${chatId}`)
        .on('postgres_changes' as any, { 
          event: 'INSERT', 
          table: 'messages', 
          schema: 'public',
          filter: `chat_id=eq.${chatId}`
        }, (payload: any) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId]);

  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (content: string, productId?: string) => {
    if (!user || !chatId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
          product_id: productId
        });

      if (error) throw error;
      
      // Update chat's last message and timestamp
      await supabase
        .from('chats')
        .update({ 
          last_message: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return { chats, messages, loading, sendMessage, fetchChats };
};
