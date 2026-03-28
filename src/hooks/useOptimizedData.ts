import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Product, Service, Store } from '../types';

const API_BASE = '/api';

export const useProducts = (filters?: any) => {
  return useQuery<Product[]>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/products`, { 
        params: { 
          limit: 20,
          offset: 0,
          ...filters 
        } 
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useServices = (filters?: any) => {
  return useQuery<Service[]>({
    queryKey: ['services', filters],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/services`, { 
        params: { 
          limit: 20,
          offset: 0,
          ...filters 
        } 
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useStores = (filters?: any) => {
  return useQuery<Store[]>({
    queryKey: ['stores', filters],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/stores`, { 
        params: { 
          limit: 20,
          offset: 0,
          ...filters 
        } 
      });
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useUsers = (filters?: any) => {
  return useQuery<any[]>({
    queryKey: ['users', filters],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/users`, { 
        params: { 
          limit: 20,
          offset: 0,
          ...filters 
        } 
      });
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useUser = (id: string | undefined) => {
  return useQuery<any>({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await axios.get(`${API_BASE}/users/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useInvalidateCache = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (type: 'products' | 'services' | 'stores') => {
      await axios.post(`${API_BASE}/cache/invalidate`, { type });
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: [type] });
    },
  });
};
