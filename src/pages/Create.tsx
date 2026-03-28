import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Store, ShoppingBag, Wrench, Upload, ChevronRight, CheckCircle2, PlusSquare, X, Globe, Package, Camera, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateProductDescription } from '@/services/ai/gemini';
import { useLocations } from '@/features/marketplace/hooks/useLocations';
import { cn } from '@/utils/helpers/utils';

export const CreatePage = () => {
  const [step, setStep] = useState<'type' | 'form' | 'store'>('type');
  const [type, setType] = useState<'product' | 'service' | null>(null);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      checkStore();
    }
  }, [profile]);

  const checkStore = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', profile?.id)
      .maybeSingle();
    
    setHasStore(!!data);
    if (!data) {
      setStep('store');
    }
  };

  const handleTypeSelect = (selectedType: 'product' | 'service') => {
    setType(selectedType);
    setStep('form');
  };

  if (hasStore === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold">Voltar</span>
      </button>
      <AnimatePresence mode="wait">
        {step === 'store' ? (
          <motion.div
            key="store-creation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StoreForm onSuccess={() => { setHasStore(true); setStep('type'); }} />
          </motion.div>
        ) : step === 'type' ? (
          <motion.div
            key="type-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold mb-2">O que você deseja publicar?</h1>
              <p className="text-slate-400">Escolha o tipo de anúncio para o AngObuy</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TypeCard 
                icon={ShoppingBag} 
                title="Postar Produto" 
                description="Venda itens físicos, roupas, eletrónicos e muito mais."
                onClick={() => handleTypeSelect('product')}
                color="blue"
              />
              <TypeCard 
                icon={Wrench} 
                title="Postar Serviço" 
                description="Ofereça suas habilidades e serviços profissionais."
                onClick={() => handleTypeSelect('service')}
                color="purple"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <button 
              onClick={() => setStep('type')}
              className="text-slate-500 hover:text-white flex items-center gap-2 mb-6 transition-colors font-medium"
            >
              <ChevronRight className="rotate-180 w-4 h-4" />
              Voltar para seleção
            </button>
            
            {type === 'product' && <ProductForm />}
            {type === 'service' && <ServiceForm />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TypeCard = ({ icon: Icon, title, description, onClick, color }: any) => {
  const colors: any = {
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:border-orange-500/50',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:border-blue-500/50',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:border-purple-500/50',
  };

  return (
    <Card 
      className={cn('p-6 cursor-pointer flex items-center gap-6 group transition-all', colors[color])}
      onClick={onClick}
    >
      <div className={cn('p-4 rounded-2xl transition-transform group-hover:scale-110', colors[color].split(' ')[0])}>
        <Icon size={32} />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-1 text-white">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
      <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
    </Card>
  );
};

const StoreForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const { profile, refreshProfile } = useAuth();
  const { provinces, municipalities, fetchMunicipalities } = useLocations();
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    province_id: '',
    municipality_id: '',
    address: '',
    phone: '',
    email: '',
    store_id_doc: '',
    identity_doc: ''
  });

  const [uploadingDocs, setUploadingDocs] = useState({
    store_id: false,
    identity: false
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'store_id' | 'identity') => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingDocs(prev => ({ ...prev, [type]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${type}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('stores')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stores')
        .getPublicUrl(fileName);
      
      setFormData(prev => ({ ...prev, [type === 'store_id' ? 'store_id_doc' : 'identity_doc']: publicUrl }));
    } catch (error) {
      console.error(`Error uploading ${type} doc:`, error);
      alert('Erro ao carregar documento.');
    } finally {
      setUploadingDocs(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/logo-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('stores')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stores')
        .getPublicUrl(fileName);
      
      setLogo(publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao carregar logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('stores')
        .insert({
          owner_id: profile.id,
          name: formData.name.toUpperCase(),
          description: formData.description,
          province_id: formData.province_id || null,
          municipality_id: formData.municipality_id || null,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          profile_image: logo,
          store_id_doc: formData.store_id_doc,
          identity_doc: formData.identity_doc,
          type: 'online',
          public_id: `STORE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        });

      if (error) throw error;
      await refreshProfile();
      onSuccess();
    } catch (error) {
      console.error('Error creating store:', error);
      alert('Erro ao criar loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 space-y-8 bg-slate-900/50 border-white/5 shadow-2xl">
      <div className="text-center">
        <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
          <Store className="text-orange-500" size={40} />
        </div>
        <h2 className="text-3xl font-black text-white">Criar Minha Loja</h2>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
          <span className="text-orange-500 text-xs font-black uppercase tracking-widest">Loja Online</span>
        </div>
        <p className="text-slate-400 mt-2">Configure sua presença no The AngObuy</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-dashed border-white/10 overflow-hidden relative group cursor-pointer" onClick={() => document.getElementById('logo-input')?.click()}>
            {logo ? (
              <img src={logo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                {uploading ? <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> : <Camera size={24} />}
              </div>
            )}
            <input id="logo-input" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logo da Loja</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome da Loja</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              placeholder="Ex: Eletrónicos do Futuro"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
            <textarea 
              required
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 h-32 resize-none focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              placeholder="Conte um pouco sobre sua loja..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Província</label>
              <select 
                required
                value={formData.province_id}
                onChange={e => {
                  setFormData(prev => ({ ...prev, province_id: e.target.value, municipality_id: '' }));
                  fetchMunicipalities(e.target.value);
                }}
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              >
                <option value="">Selecionar</option>
                {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Município</label>
              <select 
                required
                value={formData.municipality_id}
                onChange={e => setFormData(prev => ({ ...prev, municipality_id: e.target.value }))}
                disabled={!formData.province_id}
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all disabled:opacity-50"
              >
                <option value="">Selecionar</option>
                {municipalities.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Endereço Completo</label>
            <input 
              required
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              placeholder="Ex: Rua Direita da Samba, nº 123"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contacto Telefónico</label>
            <input 
              required
              value={formData.phone}
              onChange={e => {
                let val = e.target.value;
                if (!val.startsWith('+244')) val = '+244 ' + val.replace('+244', '').trim();
                setFormData(prev => ({ ...prev, phone: val }));
              }}
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              placeholder="+244 9XX XXX XXX"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">E-mail da Loja</label>
            <input 
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              placeholder="loja@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alvará Comercial / ID da Loja</label>
              <div 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-all"
                onClick={() => document.getElementById('store-id-input')?.click()}
              >
                <span className="text-sm text-slate-400 truncate">
                  {formData.store_id_doc ? 'Documento Carregado' : 'Carregar Alvará'}
                </span>
                {uploadingDocs.store_id ? (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={16} className="text-slate-500" />
                )}
              </div>
              <input id="store-id-input" type="file" className="hidden" onChange={e => handleDocUpload(e, 'store_id')} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Documento de Identidade (BI)</label>
              <div 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-all"
                onClick={() => document.getElementById('identity-input')?.click()}
              >
                <span className="text-sm text-slate-400 truncate">
                  {formData.identity_doc ? 'Documento Carregado' : 'Carregar BI'}
                </span>
                {uploadingDocs.identity ? (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={16} className="text-slate-500" />
                )}
              </div>
              <input id="identity-input" type="file" className="hidden" onChange={e => handleDocUpload(e, 'identity')} />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-lg font-bold" isLoading={loading}>Criar Minha Loja</Button>
      </form>
    </Card>
  );
};

const ProductForm = () => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { provinces, municipalities, fetchMunicipalities } = useLocations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    condition: 'new',
    price: '',
    currency: 'AOA',
    stock: '',
    province_id: '',
    municipality_id: '',
    importer_region: '',
    is_imported: false,
    is_preorder: false,
    country: '',
    delivery_time: '',
    preorder_info: '',
    payment_type: '',
    delivery_method: '',
  });

  const [useStoreLocation, setUseStoreLocation] = useState(true);
  const [storeLocation, setStoreLocation] = useState<{province_id: string, municipality_id: string} | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchStoreLocation();
  }, []);

  const fetchStoreLocation = async () => {
    const { data: store } = await supabase
      .from('stores')
      .select('province_id, municipality_id')
      .eq('owner_id', profile?.id)
      .single();
    
    if (store) {
      setStoreLocation(store);
      if (useStoreLocation) {
        setFormData(prev => ({ 
          ...prev, 
          province_id: store.province_id, 
          municipality_id: store.municipality_id 
        }));
        fetchMunicipalities(store.province_id);
      }
    }
  };

  useEffect(() => {
    if (useStoreLocation && storeLocation) {
      setFormData(prev => ({ 
        ...prev, 
        province_id: storeLocation.province_id, 
        municipality_id: storeLocation.municipality_id 
      }));
      fetchMunicipalities(storeLocation.province_id);
    }
  }, [useStoreLocation, storeLocation]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('product_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    if (data) setSubcategories(data);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: '' }));
    if (categoryId) fetchSubcategories(categoryId);
    else setSubcategories([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile?.id}/products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        newImages.push(publicUrl);
      }
      setImages(newImages);
    } catch (error) {
      console.error('Error uploading product images:', error);
      alert('Erro ao carregar imagens.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value;
    setFormData(prev => ({ ...prev, province_id: provinceId, municipality_id: '' }));
    fetchMunicipalities(provinceId);
  };

  const handleAiDescription = async () => {
    if (!formData.title) return alert("Por favor, insira um título primeiro");
    setAiLoading(true);
    const categoryName = categories.find(c => c.id === formData.category_id)?.name || '';
    const desc = await generateProductDescription(formData.title, categoryName, ["Alta qualidade", "Durável", "Design moderno"]);
    setFormData(prev => ({ ...prev, description: desc || '' }));
    setAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('id, province_id, municipality_id')
        .eq('owner_id', profile?.id)
        .single();

      if (!store) throw new Error('Nenhuma loja encontrada para este usuário. Por favor, crie uma loja primeiro.');

      // Use store location if requested
      const finalProvinceId = useStoreLocation ? store.province_id : formData.province_id;
      const finalMunicipalityId = useStoreLocation ? store.municipality_id : formData.municipality_id;

      const { data: product, error } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
          description: formData.description,
          title: formData.title,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id,
          condition: formData.condition,
          price: parseFloat(formData.price),
          currency: formData.currency,
          stock: parseInt(formData.stock) || null,
          province_id: finalProvinceId || null,
          municipality_id: finalMunicipalityId || null,
          importer_region: formData.importer_region,
          is_imported: formData.is_imported,
          is_preorder: formData.is_preorder,
          country: formData.country,
          delivery_time: formData.delivery_time,
          preorder_info: formData.preorder_info,
          payment_type: formData.payment_type,
          delivery_method: formData.delivery_method,
          public_id: `PROD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          images: images
        })
        .select()
        .single();

      if (error) throw error;

      alert("Produto listado com sucesso!");
      navigate('/');
    } catch (error: any) {
      console.error('Error listing product:', error);
      alert(error.message || 'Falha ao listar produto. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 space-y-6 bg-slate-900/50 border-white/5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Listar um Produto</h2>
        <Button variant="ghost" size="sm" onClick={handleAiDescription} isLoading={aiLoading} className="text-orange-500 hover:bg-orange-500/10">
          <CheckCircle2 className="mr-2 w-4 h-4" />
          Gerar Descrição com IA
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Título do Produto</label>
          <input 
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
            placeholder="Ex: iPhone 15 Pro Max" 
            required 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Categoria</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.category_id}
              onChange={handleCategoryChange}
              required
            >
              <option value="">Selecionar Categoria</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Subcategoria</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.subcategory_id}
              onChange={e => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
              required
              disabled={!formData.category_id}
            >
              <option value="">Selecionar Subcategoria</option>
              {subcategories.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Condição</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.condition}
              onChange={e => setFormData(prev => ({ ...prev, condition: e.target.value }))}
            >
              <option value="new">Novo</option>
              <option value="used">Usado</option>
              <option value="refurbished">Recondicionado</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-slate-400">Preço</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
                placeholder="0.00" 
                required 
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Moeda</label>
              <select 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                value={formData.currency}
                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              >
                <option value="AOA">AOA</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Globe size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Produto Importado</p>
                <p className="text-[10px] text-slate-500">Vem de outro país</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_imported: !prev.is_imported }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_imported ? 'bg-blue-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_imported ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Package size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Sob Encomenda</p>
                <p className="text-[10px] text-slate-500">Requer tempo de espera</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_preorder: !prev.is_preorder }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_preorder ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_preorder ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Conditional Fields for Imported/Preorder */}
        {(formData.is_imported || formData.is_preorder) && (
          <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">País de Origem</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Ex: China, EUA, Portugal"
                  className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm focus:border-orange-500 outline-none transition-colors"
                  required={formData.is_imported}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempo de Entrega</label>
                <input
                  type="text"
                  value={formData.delivery_time}
                  onChange={e => setFormData(prev => ({ ...prev, delivery_time: e.target.value }))}
                  placeholder="Ex: 15-20 dias úteis"
                  className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm focus:border-orange-500 outline-none transition-colors"
                  required={formData.is_preorder}
                />
              </div>
            </div>

            {formData.is_preorder && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
                    <select
                      value={formData.payment_type}
                      onChange={e => setFormData(prev => ({ ...prev, payment_type: e.target.value }))}
                      className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm focus:border-orange-500 outline-none transition-colors"
                    >
                      <option value="">Selecione...</option>
                      <option value="100% Adiantado">100% Adiantado</option>
                      <option value="50% Adiantado / 50% na Entrega">50% Adiantado / 50% na Entrega</option>
                      <option value="Pagamento na Entrega">Pagamento na Entrega</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Método de Entrega</label>
                    <select
                      value={formData.delivery_method}
                      onChange={e => setFormData(prev => ({ ...prev, delivery_method: e.target.value }))}
                      className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm focus:border-orange-500 outline-none transition-colors"
                    >
                      <option value="">Selecione...</option>
                      <option value="Envio Aéreo">Envio Aéreo</option>
                      <option value="Envio Marítimo">Envio Marítimo</option>
                      <option value="Entrega Local">Entrega Local</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Informações Adicionais (Encomenda)</label>
                  <textarea
                    value={formData.preorder_info}
                    onChange={e => setFormData(prev => ({ ...prev, preorder_info: e.target.value }))}
                    placeholder="Detalhes sobre o processo de encomenda..."
                    className="w-full h-32 bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-orange-500 outline-none transition-colors resize-none"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Stock (Opcional)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
              placeholder="1" 
              value={formData.stock}
              onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Região do Importador</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.importer_region}
              onChange={e => setFormData(prev => ({ ...prev, importer_region: e.target.value }))}
            >
              <option value="">Nenhuma</option>
              <option value="Europe">Europa</option>
              <option value="America">América</option>
              <option value="Asia">Ásia</option>
              <option value="Africa">África</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Store size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold">Usar localização da loja</p>
              <p className="text-[10px] text-slate-500">Usa automaticamente a província e município da sua loja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUseStoreLocation(!useStoreLocation)}
            className={`w-12 h-6 rounded-full transition-colors relative ${useStoreLocation ? 'bg-orange-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useStoreLocation ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", useStoreLocation && "opacity-50 pointer-events-none")}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Província</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              required={!useStoreLocation}
              value={formData.province_id}
              onChange={handleProvinceChange}
            >
              <option value="">Selecionar Província</option>
              {provinces.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Município</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              required={!useStoreLocation}
              disabled={!formData.province_id}
              value={formData.municipality_id}
              onChange={e => setFormData(prev => ({ ...prev, municipality_id: e.target.value }))}
            >
              <option value="">Selecionar Município</option>
              {municipalities.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Descrição</label>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 h-32 resize-none focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
            placeholder="Conte-nos sobre o seu produto..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Imagens (Máx 10)</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={handleImageUpload}
          />
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24 flex-shrink-0 group">
                <img src={img} alt="" className="w-full h-full object-cover rounded-xl border border-white/10" />
                <button 
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-orange-500/50 hover:text-orange-500 transition-all flex-shrink-0 bg-slate-800/50"
              >
                {uploadingImages ? (
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusSquare size={24} />
                    <span className="text-[10px] mt-1 font-bold">Adicionar</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-lg font-bold" isLoading={loading}>Listar Produto</Button>
      </form>
    </Card>
  );
};

const ServiceForm = () => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { provinces, municipalities, fetchMunicipalities } = useLocations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    price: '',
    currency: 'AOA',
    province_id: '',
    municipality_id: '',
    availability: 'full-time',
  });

  const [useStoreLocation, setUseStoreLocation] = useState(true);
  const [storeLocation, setStoreLocation] = useState<{province_id: string, municipality_id: string} | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchStoreLocation();
  }, []);

  const fetchStoreLocation = async () => {
    const { data: store } = await supabase
      .from('stores')
      .select('province_id, municipality_id')
      .eq('owner_id', profile?.id)
      .single();
    
    if (store) {
      setStoreLocation(store);
      if (useStoreLocation) {
        setFormData(prev => ({ 
          ...prev, 
          province_id: store.province_id, 
          municipality_id: store.municipality_id 
        }));
        fetchMunicipalities(store.province_id);
      }
    }
  };

  useEffect(() => {
    if (useStoreLocation && storeLocation) {
      setFormData(prev => ({ 
        ...prev, 
        province_id: storeLocation.province_id, 
        municipality_id: storeLocation.municipality_id 
      }));
      fetchMunicipalities(storeLocation.province_id);
    }
  }, [useStoreLocation, storeLocation]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('service_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    if (data) setSubcategories(data);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: '' }));
    if (categoryId) fetchSubcategories(categoryId);
    else setSubcategories([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile?.id}/services/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('services')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('services')
          .getPublicUrl(filePath);
        
        newImages.push(publicUrl);
      }
      setImages(newImages);
    } catch (error) {
      console.error('Error uploading service images:', error);
      alert('Erro ao carregar imagens.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value;
    setFormData(prev => ({ ...prev, province_id: provinceId, municipality_id: '' }));
    fetchMunicipalities(provinceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('id, province_id, municipality_id')
        .eq('owner_id', profile?.id)
        .single();

      if (!store) throw new Error('Nenhuma loja encontrada para este usuário. Por favor, crie uma loja primeiro.');

      // Use store location if requested
      const finalProvinceId = useStoreLocation ? store.province_id : formData.province_id;
      const finalMunicipalityId = useStoreLocation ? store.municipality_id : formData.municipality_id;

      const { data: service, error } = await supabase
        .from('services')
        .insert({
          store_id: store.id,
          description: formData.description,
          title: formData.title,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id,
          price: parseFloat(formData.price),
          currency: formData.currency,
          province_id: finalProvinceId || null,
          municipality_id: finalMunicipalityId || null,
          availability: formData.availability,
          public_id: `SERV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          images: images
        })
        .select()
        .single();

      if (error) throw error;

      alert("Serviço publicado com sucesso!");
      navigate('/');
    } catch (error: any) {
      console.error('Error publishing service:', error);
      alert(error.message || 'Falha ao publicar serviço. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 space-y-6 bg-slate-900/50 border-white/5">
      <h2 className="text-2xl font-bold">Oferecer um Serviço</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Título do Serviço</label>
          <input 
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
            placeholder="Ex: Desenvolvimento Web Freelance" 
            required 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Categoria</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.category_id}
              onChange={handleCategoryChange}
              required
            >
              <option value="">Selecionar Categoria</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Subcategoria</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.subcategory_id}
              onChange={e => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
              required
              disabled={!formData.category_id}
            >
              <option value="">Selecionar Subcategoria</option>
              {subcategories.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-slate-400">Preço (A partir de)</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
                placeholder="0.00" 
                required 
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Moeda</label>
              <select 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                value={formData.currency}
                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              >
                <option value="AOA">AOA</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Disponibilidade</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              value={formData.availability}
              onChange={e => setFormData(prev => ({ ...prev, availability: e.target.value }))}
            >
              <option value="full-time">Tempo Inteiro</option>
              <option value="part-time">Meio Período</option>
              <option value="contract">Contrato</option>
              <option value="on-call">Sob Chamada</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Store size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold">Usar localização da loja</p>
              <p className="text-[10px] text-slate-500">Usa automaticamente a província e município da sua loja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUseStoreLocation(!useStoreLocation)}
            className={`w-12 h-6 rounded-full transition-colors relative ${useStoreLocation ? 'bg-orange-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useStoreLocation ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", useStoreLocation && "opacity-50 pointer-events-none")}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Província</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              required={!useStoreLocation}
              value={formData.province_id}
              onChange={handleProvinceChange}
            >
              <option value="">Selecionar Província</option>
              {provinces.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Município</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              required={!useStoreLocation}
              disabled={!formData.province_id}
              value={formData.municipality_id}
              onChange={e => setFormData(prev => ({ ...prev, municipality_id: e.target.value }))}
            >
              <option value="">Selecionar Município</option>
              {municipalities.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Descrição do Serviço</label>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 h-32 resize-none focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" 
            placeholder="Descreva o que você oferece..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Portfólio / Imagens (Máx 10)</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={handleImageUpload}
          />
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24 flex-shrink-0 group">
                <img src={img} alt="" className="w-full h-full object-cover rounded-xl border border-white/10" />
                <button 
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-orange-500/50 hover:text-orange-500 transition-all flex-shrink-0 bg-slate-800/50"
              >
                {uploadingImages ? (
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusSquare size={24} />
                    <span className="text-[10px] mt-1 font-bold">Adicionar</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-lg font-bold" isLoading={loading}>Publicar Serviço</Button>
      </form>
    </Card>
  );
};
