import { supabase } from '@/lib/supabaseClient';
import { UserProfile, Store, Product, Service, Province, Municipality, Cart, CartItem, Chat, Message, ChatParticipant } from '@/types';

import { User } from '@supabase/supabase-js';

// 2. AUTHENTICATION SYNC
export const getCurrentUserProfile = async (existingUser?: User | null): Promise<UserProfile | null> => {
  try {
    const user = existingUser || (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('id, public_id, full_name, is_admin, name, email, whatsapp_number, id_number, photo_url, cover_image, bio, province_id, municipality_id, created_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile from DB:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getCurrentUserProfile:', error);
    return null;
  }
};

// 4. STORE FETCHING LOGIC
export const fetchStores = async (filters?: { province_id?: string; municipality_id?: string }): Promise<Store[]> => {
  try {
    let query = supabase
      .from('stores')
      .select(`
        *,
        owner:owner_id (id, full_name, photo_url),
        province:province_id (id, name),
        municipality:municipality_id (id, name)
      `)
      .eq('is_active', true);

    if (filters?.province_id) query = query.eq('province_id', filters.province_id);
    if (filters?.municipality_id) query = query.eq('municipality_id', filters.municipality_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching stores:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStores:', error);
    return [];
  }
};

// 5. PRODUCT FETCHING LOGIC
export const fetchProducts = async (filters?: { province_id?: string; municipality_id?: string; category_id?: string }): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        store:store_id (
          id, name, public_id, is_active,
          province:province_id (id, name),
          municipality:municipality_id (id, name)
        )
      `)
      .filter('store.is_active', 'eq', true);

    if (filters?.province_id) query = query.eq('province_id', filters.province_id);
    if (filters?.municipality_id) query = query.eq('municipality_id', filters.municipality_id);
    if (filters?.category_id) query = query.eq('category_id', filters.category_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchProducts:', error);
    return [];
  }
};

// 6. SERVICE FETCHING LOGIC
export const fetchServices = async (filters?: { province_id?: string; municipality_id?: string; category_id?: string }): Promise<Service[]> => {
  try {
    let query = supabase
      .from('services')
      .select(`
        *,
        store:store_id (
          id, name, public_id, is_active,
          province:province_id (id, name),
          municipality:municipality_id (id, name)
        )
      `)
      .filter('store.is_active', 'eq', true);

    if (filters?.province_id) query = query.eq('province_id', filters.province_id);
    if (filters?.municipality_id) query = query.eq('municipality_id', filters.municipality_id);
    if (filters?.category_id) query = query.eq('category_id', filters.category_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchServices:', error);
    return [];
  }
};

// 7. CATEGORY & LOCATION SYSTEM
export const fetchProvinces = async (): Promise<Province[]> => {
  try {
    const { data, error } = await supabase.from('provinces').select('*').order('name');
    if (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchProvinces:', error);
    return [];
  }
};

export const fetchMunicipalities = async (provinceId: string): Promise<Municipality[]> => {
  try {
    const { data, error } = await supabase.from('municipalities').select('*').eq('province_id', provinceId).order('name');
    if (error) {
      console.error('Error fetching municipalities:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchMunicipalities:', error);
    return [];
  }
};

// 8. FOLLOW SYSTEM INTEGRATION
export const followStore = async (storeId: string, userId: string) => {
  try {
    const { error } = await supabase.from('followers').insert({ store_id: storeId, user_id: userId });
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in followStore:', error);
    return { error };
  }
};

export const unfollowStore = async (storeId: string, userId: string) => {
  try {
    const { error } = await supabase.from('followers').delete().match({ store_id: storeId, user_id: userId });
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in unfollowStore:', error);
    return { error };
  }
};

export const followUser = async (targetUserId: string, followerId: string) => {
  try {
    const { error } = await supabase.from('followers').insert({ followed_user_id: targetUserId, user_id: followerId });
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in followUser:', error);
    return { error };
  }
};

export const unfollowUser = async (targetUserId: string, followerId: string) => {
  try {
    const { error } = await supabase.from('followers').delete().match({ followed_user_id: targetUserId, user_id: followerId });
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in unfollowUser:', error);
    return { error };
  }
};

export const checkIsFollowing = async (storeId: string, userId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .match({ store_id: storeId, user_id: userId });
    if (error) return false;
    return (count || 0) > 0;
  } catch (error) {
    console.error('Unexpected error in checkIsFollowing:', error);
    return false;
  }
};

// 9. CART SYSTEM INTEGRATION
export const getOrCreateCart = async (userId: string): Promise<Cart | null> => {
  try {
    const { data: existingCart, error: fetchError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingCart) return existingCart;

    const { data: newCart, error: createError } = await supabase
      .from('cart')
      .insert({ user_id: userId })
      .select()
      .single();

    if (createError) {
      console.error('Error creating cart:', createError);
      return null;
    }
    return newCart;
  } catch (error) {
    console.error('Unexpected error in getOrCreateCart:', error);
    return null;
  }
};

export const addToCart = async (cartId: string, itemId: string, quantity: number, type: 'product' | 'service' = 'product') => {
  try {
    // Check stock/availability
    if (type === 'product') {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', itemId)
        .single();

      if (productError || !product) throw new Error('Produto não encontrado');
      if (product.stock < quantity) throw new Error('Stock insuficiente');

      const { data, error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: itemId, quantity })
        .select()
        .single();

      return { data, error };
    } else {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('id', itemId)
        .single();

      if (serviceError || !service) throw new Error('Serviço não encontrado');

      const { data, error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, service_id: itemId, quantity })
        .select()
        .single();

      return { data, error };
    }
  } catch (error: any) {
    console.error('Unexpected error in addToCart:', error);
    return { error };
  }
};

// 10. CHAT SYSTEM INTEGRATION
export const fetchUserChats = async (userId: string): Promise<any[]> => {
  try {
    // Fetch private chats
    const { data: privateParticipants, error: privateError } = await supabase
      .from('chat_participants')
      .select(`
        chat:chat_id (*)
      `)
      .eq('user_id', userId);

    // Fetch business chats
    const { data: businessParticipants, error: businessError } = await supabase
      .from('chat_participants')
      .select(`
        business_chat:chat_id (
          *,
          product:product_id (*, store:store_id (*)),
          service:service_id (*, store:store_id (*))
        )
      `)
      .eq('user_id', userId);

    const privateChats = (privateParticipants?.map((item: any) => ({ ...item.chat, is_business: false })) || []);
    const businessChats = (businessParticipants?.map((item: any) => ({ ...item.business_chat, is_business: true })) || []).filter((c: any) => c.id);

    const allChats = [...privateChats, ...businessChats] as any[];
    return allChats.sort((a, b) => 
      new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
    );
  } catch (error) {
    console.error('Unexpected error in fetchUserChats:', error);
    return [];
  }
};

export const fetchChatMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, full_name, photo_url, is_admin)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchChatMessages:', error);
    return [];
  }
};

export const sendMessage = async (chatId: string, senderId: string, content: string, tipo: 'texto' | 'sistema' = 'texto') => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: senderId, content, tipo })
      .select()
      .single();
    
    if (error) throw error;

    // Update last message in appropriate table
    // Try business_chats first
    const { error: bizUpdateError } = await supabase
      .from('business_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);
    
    if (bizUpdateError) {
      // Try regular chats
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);
    }

    return { data, error };
  } catch (error: any) {
    console.error('Unexpected error in sendMessage:', error);
    return { error };
  }
};

// 11. CEDAV-PAY CHAT FLOW
export const createCedavPayChat = async (buyerId: string, sellerId: string, productId?: string, serviceId?: string) => {
  try {
    // 1. Create group chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({ type: 'group', name: 'Transação Cedav-Pay' })
      .select()
      .single();

    if (chatError) throw chatError;

    // 2. Add participants
    const adminEmail = 'thecedav@gmail.com';
    const { data: adminUser } = await supabase.from('users').select('id').eq('email', adminEmail).single();

    const participants = [
      { chat_id: chat.id, user_id: buyerId, is_admin: false, product_id: productId, service_id: serviceId },
      { chat_id: chat.id, user_id: sellerId, is_admin: false, product_id: productId, service_id: serviceId }
    ];

    if (adminUser) {
      participants.push({ chat_id: chat.id, user_id: adminUser.id, is_admin: true, product_id: productId, service_id: serviceId });
    }

    const { error: partError } = await supabase.from('chat_participants').insert(participants);
    if (partError) throw partError;

    return chat;
  } catch (error) {
    console.error('Unexpected error in createCedavPayChat:', error);
    throw error;
  }
};

// 12. STORE DELETION
export const deleteStore = async (storeId: string) => {
  try {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);
    
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in deleteStore:', error);
    return { error };
  }
};

// 13. STORE VIEWS & ANALYTICS
export const recordStoreView = async (storeId: string, userId?: string) => {
  try {
    const { error } = await supabase
      .from('store_views')
      .insert({ store_id: storeId, user_id: userId });
    return { error };
  } catch (error: any) {
    console.error('Unexpected error in recordStoreView:', error);
    return { error };
  }
};

export const fetchStoreViewsCount = async (storeId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('store_views')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);
    
    if (error) return 0;
    return count || 0;
  } catch (error) {
    console.error('Unexpected error in fetchStoreViewsCount:', error);
    return 0;
  }
};

export const fetchStoreStock = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('stock', { ascending: true });
    
    if (error) {
      console.error('Error fetching store stock:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStoreStock:', error);
    return [];
  }
};

export const fetchPopularProducts = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, cart_items(count)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }
    return (data || []).sort((a, b) => {
      const aCount = (a.cart_items as any)?.[0]?.count || 0;
      const bCount = (b.cart_items as any)?.[0]?.count || 0;
      return bCount - aCount;
    }).slice(0, 5);
  } catch (error) {
    console.error('Unexpected error in fetchPopularProducts:', error);
    return [];
  }
};

export const fetchStoreFollowers = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('*, user:user_id(*)')
      .eq('store_id', storeId);
    
    if (error) {
      console.error('Error fetching store followers:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStoreFollowers:', error);
    return [];
  }
};

export const fetchStoreComments = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:user_id(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching store comments:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStoreComments:', error);
    return [];
  }
};

export const fetchStoreCards = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('store_cards')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching store cards:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStoreCards:', error);
    return [];
  }
};

export const addStoreCard = async (storeId: string, bankName: string, cardNumber: string, cardHolder: string) => {
  try {
    return await supabase
      .from('store_cards')
      .insert({ 
        store_id: storeId, 
        bank_name: bankName, 
        card_number: cardNumber, 
        card_holder_name: cardHolder,
        balance_kz: 0,
        balance_usd: 0,
        balance_eur: 0
      });
  } catch (error) {
    console.error('Unexpected error in addStoreCard:', error);
    return { error };
  }
};

export const updateCardBalance = async (cardId: string, currency: string, newBalance: number) => {
  try {
    const field = currency === 'Kwanza' ? 'balance_kz' : currency === 'Dolar' ? 'balance_usd' : 'balance_eur';
    return await supabase
      .from('store_cards')
      .update({ [field]: newBalance })
      .eq('id', cardId);
  } catch (error) {
    console.error('Unexpected error in updateCardBalance:', error);
    return { error };
  }
};

export const fetchStoreExpenses = async (storeId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('store_expenses')
      .select('*, store_expense_items(*), store_expense_cards(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching store expenses:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchStoreExpenses:', error);
    return [];
  }
};

export const addStoreExpense = async (params: {
  storeId: string, 
  description: string, 
  location: string, 
  totalAmount: number, 
  currency: string,
  items: { item_name: string, amount: number, category: string }[],
  cardIds: string[]
}) => {
  try {
    const { storeId, description, location, totalAmount, currency, items, cardIds } = params;
    
    // 1. Create expense
    const { data: expense, error: expError } = await supabase
      .from('store_expenses')
      .insert({ store_id: storeId, description, location, total_amount: totalAmount, currency })
      .select()
      .single();
    
    if (expError) throw expError;

    // 2. Add items
    if (items.length > 0) {
      const { error: itemError } = await supabase
        .from('store_expense_items')
        .insert(items.map(item => ({ ...item, expense_id: expense.id })));
      if (itemError) throw itemError;
    }

    // 3. Link cards and subtract balance
    if (cardIds.length > 0) {
      const amountPerCard = totalAmount / cardIds.length;
      
      for (const cardId of cardIds) {
        // Link
        await supabase
          .from('store_expense_cards')
          .insert({ expense_id: expense.id, card_id: cardId, amount_subtracted: amountPerCard });
        
        // Subtract (need current balance first)
        const { data: card } = await supabase.from('store_cards').select('*').eq('id', cardId).single();
        if (card) {
          const field = currency === 'Kwanza' ? 'balance_kz' : currency === 'Dolar' ? 'balance_usd' : 'balance_eur';
          const newBalance = (card[field] || 0) - amountPerCard;
          await supabase.from('store_cards').update({ [field]: newBalance }).eq('id', cardId);
        }
      }
    }

    return { data: expense };
  } catch (error: any) {
    console.error('Unexpected error in addStoreExpense:', error);
    throw error;
  }
};
