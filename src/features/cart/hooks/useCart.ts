import { useState, useEffect } from 'react';
import { Cart, CartItem } from '@/types/index';
import { getOrCreateCart, addToCart as addToCartService } from '@/services/supabase/supabaseService';
import { supabase } from '@/lib/supabaseClient';

export function useCart(userId: string | undefined) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadCart = async () => {
      const cartData = await getOrCreateCart(userId);
      setCart(cartData);
      if (cartData) {
        fetchCartItems(cartData.id);
      } else {
        setLoading(false);
      }
    };

    loadCart();
  }, [userId]);

  const fetchCartItems = async (cartId: string) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:product_id (*), service:service_id (*)')
      .eq('cart_id', cartId);

    if (!error && data) {
      // Filter out items older than 20 days
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
    setLoading(false);
  };

  const addItem = async (itemId: string, quantity: number, type: 'product' | 'service' = 'product') => {
    if (!cart) return { error: 'Carrinho não inicializado' };
    
    // Check if item already in cart
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
      
      if (!error) fetchCartItems(cart.id);
      return { error };
    }

    const { error } = await addToCartService(cart.id, itemId, quantity, type);
    if (!error) fetchCartItems(cart.id);
    return { error };
  };

  const removeItem = async (itemId: string) => {
    if (!cart) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    
    if (!error) fetchCartItems(cart.id);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cart) return;
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    
    if (!error) fetchCartItems(cart.id);
  };

  const total = items.reduce((sum, item) => {
    const price = Number(item.product?.price || item.service?.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + price * quantity;
  }, 0);

  const safeItems = items.map(item => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    product: item.product || (item.service ? { ...item.service, type: 'service' } : null)
  }));

  return { cart, items: safeItems, loading, addItem, removeItem, updateQuantity, total };
}
