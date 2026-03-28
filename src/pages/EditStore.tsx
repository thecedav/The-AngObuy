import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Upload, ChevronRight, CheckCircle2, ArrowLeft, Store as StoreIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocations } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';
import { Store } from '@/types';

export const EditStorePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { provinces, municipalities, fetchMunicipalities } = useLocations();
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [licenseFileName, setLicenseFileName] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'selling',
    province_id: '',
    municipality_id: '',
    description: '',
    profile_image: '',
    cover_image: '',
  });

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      
      // Check if user is the owner and store is approved or active
      if (data.owner_id !== profile?.id || (data.status !== 'approved' && !data.is_active)) {
        alert('Esta loja não pode ser editada no momento (deve estar aprovada ou ativa).');
        navigate('/');
        return;
      }

      setFormData({
        name: data.name,
        type: data.type,
        province_id: data.province_id,
        municipality_id: data.municipality_id,
        description: data.description || '',
        profile_image: data.profile_image || '',
        cover_image: data.cover_image || '',
      });
      setIdUrl(data.id_document_url);
      setLicenseUrl(data.business_document_url);
      
      if (data.province_id) {
        fetchMunicipalities(data.province_id);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
      alert('Erro ao carregar dados da loja.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'profile_image' | 'cover_image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}-${field}-${Math.random()}.${fileExt}`;
      const filePath = `store-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stores')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stores')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: publicUrl }));
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      alert('Erro ao carregar imagem.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'license') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, carregue apenas imagens.');
      return;
    }

    if (type === 'id') setUploadingId(true);
    else setUploadingLicense(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (type === 'id') {
        setIdUrl(publicUrl);
        setIdFileName(file.name);
      } else {
        setLicenseUrl(publicUrl);
        setLicenseFileName(file.name);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erro ao carregar documento.');
    } finally {
      if (type === 'id') setUploadingId(false);
      else setUploadingLicense(false);
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value;
    setFormData(prev => ({ ...prev, province_id: provinceId, municipality_id: '' }));
    fetchMunicipalities(provinceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (!idUrl) {
      alert('Por favor, carregue o documento de identidade.');
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          type: formData.type,
          province_id: formData.province_id,
          municipality_id: formData.municipality_id,
          description: formData.description,
          profile_image: formData.profile_image,
          cover_image: formData.cover_image,
          id_document_url: idUrl,
          business_document_url: licenseUrl,
          status: 'pending' // Submit for approval again
        })
        .eq('id', storeId);

      if (error) throw error;

      alert("Alterações enviadas para aprovação! O administrador irá analisar em breve.");
      navigate(`/store/${storeId}`);
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Falha ao atualizar loja. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="text-slate-500 hover:text-white flex items-center gap-2 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <StoreIcon size={24} />
            </div>
            <h2 className="text-2xl font-bold">Editar Informações da Loja</h2>
          </div>
          
          <p className="text-slate-400 text-sm">
            Ao salvar as alterações, sua loja será enviada novamente para aprovação do administrador.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Imagens da Loja */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Imagem de Perfil</label>
                <div className="relative group w-32 h-32 mx-auto">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-white/10 overflow-hidden bg-slate-800">
                    {formData.profile_image ? (
                      <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <StoreIcon size={32} />
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                    <Upload size={24} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'profile_image')}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Imagem de Capa</label>
                <div className="relative group h-32 w-full">
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-white/10 overflow-hidden bg-slate-800">
                    {formData.cover_image ? (
                      <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Upload size={24} />
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer rounded-xl transition-opacity">
                    <Upload size={24} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'cover_image')}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nome da Loja</label>
                <input 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3" 
                  placeholder="Nome da sua loja" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Tipo de Loja</label>
                <select 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3"
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'selling' | 'service' | 'online' }))}
                >
                  <option value="selling">Venda (Produtos)</option>
                  <option value="service">Prestador de Serviços</option>
                  <option value="online">Loja Online</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Descrição da Loja</label>
              <textarea 
                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 h-24 resize-none" 
                placeholder="Conte-nos sobre o seu negócio..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Província</label>
                <select 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3"
                  required
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
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3"
                  required
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

            <div className="space-y-4 p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Documento de Identidade (Apenas Imagem)</label>
                <input 
                  type="file" 
                  ref={idInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'id')}
                />
                <div 
                  onClick={() => idInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-orange-500/50 transition-all cursor-pointer group",
                    idUrl && "border-orange-500/50 bg-orange-500/10 shadow-[0_0_15px_rgba(242,78,30,0.1)]"
                  )}
                >
                  {uploadingId ? (
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  ) : idUrl ? (
                    <CheckCircle2 className="mx-auto mb-2 text-orange-500 w-8 h-8" />
                  ) : (
                    <Upload className="mx-auto mb-2 text-slate-500 group-hover:text-orange-500 transition-colors w-8 h-8" />
                  )}
                  <p className={cn("text-xs font-medium", idUrl ? "text-orange-500" : "text-slate-400")}>
                    {idFileName || (idUrl ? "Documento carregado (Clique para alterar)" : "Carregar documento de identidade")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Alvará Comercial/Prova de Serviço (Apenas Imagem)</label>
                <input 
                  type="file" 
                  ref={licenseInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'license')}
                />
                <div 
                  onClick={() => licenseInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-orange-500/50 transition-all cursor-pointer group",
                    licenseUrl && "border-orange-500/50 bg-orange-500/10 shadow-[0_0_15px_rgba(242,78,30,0.1)]"
                  )}
                >
                  {uploadingLicense ? (
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  ) : licenseUrl ? (
                    <CheckCircle2 className="mx-auto mb-2 text-orange-500 w-8 h-8" />
                  ) : (
                    <Upload className="mx-auto mb-2 text-slate-500 group-hover:text-orange-500 transition-colors w-8 h-8" />
                  )}
                  <p className={cn("text-xs font-medium", licenseUrl ? "text-orange-500" : "text-slate-400")}>
                    {licenseFileName || (licenseUrl ? "Alvará carregado (Clique para alterar)" : "Carregar alvará ou prova de serviço")}
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={saving}>Salvar Alterações e Remeter para Aprovação</Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
