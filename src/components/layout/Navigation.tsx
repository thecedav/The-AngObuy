import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User, LayoutDashboard, Bell, ShoppingBag, PlaySquare, LogOut, Menu, X, Compass, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/helpers/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState, useEffect } from 'react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems: { icon: any; label: string; path: string; target?: string }[] = [
    { icon: Home, label: 'Página Inicial', path: '/' },
    { icon: Search, label: 'Pesquisa', path: '/search' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: PlaySquare, label: 'Reels', path: '/reels' },
    { icon: MessageCircle, label: 'Mensagens', path: '/messages' },
    { icon: Bell, label: 'Notificações', path: '/notifications' },
    { icon: PlusSquare, label: 'Criar', path: '/create' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  if (profile?.is_admin) {
    navItems.push({ icon: LayoutDashboard, label: 'Painel Admin', path: '/admin', target: '_blank' });
  }

  return (
    <aside className="hidden md:flex flex-col w-16 md:w-[245px] h-screen sticky top-0 border-r border-white/10 bg-black px-2 md:px-3 py-4 md:py-8 z-[100]">
      <div className="px-1 md:px-3 mb-10 flex justify-center md:justify-start">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-300 shadow-lg shadow-orange-500/20 shrink-0">
            <span className="text-white font-black text-xl italic">A</span>
          </div>
          <h1 className="hidden md:block text-2xl font-bold tracking-tight italic font-serif text-white group-hover:text-orange-500 transition-colors">The AngObuy</h1>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            target={item.target}
            className={cn(
              "flex items-center justify-center md:justify-start gap-4 px-3 py-3.5 rounded-xl transition-all hover:bg-white/5 group relative",
              location.pathname === item.path ? "text-white font-bold" : "text-slate-300"
            )}
          >
            <item.icon 
              size={26} 
              className={cn(
                "group-hover:scale-110 transition-transform shrink-0",
                location.pathname === item.path ? "text-orange-500" : ""
              )} 
            />
            <span className="hidden md:block text-base">{item.label}</span>
            {location.pathname === item.path && (
              <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full" />
            )}
          </Link>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/10 space-y-1">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center md:justify-start gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all group"
        >
          <LogOut size={26} className="group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden md:block text-base font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export const TopHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="hidden md:flex items-center justify-between px-8 h-20 border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
      <div className="flex-1 max-w-2xl relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar produtos, serviços ou lojas..." 
          onClick={() => navigate('/search')}
          readOnly
          className="w-full bg-slate-900/50 rounded-2xl py-3 pl-14 pr-6 text-sm focus:outline-none cursor-pointer border border-white/5 hover:border-white/20 transition-all shadow-inner"
        />
      </div>
      <div className="flex items-center gap-6">
        <motion.button 
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/notifications')} 
          className="p-2 hover:bg-white/5 rounded-full transition-colors relative bg-white/5"
        >
          <Bell className="w-6 h-6" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/cart')} 
          className="p-2 hover:bg-white/5 rounded-full transition-colors relative bg-white/5"
        >
          <ShoppingCart className="w-6 h-6" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
        </motion.button>
      </div>
    </header>
  );
};


export const MobileHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const tabs = [
    { icon: ShoppingBag, path: '/marketplace', label: 'Marketplace' },
    { icon: PlusSquare, path: '/create', label: 'Criar' },
    { icon: Bell, path: '/notifications', label: 'Notifications' },
    { icon: Menu, path: '/menu', label: 'Menu' },
  ];

  return (
    <header className="md:hidden flex flex-col bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Top Row */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-orange-500 font-black italic tracking-tighter text-xl drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">THE ANGOBUY</span>
        </Link>

        <div className="flex items-center gap-1">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/search')} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
          >
            <Search className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/messages')} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/cart')} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
          >
            <ShoppingCart className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Tabs Row (Facebook Style) */}
      <div className="flex items-center justify-around h-12 border-t border-white/5">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full relative group",
                isActive ? "text-orange-500" : "text-slate-400"
              )}
              whileTap={{ scale: 0.8 }}
            >
              <tab.icon size={24} className={cn("transition-all duration-500", isActive && "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]")} />
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </header>
  );
};

export const BottomNav = () => null;
