import { useState, useEffect } from 'react';
import { Store } from '../types';
import { fetchStores } from '../services/supabaseService';

export function useStores(filters?: { province_id?: string; municipality_id?: string }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      setLoading(true);
      try {
        const data = await fetchStores(filters);
        setStores(data);
      } catch (err) {
        setError('Falha ao carregar lojas');
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, [filters?.province_id, filters?.municipality_id]);

  return { stores, loading, error };
}
