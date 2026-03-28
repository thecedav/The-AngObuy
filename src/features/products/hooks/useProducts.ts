import { useState, useEffect } from 'react';
import { Product } from '@/types/index';
import { fetchProducts } from '@/services/supabase/supabaseService';

export function useProducts(filters?: { province_id?: string; municipality_id?: string; category_id?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await fetchProducts(filters);
        setProducts(data);
      } catch (err) {
        setError('Falha ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [filters?.province_id, filters?.municipality_id, filters?.category_id]);

  return { products, loading, error };
}
