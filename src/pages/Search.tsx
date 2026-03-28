import React, { useState, useEffect } from 'react';
import { Search, Store, ShoppingBag, Wrench, MessageCircle, User, ArrowLeft, Filter, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Service, Store as StoreType, Comment, UserProfile } from '@/types/index';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

type SearchResult = {
  type: 'product' | 'service' | 'store' | 'comment';
  data: any;
  priority: number;
};

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'products' | 'services' | 'stores' | 'comments'>('all');
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchFollowedStores();
    }
  }, [user]);

  const fetchFollowedStores = async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('store_id')
        .eq('user_id', user?.id)
        .not('store_id', 'is', null);

      if (error) throw error;
      setFollowedStoreIds(data.map(f => f.store_id as string));
    } catch (error) {
      console.error('Error fetching followed stores:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [productsRes, servicesRes, storesRes, commentsRes] = await Promise.all([
        supabase.from('products').select('*, store:store_id(*)').ilike('title', `%${searchQuery}%`),
        supabase.from('services').select('*, store:store_id(*)').ilike('title', `%${searchQuery}%`),
        supabase.from('stores').select('*').ilike('name', `%${searchQuery}%`),
        supabase.from('comments').select('*, user:user_id(*)').ilike('content', `%${searchQuery}%`)
      ]);

      const allResults: SearchResult[] = [
        ...(productsRes.data || []).map((p: any) => ({
          type: 'product' as const,
          data: p,
          priority: followedStoreIds.includes(p.store_id) ? 2 : 1
        })),
        ...(servicesRes.data || []).map((s: any) => ({
          type: 'service' as const,
          data: s,
          priority: followedStoreIds.includes(s.store_id) ? 2 : 1
        })),
        ...(storesRes.data || []).map((st: any) => ({
          type: 'store' as const,
          data: st,
          priority: followedStoreIds.includes(st.id) ? 3 : 1
        })),
        ...(commentsRes.data || []).map((c: any) => ({
          type: 'comment' as const,
          data: c,
          priority: 0
        }))
      ];

      setResults(allResults.sort((a, b) => b.priority - a.priority));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(r => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'products') return r.type === 'product';
    if (activeFilter === 'services') return r.type === 'service';
    if (activeFilter === 'stores') return r.type === 'store';
    if (activeFilter === 'comments') return r.type === 'comment';
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Search Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-50 border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              autoFocus
              placeholder="Pesquisar no The AngObuy..." 
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-slate-900 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto flex justify-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'products', label: 'Produtos' },
            { id: 'services', label: 'Serviços' },
            { id: 'stores', label: 'Lojas' },
            { id: 'comments', label: 'Comentários' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all",
                activeFilter === filter.id 
                  ? "bg-orange-500 text-black" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-900/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : query.length < 2 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Search size={48} className="text-slate-800 mb-4" />
            <p className="text-slate-500 text-sm font-medium">Digite pelo menos 2 caracteres para pesquisar.</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <p className="text-slate-500 text-sm font-medium">Nenhum resultado encontrado para "{query}".</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((result: any, index: number) => (
              <motion.div
                key={`${result.type}-${result.data.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (result.type === 'product') navigate(`/product/${result.data.public_id}`);
                  if (result.type === 'service') navigate(`/service/${result.data.public_id}`);
                  if (result.type === 'store') navigate(`/store/${result.data.id}`);
                }}
                className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 hover:bg-slate-900/50 transition-all cursor-pointer group"
              >
                <div className="flex gap-4">
                  {/* Icon/Image */}
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {result.type === 'store' ? (
                      result.data.profile_image ? (
                        <img src={result.data.profile_image} className="w-full h-full object-cover" />
                      ) : <Store className="text-slate-600" />
                    ) : result.type === 'comment' ? (
                      result.data.user?.photo_url ? (
                        <img src={result.data.user.photo_url} className="w-full h-full object-cover" />
                      ) : <User className="text-slate-600" />
                    ) : (
                      result.data.images?.[0] ? (
                        <img src={result.data.images[0]} className="w-full h-full object-cover" />
                      ) : result.type === 'product' ? <ShoppingBag className="text-slate-600" /> : <Wrench className="text-slate-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                        {result.type === 'product' ? 'Produto' : result.type === 'service' ? 'Serviço' : result.type === 'store' ? 'Loja' : 'Comentário'}
                      </span>
                      {result.priority > 1 && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold">
                          Seguindo
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white truncate">
                      {result.type === 'store' ? result.data.name : result.type === 'comment' ? result.data.user?.full_name : result.data.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {result.type === 'comment' ? result.data.content : result.data.description}
                    </p>
                  </div>

                  <div className="flex items-center text-slate-600 group-hover:text-white transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
