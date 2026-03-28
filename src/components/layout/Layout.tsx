import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, BottomNav, MobileHeader, TopHeader } from './Navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AuthLoadingOverlay } from '@/components/AuthLoadingOverlay';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticating } = useAuth();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      <AuthLoadingOverlay message={isAuthenticating} />
      <div className={cn("flex mx-auto", !isAdminPage && "max-w-[1920px]")}>
        {/* Left Sidebar (Desktop) */}
        {!isAdminPage && <Sidebar />}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          {!isAdminPage && <MobileHeader />}
          
          {/* Desktop Header */}
          {!isAdminPage && <TopHeader />}
          
          <main className={cn("flex-1", !isAdminPage && "md:pb-0")}>
            <div className={cn(
              "mx-auto px-0 w-full",
              !isAdminPage && "md:px-4 py-0 md:py-6"
            )}>
              {children}
            </div>
          </main>
        </div>

        {/* Right Sidebar (Suggestions) - Hide on Admin Page */}
        {!isAdminPage && (
          <div className="hidden xl:block w-[350px] h-screen sticky top-0 border-l border-white/10 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-400">Sugestões para você</h3>
                <button className="text-xs font-bold hover:text-slate-400 transition-colors">Ver tudo</button>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10" />
                      <div>
                        <p className="text-sm font-bold">utilizador_sugerido_{i}</p>
                        <p className="text-xs text-slate-500">Seguido por angobuy</p>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-orange-500 hover:text-white transition-colors">Seguir</button>
                  </div>
                ))}
              </div>
              
              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                  © 2026 THE ANGOBUY FROM CEDAV
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
