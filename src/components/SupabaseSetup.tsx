import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Database, Link, Key, AlertCircle } from 'lucide-react';
import { updateSupabaseConfig } from '../lib/supabase';

export const SupabaseSetup = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) return;
    updateSupabaseConfig(url, key);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md p-8 border-orange-500/30 shadow-[0_0_50px_rgba(242,78,30,0.1)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-4 border border-orange-500/30">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Configuração do Supabase</h1>
          <p className="text-slate-400 text-sm">
            Para começar, conecte o app ao seu projeto do Supabase.
          </p>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="text-orange-500 shrink-0" size={20} />
          <p className="text-xs text-orange-200/70 leading-relaxed">
            As chaves serão salvas apenas no seu navegador. Para uma conexão permanente, adicione-as nos <b>Secrets</b> do AI Studio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">URL do Projeto</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white"
                placeholder="https://xyz.supabase.co"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Chave Pública Anon</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white"
                placeholder="sua-chave-anon-public"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(242,78,30,0.3)]">
            Conectar Agora
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
            The AngObuy Social Marketplace
          </p>
        </div>
      </Card>
    </div>
  );
};
