import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  Store as StoreIcon, 
  AlertTriangle, 
  Search, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  LayoutDashboard,
  Bell,
  Settings,
  Menu,
  X,
  BarChart3,
  MessageSquare,
  Eye,
  Ban,
  RefreshCw,
  Clock,
  ChevronRight,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  ExternalLink,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Store, UserProfile, Advertisement, Province, Municipality, Post } from '@/types';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

type AdminSection = 'overview' | 'approvals' | 'users' | 'stores' | 'ads' | 'moderation' | 'settings';

export default function AdminPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Data States
  const [pendingStores, setPendingStores] = useState<Store[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalPosts: 0,
    pendingApprovals: 0,
    activeAds: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = allUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStores = allStores.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPendingStores = pendingStores.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ad Form State
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({
    placement: 'store_cover',
    active: true
  });
  const [adImage, setAdImage] = useState<File | null>(null);

  useEffect(() => {
    if (isUnlocked) {
      fetchData();
    }
  }, [isUnlocked]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetching admin data for user:', user?.email, user?.id);
      
      // Check if user is admin in database
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user?.id)
        .single();
      
      if (dbUserError) {
        console.error('Error checking admin status in DB:', dbUserError);
      } else {
        console.log('Admin status in DB:', dbUser?.is_admin);
        if (!dbUser?.is_admin && user?.email === 'thecedav@gmail.com') {
          console.warn('User is the main admin but is_admin is FALSE in the database. Please run the SQL fix.');
        }
      }

      // Fetch basic data first to ensure we get counts even if joins fail
      const [
        { data: users, error: usersError },
        { data: rawStores, error: storesError },
        { data: posts, error: postsError },
        { data: adsData, error: adsError },
        { data: provs, error: provsError },
        { data: munics, error: municsError }
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('stores').select(`
          *,
          owner:owner_id(id, full_name, email, photo_url),
          province:province_id(id, name),
          municipality:municipality_id(id, name)
        `).order('created_at', { ascending: false }),
        supabase.from('posts').select('id', { count: 'exact' }),
        supabase.from('advertisements').select('*').order('created_at', { ascending: false }),
        supabase.from('provinces').select('*'),
        supabase.from('municipalities').select('*')
      ]);

      if (usersError) console.error('Error fetching users:', usersError);
      
      let finalStores: Store[] = [];
      
      if (storesError) {
        console.error('Error fetching stores with joins:', storesError);
        // Fallback: fetch stores without joins if the relationship is broken
        const { data: fallbackStores, error: fallbackError } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
        if (fallbackError) {
          console.error('Fallback store fetch failed:', fallbackError);
        } else if (fallbackStores) {
          console.log(`Fallback fetch returned ${fallbackStores.length} stores.`);
          finalStores = fallbackStores as Store[];
        }
      } else if (rawStores) {
        console.log(`Main store fetch returned ${rawStores.length} stores.`);
        finalStores = rawStores as Store[];
      }

      setAllStores(finalStores);
      setPendingStores(finalStores.filter(s => s.status === 'pending') as Store[]);

      if (users) setAllUsers(users);
      if (adsData) setAds(adsData);
      if (provs) setProvinces(provs);
      if (munics) setMunicipalities(munics);

      setStats({
        totalUsers: users?.length || 0,
        totalStores: finalStores.length || 0,
        totalPosts: posts?.length || 0,
        pendingApprovals: finalStores.filter(s => s.status === 'pending').length || 0,
        activeAds: adsData?.filter(a => a.active).length || 0
      });

      console.log('Admin Data Sync Complete:', {
        users: users?.length,
        stores: finalStores.length,
        pending: finalStores.filter(s => s.status === 'pending').length
      });
    } catch (error) {
      console.error('Critical error in admin fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const [unlockError, setUnlockError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Theceda2*#*#') {
      setIsUnlocked(true);
      setUnlockError(false);
    } else {
      setUnlockError(true);
      console.error('Senha incorreta');
    }
  };

  const handleApproveStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: 'approved', is_active: true })
        .eq('id', storeId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao aprovar loja:', error);
    }
  };

  const handleRejectStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: 'rejected', is_active: false })
        .eq('id', storeId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao rejeitar loja:', error);
    }
  };

  const handleBanUser = async (userId: string) => {
    console.log('Funcionalidade de banimento em desenvolvimento para o usuário:', userId);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = newAd.image_url;

      if (adImage) {
        const fileExt = adImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('ads')
          .upload(fileName, adImage);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('ads').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('advertisements')
        .insert([{
          ...newAd,
          image_url: imageUrl,
          public_id: Math.random().toString(36).substring(2, 10).toUpperCase()
        }]);

      if (error) throw error;
      setNewAd({ placement: 'store_cover', active: true });
      setAdImage(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar publicidade:', error);
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir publicidade:', error);
    }
  };

  const handleMessageStore = async (store: Store) => {
    console.log(`Iniciando conversa com ${store.name} como Equipe da AngObuy...`);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Painel Administrativo</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Insira o código de administração para continuar</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setUnlockError(false);
                }}
                placeholder="Código de Acesso"
                className={cn(
                  "w-full bg-black border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors",
                  unlockError ? "border-red-500" : "border-white/10 focus:border-orange-500"
                )}
                autoFocus
              />
              {unlockError && (
                <p className="text-red-500 text-xs font-medium px-1">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20"
            >
              Desbloquear Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Seg', users: 400, posts: 240 },
    { name: 'Ter', users: 300, posts: 139 },
    { name: 'Qua', users: 200, posts: 980 },
    { name: 'Qui', users: 278, posts: 390 },
    { name: 'Sex', users: 189, posts: 480 },
    { name: 'Sáb', users: 239, posts: 380 },
    { name: 'Dom', users: 349, posts: 430 },
  ];

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444'];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-white/10 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">AngObuy Admin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <nav className="px-4 space-y-1">
          <NavButton 
            active={activeSection === 'overview'} 
            onClick={() => setActiveSection('overview')}
            icon={<LayoutDashboard size={20} />}
            label="Visão Geral"
          />
          <NavButton 
            active={activeSection === 'approvals'} 
            onClick={() => setActiveSection('approvals')}
            icon={<CheckCircle size={20} />}
            label="Aprovações"
            badge={stats.pendingApprovals}
          />
          <NavButton 
            active={activeSection === 'users'} 
            onClick={() => setActiveSection('users')}
            icon={<Users size={20} />}
            label="Usuários"
          />
          <NavButton 
            active={activeSection === 'stores'} 
            onClick={() => setActiveSection('stores')}
            icon={<StoreIcon size={20} />}
            label="Lojas"
          />
          <NavButton 
            active={activeSection === 'ads'} 
            onClick={() => setActiveSection('ads')}
            icon={<ImageIcon size={20} />}
            label="Publicidade"
          />
          <NavButton 
            active={activeSection === 'moderation'} 
            onClick={() => setActiveSection('moderation')}
            icon={<AlertTriangle size={20} />}
            label="Moderação"
          />
          <div className="pt-4 mt-4 border-t border-white/5">
            <NavButton 
              active={activeSection === 'settings'} 
              onClick={() => setActiveSection('settings')}
              icon={<Settings size={20} />}
              label="Configurações"
            />
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Administrador</p>
              <p className="text-xs text-slate-500 truncate">thecedav@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold capitalize">
              {activeSection === 'overview' ? 'Painel de Controle' : activeSection}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              className={cn(
                "p-2 text-slate-400 hover:text-white transition-all",
                loading && "animate-spin text-orange-500"
              )}
              title="Atualizar Dados"
            >
              <RefreshCw size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500 w-64"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-white relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-black"></span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {activeSection === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Usuários Totais" value={stats.totalUsers} icon={<Users className="text-blue-500" />} trend="+12%" />
                <StatCard label="Lojas Ativas" value={stats.totalStores} icon={<StoreIcon className="text-green-500" />} trend="+5%" />
                <StatCard label="Publicações" value={stats.totalPosts} icon={<BarChart3 className="text-orange-500" />} trend="+18%" />
                <StatCard label="Aprovações Pendentes" value={stats.pendingApprovals} icon={<CheckCircle className="text-yellow-500" />} trend="-2" />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-6">Crescimento da Plataforma</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        />
                        <Area type="monotone" dataKey="users" stroke="#f97316" fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-6">Distribuição por Categoria</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Moda', value: 400 },
                            { name: 'Serviços', value: 300 },
                            { name: 'Eletrônicos', value: 300 },
                            { name: 'Outros', value: 200 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'approvals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Solicitações de Lojas</h3>
                <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-sm font-medium">
                  {pendingStores.length} pendentes
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredPendingStores.map((store: any) => (
                  <div key={store.id} className="bg-slate-900 rounded-2xl p-6 border border-white/10 flex flex-col lg:flex-row lg:items-center gap-6">
                    <img 
                      src={store.profile_image || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop'} 
                      alt={store.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold truncate">{store.name}</h4>
                        <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                          {store.type === 'selling' ? 'Vendas' : 'Serviços'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-2 line-clamp-1">{store.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {store.province?.name}, {store.municipality?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} /> Dono: {store.owner?.full_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={() => window.open(`/profile/${store.owner?.public_id}`, '_blank')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                        title="Ver Perfil do Dono"
                      >
                        <Users size={20} />
                      </button>
                      <button 
                        onClick={() => handleMessageStore(store)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                        title="Enviar Mensagem"
                      >
                        <MessageSquare size={20} />
                      </button>
                      <button 
                        onClick={() => handleApproveStore(store.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={18} /> Aprovar
                      </button>
                      <button 
                        onClick={() => handleRejectStore(store.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-colors flex items-center gap-2"
                      >
                        <XCircle size={18} /> Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
                {filteredPendingStores.length === 0 && (
                  <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-white/10">
                    <CheckCircle size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-500">Nenhuma solicitação pendente no momento.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Gestão de Usuários</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{allUsers.length} usuários registrados</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-black/20 border-b border-white/10">
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Usuário</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Localização</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data Registro</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((user: any) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={user.photo_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} 
                                className="w-10 h-10 rounded-full object-cover border border-white/10"
                                alt=""
                              />
                              <div>
                                <p className="font-bold text-sm">{user.full_name}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-400">
                            {user.province_id ? 'Luanda, Angola' : 'Não informado'}
                          </td>
                          <td className="p-4 text-sm text-slate-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <MessageSquare size={18} />
                              </button>
                              <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <RefreshCw size={18} />
                              </button>
                              <button 
                                onClick={() => handleBanUser(user.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Ban size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'stores' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Gestão de Lojas</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{allStores.length} lojas cadastradas</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStores.map((store: any) => (
                  <div key={store.id} className="bg-slate-900 rounded-2xl border border-white/10 p-5 hover:border-white/20 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={store.profile_image || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop'} 
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-sm">{store.name}</h4>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            store.status === 'approved' ? "bg-green-500/10 text-green-500" : 
                            store.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {store.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Dono</span>
                        <span className="text-slate-300">{store.owner?.full_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Localização</span>
                        <span className="text-slate-300">{store.province?.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Seguidores</span>
                        <span className="text-slate-300">{store.followers_count || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => window.open(`/store/${store.public_id}`, '_blank')}
                        className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Eye size={14} /> Ver Loja
                      </button>
                      <button 
                        onClick={() => handleMessageStore(store)}
                        className="flex items-center justify-center gap-2 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-xs font-bold transition-colors"
                      >
                        <MessageSquare size={14} /> Mensagem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'ads' && (
            <div className="space-y-8">
              <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold mb-6">Nova Publicidade</h3>
                <form onSubmit={handleCreateAd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Título</label>
                      <input 
                        type="text"
                        value={newAd.title || ''}
                        onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Conteúdo</label>
                      <textarea 
                        value={newAd.content || ''}
                        onChange={(e) => setNewAd({...newAd, content: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 h-24"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Localização</label>
                        <select 
                          value={newAd.placement}
                          onChange={(e) => setNewAd({...newAd, placement: e.target.value as any})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="store_cover">Capa da Loja</option>
                          <option value="news_feed">Feed de Notícias</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Link (Opcional)</label>
                        <input 
                          type="url"
                          value={newAd.link_url || ''}
                          onChange={(e) => setNewAd({...newAd, link_url: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Imagem</label>
                      <div className="relative aspect-video bg-black rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden group">
                        {adImage ? (
                          <img src={URL.createObjectURL(adImage)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <>
                            <ImageIcon size={32} className="text-slate-700 mb-2" />
                            <p className="text-xs text-slate-500">Clique para carregar imagem</p>
                          </>
                        )}
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAdImage(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Província (Alvo)</label>
                        <select 
                          value={newAd.target_province_id || ''}
                          onChange={(e) => setNewAd({...newAd, target_province_id: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="">Todas</option>
                          {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">ID da Loja (Alvo)</label>
                        <input 
                          type="text"
                          value={newAd.target_store_id || ''}
                          onChange={(e) => setNewAd({...newAd, target_store_id: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                          placeholder="ID Público"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Criar Publicidade
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">Publicidades Ativas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ads.map((ad: any) => (
                    <div key={ad.id} className="bg-slate-900 rounded-2xl overflow-hidden border border-white/10 group">
                      <div className="aspect-video relative">
                        <img src={ad.image_url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button 
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                            ad.active ? "bg-green-500 text-white" : "bg-slate-500 text-white"
                          )}>
                            {ad.active ? 'Ativa' : 'Pausada'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold mb-1 truncate">{ad.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{ad.content}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                          <span>{ad.placement === 'store_cover' ? 'Capa' : 'Feed'}</span>
                          <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'moderation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Moderação de Conteúdo</h3>
                <span className="text-sm text-slate-500">Denúncias e revisões pendentes</span>
              </div>
              
              <div className="bg-slate-900 rounded-2xl p-12 border border-white/10 text-center">
                <ShieldAlert size={48} className="mx-auto text-slate-700 mb-4" />
                <h4 className="text-lg font-bold mb-2">Tudo limpo por aqui!</h4>
                <p className="text-slate-500 max-w-md mx-auto">
                  Não há denúncias ou conteúdos pendentes de moderação no momento.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Configurações do Sistema</h3>
                <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors">
                  Salvar Alterações
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-2xl p-6 border border-white/10 space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <LayoutDashboard size={18} className="text-orange-500" /> Geral
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Plataforma</label>
                      <input type="text" defaultValue="CEDAV" className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">E-mail de Suporte</label>
                      <input type="email" defaultValue="suporte@cedav.ao" className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-white/10 space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <ShieldCheck size={18} className="text-orange-500" /> Segurança
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-medium">Aprovação Manual de Lojas</p>
                        <p className="text-xs text-slate-500">Novas lojas precisam de revisão</p>
                      </div>
                      <div className="w-12 h-6 bg-orange-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-medium">Modo de Manutenção</p>
                        <p className="text-xs text-slate-500">Desativa o acesso público</p>
                      </div>
                      <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  badge?: number;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
        active 
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-white")}>
          {icon}
        </span>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-white text-orange-500" : "bg-orange-500 text-white"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, icon, trend }: { label: string; value: number | string; icon: React.ReactNode; trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-black/40 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
          {icon}
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-lg",
          isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
