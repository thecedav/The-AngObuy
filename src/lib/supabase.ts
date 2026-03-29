export * from './supabaseClient';

// Função para atualizar as chaves em tempo de execução
export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  window.location.reload(); // Recarrega para aplicar as novas chaves
};
