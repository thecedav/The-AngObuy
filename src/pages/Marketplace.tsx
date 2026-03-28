import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingBag, Wrench, Grid, List, ChevronDown, Star, MapPin, Globe, Package, ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Service, Province, Municipality } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';

import { AdModal } from '@/components/AdModal';
import { Advertisement } from '@/types';

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export const MarketplacePage = () => {
  const [level, setLevel] = useState<'categories' | 'subcategories' | 'items'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<(Product | Service)[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { provinces, municipalities, fetchMunicipalities } = useLocations();
  const navigate = useNavigate();

  const CATEGORY_IMAGES: Record<string, string> = {
    'Bebés': 'https://images.unsplash.com/photo-1590033821368-7f7f469b1551?auto=format&fit=crop&w=400&q=80',
    'Automóveis': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=400&q=80',
    'Moda Masculina': 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=400&q=80',
    'Moda Feminina': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    'Eletrónicos': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80',
    'Imobiliária': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80',
    'Beleza e Saúde': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
    'Desporto e Lazer': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80',
    'Serviços': 'https://images.unsplash.com/photo-1454165833767-027ffea9e778?auto=format&fit=crop&w=400&q=80',
    'Outros': 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80',
    'Bebés & Crianças': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=400&q=80',
    'Casa & Jardim': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80',
    'Alimentação': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80'
  };

  const [allProducts, setAllProducts] = useState<(Product | Service)[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [coverAds, setCoverAds] = useState<Advertisement[]>([]);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [selectedAdIndex, setSelectedAdIndex] = useState(0);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchAllProducts();
    fetchCoverAds();
  }, [activeTab]);

  const fetchCoverAds = async () => {
    try {
      const { data } = await supabase
        .from('news')
        .select('*')
        .eq('active', true)
        .eq('placement', 'cover')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      
      setCoverAds(data || []);
    } catch (error) {
      console.error('Error fetching cover ads:', error);
    }
  };

  useEffect(() => {
    if (coverAds.length > 1) {
      const timer = setInterval(() => {
        setCurrentCoverIndex(prev => (prev + 1) % coverAds.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [coverAds]);

  const fetchAllProducts = async () => {
    setLoadingAll(true);
    try {
      const { data } = await supabase
        .from(activeTab === 'products' ? 'products' : 'services')
        .select('*, store:store_id(*), province:province_id(name), municipality:municipality_id(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      setAllProducts((data || []).map((item: any) => ({ ...item, type: activeTab === 'products' ? 'product' : 'service' })));
    } catch (error) {
      console.error('Error fetching all products:', error);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'products' ? 'product_categories' : 'service_categories';
      const { data } = await supabase.from(table).select('*').order('name');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const table = activeTab === 'products' ? 'product_subcategories' : 'service_subcategories';
      const { data } = await supabase.from(table).select('*').eq('category_id', category.id).order('name');
      setSubcategories(data || []);
      setLevel('subcategories');
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = async (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    fetchItems(subcategory.id);
    setLevel('items');
  };

  const fetchItems = async (subcategoryId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from(activeTab === 'products' ? 'products' : 'services').select('*, store:store_id(*), province:province_id(name), municipality:municipality_id(name)');

      if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
      } else if (selectedCategory) {
        query = query.eq('category_id', selectedCategory.id);
      }

      if (selectedProvince) query = query.eq('province_id', selectedProvince);
      if (selectedMunicipality) query = query.eq('municipality_id', selectedMunicipality);

      const { data } = await query.order('created_at', { ascending: false });
      setItems((data || []).map((item: any) => ({ ...item, type: activeTab === 'products' ? 'product' : 'service' })));
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (level === 'items') {
      setLevel('subcategories');
      setSelectedSubcategory(null);
    } else if (level === 'subcategories') {
      setLevel('categories');
      setSelectedCategory(null);
      setSubcategories([]);
    }
  };

  const handleProvinceExpand = (provinceId: string) => {
    if (expandedProvince === provinceId) {
      setExpandedProvince(null);
    } else {
      setExpandedProvince(provinceId);
      fetchMunicipalities(provinceId);
    }
  };

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Header with Search */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {level !== 'categories' && (
              <button onClick={goBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-xl font-black italic tracking-tighter text-orange-500">MARKETPLACE</h1>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3 rounded-xl border transition-all flex items-center gap-2",
              showFilters ? "bg-orange-500 border-orange-500 text-black" : "bg-slate-900 border-white/10 text-white"
            )}
          >
            <Filter size={20} />
            <span className="hidden md:inline font-bold text-sm">Filtros</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Cover Ads Section */}
        {coverAds.length > 0 && level === 'categories' && (
          <div className="w-full mb-8">
            <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden group cursor-pointer" onClick={() => {
              setSelectedAd(coverAds[currentCoverIndex]);
              setSelectedAdIndex(currentCoverIndex);
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={coverAds[currentCoverIndex].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  {coverAds[currentCoverIndex].media_urls?.[0]?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) ? (
                    <video 
                      src={coverAds[currentCoverIndex].media_urls[0]} 
                      autoPlay 
                      muted 
                      loop 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={coverAds[currentCoverIndex].media_urls?.[0] || coverAds[currentCoverIndex].image_url} 
                      alt={coverAds[currentCoverIndex].title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-12">
                    <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-fit mb-4">
                      Destaque
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-2 line-clamp-2">{coverAds[currentCoverIndex].title}</h2>
                    <p className="text-slate-300 text-sm md:text-lg max-w-2xl line-clamp-2">{coverAds[currentCoverIndex].content}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {coverAds.length > 1 && (
                <div className="absolute bottom-6 right-6 flex gap-2 z-20">
                  {coverAds.map((_, i) => (
                    <button 
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentCoverIndex(i); }}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === currentCoverIndex ? "w-8 bg-orange-500" : "w-2 bg-white/30 hover:bg-white/50"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters Sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full md:w-64 space-y-8 shrink-0"
            >
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Localização</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setSelectedProvince(null);
                      setSelectedMunicipality(null);
                      if (level === 'items') fetchItems(selectedSubcategory?.id);
                    }}
                    className={cn(
                      "w-full text-left text-sm py-2 px-3 rounded-lg transition-colors",
                      !selectedProvince ? "bg-orange-500 text-black font-bold" : "text-slate-400 hover:bg-white/5"
                    )}
                  >
                    Todo o País
                  </button>
                  {provinces.map((prov: any) => (
                    <div key={prov.id} className="space-y-1">
                      <button 
                        onClick={() => handleProvinceExpand(prov.id)}
                        className={cn(
                          "w-full flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-colors",
                          selectedProvince === prov.id ? "text-orange-500 font-bold" : "text-slate-400 hover:bg-white/5"
                        )}
                      >
                        <span>{prov.name}</span>
                        <ChevronDown size={16} className={cn("transition-transform", expandedProvince === prov.id && "rotate-180")} />
                      </button>
                      
                      {expandedProvince === prov.id && (
                        <div className="pl-4 space-y-1">
                          <button 
                            onClick={() => {
                              setSelectedProvince(prov.id);
                              setSelectedMunicipality(null);
                              if (level === 'items') fetchItems(selectedSubcategory?.id);
                            }}
                            className={cn(
                              "w-full text-left text-xs py-2 px-3 rounded-lg transition-colors",
                              selectedProvince === prov.id && !selectedMunicipality ? "text-orange-500 font-bold" : "text-slate-500 hover:text-white"
                            )}
                          >
                            Toda a província
                          </button>
                          {municipalities.map((mun: any) => (
                            <button 
                              key={mun.id}
                              onClick={() => {
                                setSelectedProvince(prov.id);
                                setSelectedMunicipality(mun.id);
                                if (level === 'items') fetchItems(selectedSubcategory?.id);
                              }}
                              className={cn(
                                "w-full text-left text-xs py-2 px-3 rounded-lg transition-colors",
                                selectedMunicipality === mun.id ? "text-orange-500 font-bold" : "text-slate-500 hover:text-white"
                              )}
                            >
                              {mun.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <div key={i} className="space-y-4">
                  <div className="aspect-square rounded-full bg-slate-900 animate-pulse" />
                  <div className="h-4 w-2/3 mx-auto bg-slate-900 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {level === 'categories' && (
                <motion.div 
                  key="categories"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col items-center text-center gap-6">
                    <h2 className="text-xl font-black uppercase tracking-tight">Procurar por categoria</h2>
                    
                    {/* Tabs for Products/Services */}
                    <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-fit mx-auto">
                      <button 
                        onClick={() => setActiveTab('products')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all",
                          activeTab === 'products' ? "bg-orange-500 text-black" : "text-slate-400 hover:text-white"
                        )}
                      >
                        Produtos
                      </button>
                      <button 
                        onClick={() => setActiveTab('services')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all",
                          activeTab === 'services' ? "bg-orange-500 text-black" : "text-slate-400 hover:text-white"
                        )}
                      >
                        Serviços
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {displayedCategories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat)}
                        className="group flex flex-col items-center gap-3"
                      >
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-900 border border-white/10 overflow-hidden transition-all group-hover:border-orange-500 group-hover:scale-105 shadow-xl flex items-center justify-center">
                          <img 
                            src={CATEGORY_IMAGES[cat.name] || `https://picsum.photos/seed/${cat.name}/400/400`} 
                            alt={cat.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-xs font-bold text-center group-hover:text-orange-500 transition-colors uppercase tracking-tight">{cat.name}</span>
                      </button>
                    ))}
                  </div>

                  {categories.length > 10 && (
                    <div className="flex justify-center pt-8">
                      <button 
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                      >
                        {showAllCategories ? 'Ver menos' : 'Ver todas as categorias'}
                        <ChevronDown size={20} className={cn("transition-transform", showAllCategories && "rotate-180")} />
                      </button>
                    </div>
                  )}

                  {/* All Products Section */}
                  <div className="pt-12 space-y-8">
                    <div className="flex flex-col items-center text-center gap-4">
                      <h2 className="text-xl font-black uppercase tracking-tight">Explorar {activeTab === 'products' ? 'Produtos' : 'Serviços'}</h2>
                      <div className="h-px w-24 bg-orange-500/50" />
                    </div>

                    {loadingAll ? (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-900 animate-pulse" />
                        ))}
                      </div>
                    ) : activeTab === 'products' ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {allProducts.map((item, index) => (
                          <motion.div
                            key={`all-${item.type}-${item.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(item.type === 'product' ? `/product/${item.public_id}` : `/service/${item.public_id}`)}
                            className="bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden hover:bg-slate-900/50 transition-all cursor-pointer group"
                          >
                            <div className="relative aspect-square overflow-hidden">
                              <img 
                                src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/400/400`} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-1 left-1">
                                <span className={cn(
                                  "text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full border",
                                  item.type === 'product' ? "bg-orange-500/20 text-orange-500 border-orange-500/30" : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                                )}>
                                  {item.type === 'product' ? 'P' : 'S'}
                                </span>
                              </div>
                            </div>

                            <div className="p-2">
                              <h3 className="font-bold text-[8px] line-clamp-1 group-hover:text-orange-500 transition-colors mb-1">{item.title}</h3>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-white">
                                  {item.price ? `${item.price.toLocaleString()}` : 'Consulta'}
                                </span>
                                <div className="text-[6px] text-slate-500 uppercase font-bold">{item.province?.name?.substring(0, 3)}</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allProducts.map((item, index) => (
                          <motion.div
                            key={`all-${item.type}-${item.id}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/service/${item.public_id}`)}
                            className="flex gap-4 p-3 bg-slate-900/30 border border-white/5 rounded-2xl hover:bg-slate-900/50 transition-all cursor-pointer group"
                          >
                            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden border border-white/5">
                              <img 
                                src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/400/400`} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-bold text-sm md:text-base group-hover:text-orange-500 transition-colors line-clamp-1">{item.title}</h3>
                                  <span className="text-xs font-black text-orange-500">
                                    {item.price ? `${item.price.toLocaleString()} AOA` : 'Consulta'}
                                  </span>
                                </div>
                                <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 mb-2">{(item as any).description}</p>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest">
                                    <MapPin size={10} className="text-orange-500" />
                                    <span>{item.province?.name}, {item.municipality?.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest">
                                    <ShoppingBag size={10} className="text-orange-500" />
                                    <span>{(item as any).store?.name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                  <span className="text-[10px] font-bold text-slate-300">4.8</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {level === 'subcategories' && (
                <motion.div 
                  key="subcategories"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black italic">{selectedCategory?.name}</h2>
                    <span className="text-slate-500">Subcategorias</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {subcategories.map(sub => (
                      <button 
                        key={sub.id}
                        onClick={() => handleSubcategoryClick(sub)}
                        className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl hover:border-orange-500/50 hover:bg-slate-900 transition-all group"
                      >
                        <span className="font-bold group-hover:text-orange-500">{sub.name}</span>
                        <ChevronRight size={20} className="text-slate-500 group-hover:text-orange-500 transition-transform group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {level === 'items' && (
                <motion.div 
                  key="items"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black italic">{selectedSubcategory?.name}</h2>
                      <p className="text-sm text-slate-500">{items.length} resultados encontrados</p>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-20">
                      <ShoppingBag size={48} className="mx-auto text-slate-800 mb-4" />
                      <p className="text-slate-500">Nenhum item encontrado nesta subcategoria.</p>
                    </div>
                  ) : activeTab === 'products' ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {items.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index % 6) * 0.05 }}
                          onClick={() => navigate(item.type === 'product' ? `/product/${item.public_id}` : `/service/${item.public_id}`)}
                          className="bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden hover:bg-slate-900/50 transition-all cursor-pointer group"
                        >
                          <div className="relative aspect-square overflow-hidden">
                            <img 
                              src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/400/400`} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1 left-1 flex flex-col gap-1">
                              <span className={cn(
                                "text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full border",
                                item.type === 'product' ? "bg-orange-500/20 text-orange-500 border-orange-500/30" : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                              )}>
                                {item.type === 'product' ? 'P' : 'S'}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 flex flex-col justify-between h-20">
                            <div>
                              <h3 className="font-bold text-[8px] line-clamp-2 group-hover:text-orange-500 transition-colors mb-1">{item.title}</h3>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[10px] font-black text-white">
                                {item.price ? `${item.price.toLocaleString()}` : 'Consulta'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (index % 6) * 0.05 }}
                          onClick={() => navigate(`/service/${item.public_id}`)}
                          className="flex gap-4 p-4 bg-slate-900/30 border border-white/5 rounded-2xl hover:bg-slate-900/50 transition-all cursor-pointer group"
                        >
                          <div className="w-24 h-24 md:w-40 md:h-40 shrink-0 rounded-2xl overflow-hidden border border-white/5">
                            <img 
                              src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/400/400`} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-2">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-base md:text-xl group-hover:text-orange-500 transition-colors">{item.title}</h3>
                                <span className="text-sm md:text-lg font-black text-orange-500">
                                  {item.price ? `${item.price.toLocaleString()} AOA` : 'Consulta'}
                                </span>
                              </div>
                              <p className="text-xs md:text-sm text-slate-400 line-clamp-2 md:line-clamp-3 mb-4">{(item as any).description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">
                                  <MapPin size={12} className="text-orange-500" />
                                  <span>{item.province?.name}, {item.municipality?.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">
                                  <ShoppingBag size={12} className="text-orange-500" />
                                  <span>{(item as any).store?.name}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-bold text-slate-300">4.8</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
      <AnimatePresence>
        {selectedAd && (
          <AdModal 
            ad={selectedAd} 
            onClose={() => setSelectedAd(null)}
            onNext={() => {
              const nextIndex = (selectedAdIndex + 1) % coverAds.length;
              setSelectedAdIndex(nextIndex);
              setSelectedAd(coverAds[nextIndex]);
            }}
            onPrev={() => {
              const prevIndex = (selectedAdIndex - 1 + coverAds.length) % coverAds.length;
              setSelectedAdIndex(prevIndex);
              setSelectedAd(coverAds[prevIndex]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
