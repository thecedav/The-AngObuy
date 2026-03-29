import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { Card } from '@/src/components/ui/Card';
import { User, LogOut, ChevronRight, Settings, HelpCircle, Shield, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export const MenuPage = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: User, label: 'Meu Perfil', path: '/profile', color: 'text-blue-500' },
    { icon: Settings, label: 'Configurações', path: '/settings', color: 'text-slate-400' },
    { icon: Shield, label: 'Privacidade', path: '/privacy', color: 'text-slate-400' },
    { icon: HelpCircle, label: 'Ajuda e Suporte', path: '/support', color: 'text-slate-400' },
    { icon: Info, label: 'Sobre o THE ANGOBUY', path: '/about', color: 'text-slate-400' },
  ];

  return (
    <div className="min-h-screen bg-black px-4 py-6 md:hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Menu</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card 
          className="p-4 bg-slate-900/50 border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => navigate('/profile')}
        >
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
            {profile?.full_name?.[0] || profile?.username?.[0] || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">{profile?.full_name || profile?.username}</h2>
            <p className="text-xs text-slate-500">Ver seu perfil</p>
          </div>
          <ChevronRight className="text-slate-600" />
        </Card>

        {/* Menu Items */}
        <div className="grid grid-cols-1 gap-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center justify-between p-4 bg-slate-900/30 hover:bg-white/5 rounded-2xl border border-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl bg-white/5", item.color)}>
                  <item.icon size={20} />
                </div>
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 transition-all font-bold mt-8"
        >
          <LogOut size={20} />
          <span>Sair da Conta</span>
        </button>

        {/* Branding */}
        <div className="text-center pt-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">
            THE ANGOBUY BY THE CEDAV
          </p>
        </div>
      </div>
    </div>
  );
};
