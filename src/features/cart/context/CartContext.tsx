import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Cart, CartItem } from '@/types/index';
import { getOrCreateCart, addToCart as addToCartService } from '@/services/supabase/supabaseService';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface CartContextType {
  cart: Cart | null;
  items: CartItem[];
  loading: boolean;
  addItem: (itemId: string, quantity: number, type?: 'product' | 'service') => Promise<{ error: any }>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  total: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchInProgress = useRef(false);

  const fetchCartItems = async (cartId: string) => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:product_id (*), service:service_id (*)')
        .eq('cart_id', cartId);

      if (!error && data) {
        const now = new Date();
        const twentyDaysAgo = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000));
        
        const expiredItems = data.filter(item => {
          const createdAt = new Date(item.created_at);
          return createdAt < twentyDaysAgo;
        });

        if (expiredItems.length > 0) {
          await supabase.from('cart_items').delete().in('id', expiredItems.map(i => i.id));
        }

        const validItems = data.filter(item => {
          const createdAt = new Date(item.created_at);
          return createdAt >= twentyDaysAgo;
        });

        setItems(validItems);
      }
    } catch (error) {
      console.error('Error fetching cart items:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async () => {
    if (!user || fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    try {
      const cartData = await getOrCreateCart(user.id);
      setCart(cartData);
      if (cartData) {
        await fetchCartItems(cartData.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setLoading(false);
    } finally {
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    if (user) {
      refreshCart();
    } else {
      setCart(null);
      setItems([]);
      setLoading(false);
    }
  }, [user]);

  const addItem = async (itemId: string, quantity: number, type: 'product' | 'service' = 'product') => {
    if (!cart) return { error: 'Carrinho não inicializado' };
    
    const existingItem = items.find(i => 
      (type === 'product' && i.product_id === itemId) || 
      (type === 'service' && i.service_id === itemId)
    );
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);
      
      if (!error) await fetchCartItems(cart.id);
      return { error };
    }

    const { error } = await addToCartService(cart.id, itemId, quantity, type);
    if (!error) await fetchCartItems(cart.id);
    return { error };
  };

  const removeItem = async (itemId: string) => {
    if (!cart) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    
    if (!error) await fetchCartItems(cart.id);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cart) return;
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    
    if (!error) await fetchCartItems(cart.id);
  };

  const total = items.reduce((sum, item) => {
    const price = Number(item.product?.price || item.service?.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + price * quantity;
  }, 0);

  const safeItems = items.map(item => ({
    ...item,
    quantity: Number(item.quantity) || 0
  }));

  return (
    <CartContext.Provider value={{ 
      cart, 
      items: safeItems, 
      loading, 
      addItem, 
      removeItem, 
      updateQuantity, 
      total,
      refreshCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};
