import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark, User, MoreHorizontal, ShoppingBag, Wrench, Database, CheckCircle, MessageCircle, ArrowLeft, Camera, MapPin, Store, Shield, LogOut, Save, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/src/lib/supabaseClient';
import { useAuth } from '@/src/hooks/useAuth';
import { UserProfile, Post, Store as StoreType } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useFollow } from '@/src/hooks/useFollow';
import { useLocations } from '@/src/hooks/useLocations';
import { deleteStore } from '@/src/services/supabaseService';

export const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, profile: currentProfile, signOut, refreshProfile } = useAuth();
  const { provinces, municipalities, fetchMunicipalities } = useLocations();
  
  const targetUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;
  
  const { isFollowing, loading: followLoading, followerCount, toggleFollow } = useFollow(undefined, isOwnProfile ? undefined : targetUserId);
  
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info');
  const [profile, setProfile] = useState<UserProfile | null>(isOwnProfile ? currentProfile : null);
  const [postsCount, setPostsCount] = useState(0);
  const [userStore, setUserStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state for settings
  const [editForm, setEditForm] = useState({
    name: '',
    full_name: '',
    bio: '',
    province_id: '',
    municipality_id: '',
    photo_url: '',
    cover_image: ''
  });

  useEffect(() => {
    if (currentProfile && isOwnProfile) {
      setEditForm({
        name: currentProfile.name || '',
        full_name: currentProfile.full_name || '',
        bio: currentProfile.bio || '',
        province_id: currentProfile.province_id || '',
        municipality_id: currentProfile.municipality_id || '',
        photo_url: currentProfile.photo_url || '',
        cover_image: currentProfile.cover_image || ''
      });
      if (currentProfile.province_id) {
        fetchMunicipalities(currentProfile.province_id);
      }
    }
  }, [currentProfile, isOwnProfile]);

  useEffect(() => {
    if (targetUserId) {
      if (!isOwnProfile) {
        fetchTargetProfile();
      } else {
        setProfile(currentProfile);
      }
      fetchUserPosts();
      fetchUserStore();
    }
  }, [targetUserId, isOwnProfile, currentProfile]);

  const fetchTargetProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, province:province_id(id, name), municipality:municipality_id(id, name)')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching target profile:', error);
    }
  };

  const fetchUserStore = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', targetUserId)
        .single();

      if (!error && data) {
        setUserStore(data);
      }
    } catch (error) {
      // It's fine if they don't have a store
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', targetUserId)
        .single();

      if (storeData) {
        const { count, error } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeData.id);

        if (error) throw error;
        setPostsCount(count || 0);
      } else {
        setPostsCount(0);
      }
    } catch (error) {
      console.error('Error fetching user posts count:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          full_name: editForm.full_name,
          bio: editForm.bio,
          province_id: editForm.province_id || null,
          municipality_id: editForm.municipality_id || null,
          photo_url: editForm.photo_url,
          cover_image: editForm.cover_image,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      await refreshProfile();
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteStore = async () => {
    if (!userStore) return;
    setDeleting(true);
    try {
      const { error } = await deleteStore(userStore.id);
      if (error) throw error;
      
      setUserStore(null);
      setShowDeleteModal(false);
      alert('Loja eliminada com sucesso!');
      await refreshProfile();
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Erro ao eliminar loja. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(242,78,30,0.3)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-black min-h-screen text-white">
        <p className="text-slate-500">Usuário não encontrado.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 flex items-center gap-2 justify-center mx-auto hover:text-orange-400 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    );
  }

  const isAdmin = currentUser?.email === 'thecedav@gmail.com';

  const handleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    await toggleFollow();
  };

  const handleMessage = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Navigate to messages with this user
    navigate(`/messages/${profile.id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          {/* Profile Image */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black bg-slate-800 overflow-hidden shrink-0 relative group">
            <div className="w-full h-full rounded-full bg-black">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User size={48} />
                </div>
              )}
            </div>
            {isOwnProfile && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={20} className="text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile.full_name || profile.name}</h1>
                </div>
                <p className="text-slate-400 text-sm font-mono mt-0.5">@{profile.public_id}</p>
                <p className="text-slate-300 text-sm mt-2 max-w-lg">{profile.bio || 'Sem biografia disponível.'}</p>
              </div>

              <div className="hidden md:flex items-center gap-3">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 shadow-sm",
                        activeTab === 'settings' 
                          ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_rgba(242,78,30,0.3)]" 
                          : "bg-slate-900 border-white/10 text-white hover:bg-slate-800"
                      )}
                    >
                      <Settings size={18} />
                      Configurações
                    </button>
                    {userStore ? (
                      <button 
                        onClick={() => navigate(`/store/${userStore.id}`)}
                        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold flex items-center gap-2 shadow-md"
                      >
                        <ShoppingBag size={18} />
                        Minha Loja
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/create')}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(242,78,30,0.3)]"
                      >
                        <Plus size={18} />
                        Criar Loja Online
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                        isFollowing 
                          ? "bg-slate-800 text-white border border-white/10" 
                          : "bg-white text-black"
                      )}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                    <button 
                      onClick={handleMessage}
                      className="p-2 bg-slate-900 text-white rounded-lg border border-white/10 hover:bg-slate-800 transition-colors"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="md:hidden flex flex-wrap gap-2 mb-6">
          {isOwnProfile ? (
            <>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2",
                  activeTab === 'settings' 
                    ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_10px_rgba(242,78,30,0.2)]" 
                    : "bg-slate-900 border-white/10 text-white"
                )}
              >
                <Settings size={18} />
                Definições
              </button>
              {userStore ? (
                <button 
                  onClick={() => navigate(`/store/${userStore.id}`)}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingBag size={18} />
                  Loja
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/create')}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(242,78,30,0.3)]"
                >
                  <Plus size={18} />
                  Criar Loja Online
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                onClick={handleFollow}
                disabled={followLoading}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  isFollowing 
                    ? "bg-slate-800 text-white border border-white/10" 
                    : "bg-white text-black"
                )}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
              <button 
                onClick={handleMessage}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg border border-white/10"
              >
                <MessageCircle size={18} />
              </button>
            </>
          )}
        </div>

        {/* Divider with Gradient */}
        <div className="h-[1px] w-full bg-gradient-to-r from-yellow-500 via-red-500 to-green-500 mb-6" />

        {/* Tabs - Simplified for User Profile */}
        <div className="flex items-center justify-center gap-8 md:gap-12 border-b border-white/5 mb-6">
          <button 
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex items-center gap-2 py-4 text-[10px] font-bold tracking-widest uppercase transition-colors border-b-2 -mb-[1px] whitespace-nowrap",
              activeTab === 'info' ? "border-white text-white" : "border-transparent text-slate-500"
            )}
          >
            <User size={14} />
            <span>Perfil</span>
          </button>
          {isOwnProfile && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "flex items-center gap-2 py-4 text-[10px] font-bold tracking-widest uppercase transition-colors border-b-2 -mb-[1px] whitespace-nowrap",
                activeTab === 'settings' ? "border-white text-white" : "border-transparent text-slate-500"
              )}
            >
              <Settings size={14} />
              <span>Configurações</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'settings' && isOwnProfile ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8 pb-12"
            >
              {/* Profile Edit Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-xl shadow-black/50">
                <div className="flex items-center gap-3 mb-4">
                  <User className="text-orange-500" size={20} />
                  <h2 className="text-lg font-bold">Informações Pessoais</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome de Usuário</label>
                    <input 
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all shadow-inner"
                      placeholder="Ex: joao_vendas"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                    <input 
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all shadow-inner"
                      placeholder="Ex: João Paulo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biografia</label>
                  <textarea 
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={3}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none shadow-inner"
                    placeholder="Conte um pouco sobre você ou seu negócio..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Província</label>
                    <select 
                      value={editForm.province_id}
                      onChange={(e) => {
                        setEditForm({ ...editForm, province_id: e.target.value, municipality_id: '' });
                        fetchMunicipalities(e.target.value);
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all appearance-none shadow-inner"
                    >
                      <option value="">Selecionar Província</option>
                      {provinces.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Município</label>
                    <select 
                      value={editForm.municipality_id}
                      onChange={(e) => setEditForm({ ...editForm, municipality_id: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all appearance-none shadow-inner"
                      disabled={!editForm.province_id}
                    >
                      <option value="">Selecionar Município</option>
                      {municipalities.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL da Foto de Perfil</label>
                  <input 
                    type="url"
                    value={editForm.photo_url}
                    onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all shadow-inner"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/40"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowLeft size={20} />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </form>

              {/* Store Management Section */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl shadow-black/50">
                <div className="flex items-center gap-3">
                  <Store className="text-orange-500" size={20} />
                  <h2 className="text-lg font-bold">Minha Loja Online</h2>
                </div>
                
                {userStore ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shadow-md">
                          {userStore.profile_image && <img src={userStore.profile_image} alt={userStore.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-bold">{userStore.name}</p>
                          <p className="text-xs text-slate-500">Loja ativa e pública</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/store/${userStore.id}`)}
                        className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors shadow-sm"
                      >
                        Gerir Loja
                      </button>
                    </div>

                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all text-sm font-bold"
                    >
                      <Trash2 size={18} />
                      Eliminar Minha Loja Definitivamente
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <p className="text-slate-400 text-sm">Você ainda não tem uma loja online. Comece a vender hoje!</p>
                    <button 
                      onClick={() => navigate('/create')}
                      className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 mx-auto shadow-lg"
                    >
                      <Plus size={20} />
                      Criar Loja Agora
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Section */}
              {isAdmin && (
                <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20 space-y-4 shadow-xl shadow-orange-500/5">
                  <div className="flex items-center gap-3">
                    <Shield className="text-orange-500" size={20} />
                    <h2 className="text-lg font-bold text-orange-500">Painel de Administração</h2>
                  </div>
                  <p className="text-slate-400 text-sm">Como proprietário da plataforma, você tem acesso a ferramentas de gestão global.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => navigate('/admin')}
                      className="px-4 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <Database size={16} />
                      Gerir Plataforma
                    </button>
                    <button className="px-4 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Settings size={16} />
                      Definições Globais
                    </button>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="pt-4">
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-4 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                >
                  <LogOut size={20} />
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 pb-12"
            >
              {userStore ? (
                <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-8 text-center">
                  <ShoppingBag size={48} className="mx-auto text-orange-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Sua Loja Online</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Gerencie seus produtos, serviços e acompanhe o crescimento da sua marca na AngObuy.
                  </p>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => navigate(`/store/${userStore.id}`)}
                      className="px-6 py-2 bg-white text-black font-bold rounded-lg"
                    >
                      Aceder à Loja
                    </button>
                    <button 
                      onClick={() => navigate('/add-post')}
                      className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg border border-white/10"
                    >
                      Adicionar Item
                    </button>
                  </div>
                </div>
              ) : isOwnProfile && (
                <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-12 text-center">
                  <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={40} className="text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Comece a Vender Hoje</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Crie sua loja online personalizada e alcance milhares de clientes em todo o país.
                  </p>
                  <button 
                    onClick={() => navigate('/create')}
                    className="px-10 py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                  >
                    Criar Minha Loja
                  </button>
                </div>
              )}
              
              {!isOwnProfile && (
                <div className="text-center py-20 text-slate-500">
                  Este usuário ainda não possui uma loja online.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Store Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="text-red-500" size={40} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">Eliminar Loja?</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Esta ação é <span className="text-red-500 font-bold uppercase">irreversível</span>. 
                    Todos os seus produtos, serviços, seguidores e dados da loja serão apagados permanentemente.
                  </p>
                </div>

                <div className="w-full space-y-3 pt-4">
                  <button
                    onClick={handleDeleteStore}
                    disabled={deleting}
                    className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={20} />
                        SIM, ELIMINAR TUDO
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
