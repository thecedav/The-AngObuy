import { useState, useEffect } from 'react';
import { Service } from '../types';
import { fetchServices } from '../services/supabaseService';

export function useServices(filters?: { province_id?: string; municipality_id?: string; category?: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const data = await fetchServices(filters);
        setServices(data);
      } catch (err) {
        setError('Falha ao carregar serviços');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [filters?.province_id, filters?.municipality_id, filters?.category]);

  return { services, loading, error };
}
