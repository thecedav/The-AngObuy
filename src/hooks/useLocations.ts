import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { Province, Municipality } from '@/src/types';

export const useLocations = () => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .order('name');

      if (error) throw error;
      setProvinces(data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMunicipalities = async (provinceId: string) => {
    if (!provinceId) {
      setMunicipalities([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .eq('province_id', provinceId)
        .order('name');

      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error) {
      console.error('Error fetching municipalities:', error);
    } finally {
      setLoading(false);
    }
  };

  return { provinces, municipalities, loading, fetchMunicipalities };
};
