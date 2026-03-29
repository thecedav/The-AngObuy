import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Eye, 
  AlertCircle, 
  ChevronRight, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Calculator,
  PieChart,
  ShoppingBag,
  ShoppingCart,
  ArrowLeft,
  CreditCard,
  Plus,
  History,
  Wallet,
  MessageSquare,
  MapPin,
  DollarSign,
  X,
  PiggyBank,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { 
  fetchStoreStock, 
  fetchStoreViewsCount, 
  fetchPopularProducts 
} from '@/src/services/supabaseService';
import { cn } from '@/src/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FIXED_CARDS = [
  { name: "Dinheiro em Mão", color: "from-emerald-500 to-emerald-800", icon: "piggy", type: 'cash' },
  { name: "CARTÃO MILLENNIUM ATLÂNTICO", color: "from-blue-600 to-blue-900", icon: "bank", type: 'card' },
  { name: "CARTÃO VISA", color: "from-slate-900 to-black", icon: "visa", type: 'card' },
  { name: "CARTÃO MASTERCARD", color: "from-red-600 to-red-900", icon: "mastercard", type: 'card' },
  { name: "CARTÃO BAI", color: "from-orange-500 to-orange-800", icon: "bank", type: 'card' },
  { name: "CARTÃO BFA", color: "from-violet-600 to-purple-900", icon: "bank", type: 'card' },
  { name: "CARTÃO BCI", color: "from-pink-500 to-rose-800", icon: "bank", type: 'card' },
  { name: "CARTÃO STANDARD BANK", color: "from-amber-800 to-stone-900", icon: "bank", type: 'card' },
  { name: "CARTÃO CAIXA ANGOLA", color: "from-cyan-600 to-blue-800", icon: "bank", type: 'card' },
  { name: "CARTÃO BIC", color: "from-yellow-500 to-amber-700", icon: "bank", type: 'card' }
];

type TabType = 'geral' | 'pay' | 'despesas' | 'assistente' | 'stock';
type StockTabType = 'produtos' | 'serviços';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const BusinessManagementPage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [activeStockTab, setActiveStockTab] = useState<StockTabType>('produtos');
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [viewsCount, setViewsCount] = useState(0);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  
  // Financial State
  const [cards, setCards] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAddingValue, setIsAddingValue] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  
  // AI Assistant State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [businessReport, setBusinessReport] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (storeId && !authLoading && isMounted) {
      fetchData();
    }
  }, [storeId, authLoading, isMounted]);

  const fetchData = async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select(`
          *,
          province:province_id(name),
          municipality:municipality_id(name)
        `)
        .eq('id', storeId)
        .single();
      
      if (!storeData || storeData.owner_id !== user?.id) {
        navigate('/');
        return;
      }
      
      setStore(storeData);

      // Fetch financial data
      await fetchFinancialData();

      // Fetch stock
      const stockData = await fetchStoreStock(storeId!);
      setStock(stockData);

      // Fetch views
      const views = await fetchStoreViewsCount(storeId!);
      setViewsCount(views);

      // Fetch popular products
      const popular = await fetchPopularProducts(storeId!);
      setPopularProducts(popular);

      // Fetch followers
      const { count: fCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);
      setFollowersCount(fCount || 0);

      // Fetch comments (on store products)
      const { count: cCount } = await supabase
        .from('comments')
        .select('*, products!inner(store_id)', { count: 'exact', head: true })
        .eq('products.store_id', storeId);
      setCommentsCount(cCount || 0);

    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    const storedCards = localStorage.getItem(`store_cards_${storeId}`);
    const storedExpenses = localStorage.getItem(`store_expenses_${storeId}`);

    let currentCards = [];
    if (!storedCards) {
      currentCards = FIXED_CARDS.map((card, i) => ({
        id: `card-${i}`,
        store_id: storeId,
        name: card.name,
        color: card.color,
        type: card.type,
        balance_aoa: 0,
        balance_usd: 0,
        balance_eur: 0
      }));
    } else {
      currentCards = JSON.parse(storedCards);
      // FORCE COLOR SYNC: Ensure existing cards get the new colors from FIXED_CARDS
      currentCards = currentCards.map((c: any) => {
        const fixed = FIXED_CARDS.find(f => 
          c.name.toUpperCase().includes(f.name.toUpperCase()) || 
          f.name.toUpperCase().includes(c.name.toUpperCase())
        );
        return fixed ? { ...c, color: fixed.color } : c;
      });
    }
    
    setCards(currentCards);
    localStorage.setItem(`store_cards_${storeId}`, JSON.stringify(currentCards));

    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses));
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearFinancialData = () => {
    const resetCards = cards.map(c => ({ ...c, balance_aoa: 0, balance_usd: 0, balance_eur: 0 }));
    setCards(resetCards);
    setExpenses([]);
    localStorage.setItem(`store_cards_${storeId}`, JSON.stringify(resetCards));
    localStorage.setItem(`store_expenses_${storeId}`, JSON.stringify([]));
    setShowClearConfirm(false);
  };

  const saveFinancialData = (newCards: any[], newExpenses: any[]) => {
    localStorage.setItem(`store_cards_${storeId}`, JSON.stringify(newCards));
    localStorage.setItem(`store_expenses_${storeId}`, JSON.stringify(newExpenses));
  };

  const handleAddValue = (cardId: string, amount: number, currency: string) => {
    const field = `balance_${currency.toLowerCase()}`;
    const newCards = cards.map(c => c.id === cardId ? { ...c, [field]: (c[field] || 0) + amount } : c);
    setCards(newCards);
    saveFinancialData(newCards, expenses);
    setIsAddingValue(null);
  };

  const [newExpenseItems, setNewExpenseItems] = useState<{ name: string, value: number, type: 'compra' | 'gasto' }[]>([{ name: '', value: 0, type: 'compra' }]);

  const handleAddExpense = (expenseData: any) => {
    const { items, cardId, description, location } = expenseData;
    const total = items.reduce((acc: number, item: any) => acc + item.value, 0);
    
    const card = cards.find(c => c.id === cardId);
    
    if (card && card.balance_aoa >= total) {
      const newCards = cards.map(c => c.id === cardId ? { ...c, balance_aoa: c.balance_aoa - total } : c);
      const newExpense = {
        id: `exp-${Date.now()}`,
        store_id: storeId,
        description,
        location,
        items,
        total,
        card_id: cardId,
        created_at: new Date().toISOString()
      };
      
      const newExpenses = [newExpense, ...expenses];
      setExpenses(newExpenses);
      setCards(newCards);
      saveFinancialData(newCards, newExpenses);
      setIsAddingExpense(false);
      setNewExpenseItems([{ name: '', value: 0, type: 'compra' }]);
    } else {
      console.error("Saldo insuficiente no cartão selecionado (AOA)");
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || suggesting) return;

    const userMsg: ChatMessage = { role: 'user', content: userInput };
    setChatHistory(prev => [...prev, userMsg]);
    setUserInput('');
    setSuggesting(true);

    try {
      const lowStock = stock.filter(p => p.stock < 5);
      
      const systemInstruction = `
        Você é o Assistente Estratégico "The Cedav-Business", parte integrante da plataforma The Cedav e do ecossistema The Angobuy.
        
        REGRAS CRÍTICAS:
        1. NUNCA recomende ferramentas, sites ou serviços externos à plataforma The Cedav ou The Angobuy.
        2. Sempre promova o uso das ferramentas internas do The Cedav para gestão, vendas e marketing.
        3. Fale com orgulho da plataforma The Cedav e da empresa The Angobuy.
        4. Use linguagem natural, amigável e profissional.
        5. NUNCA use asteriscos (**) para negrito ou qualquer outra formatação de markdown que polua o texto. As respostas devem ser texto puro e natural.
        6. Se o usuário perguntar sobre outras ferramentas, redirecione-o para as soluções do The Cedav.
        
        Dados da Loja "${store?.name}":
        - Seguidores: ${followersCount}
        - Visualizações: ${viewsCount}
        - Comentários: ${commentsCount}
        - Produtos em Stock: ${stock.length}
        - Saldo Total (AOA): ${totalBalanceAOA.toLocaleString()}
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({ 
        message: userInput 
      });

      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: response.text || 'Desculpe, não consegui processar sua solicitação agora.' 
      };
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error in chat:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Houve um erro na comunicação. Por favor, tente novamente.' }]);
    } finally {
      setSuggesting(false);
    }
  };

  const generateBusinessReport = async () => {
    try {
      setIsGeneratingReport(true);
      const prompt = `
        Gere um relatório de análise de negócio detalhado para a loja "${store?.name}".
        Analise o desempenho de vendas, stock, engajamento (seguidores e visualizações) e saúde financeira.
        O relatório deve ser profissional, encorajador e focado no ecossistema The Cedav e The Angobuy.
        NÃO use asteriscos ou formatação markdown complexa. Use apenas quebras de linha para organizar.
        
        Dados:
        - Vendas estimadas (baseadas em visualizações/seguidores): Médio
        - Saúde Financeira: Saldo de Kz ${totalBalanceAOA.toLocaleString()}
        - Engajamento: ${followersCount} seguidores, ${viewsCount} visualizações.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setBusinessReport(response.text || 'Relatório indisponível.');
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const totalBalanceAOA = useMemo(() => cards.reduce((acc, c) => acc + (c.balance_aoa || 0), 0), [cards]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + (e.total || 0), 0), [expenses]);
  
  const totalStockValue = useMemo(() => {
    return stock.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  }, [stock]);

  const totalProducts = useMemo(() => stock.filter(p => !p.is_service).length, [stock]);
  const totalServices = useMemo(() => stock.filter(p => p.is_service).length, [stock]);

  const expensesByCategory = useMemo(() => {
    const categories: { [key: string]: number } = {};
    expenses.forEach(exp => {
      exp.items.forEach((item: any) => {
        const name = item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase();
        categories[name] = (categories[name] || 0) + item.value;
      });
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [expenses]);

  const chartData = useMemo(() => {
    if (expenses.length === 0) return [{ date: 'Hoje', total: 0 }];
    
    // Group by date
    const grouped = expenses.reduce((acc: any, exp) => {
      const date = new Date(exp.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + exp.total;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, total]) => ({ date, total: total as number }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [expenses]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/store/${storeId}`)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">Gestão de Negócio</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{store?.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-[73px] z-30 bg-black border-b border-white/5 px-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-8 min-w-max py-4">
          {[
            { id: 'geral', label: 'Geral', icon: BarChart3 },
            { id: 'pay', label: 'The Cedav-Pay', icon: Wallet },
            { id: 'despesas', label: 'Despesas', icon: History },
            { id: 'assistente', label: 'Assistente', icon: Sparkles },
            { id: 'stock', label: 'Stock', icon: Package },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all pb-2 border-b-2",
                activeTab === tab.id 
                  ? "text-orange-500 border-orange-500" 
                  : "text-slate-500 border-transparent hover:text-white"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div 
              key="geral"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Cards */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase tracking-widest">Painel de Controle</h2>
                <button 
                  onClick={generateBusinessReport}
                  disabled={isGeneratingReport}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingReport ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <BarChart3 size={16} />}
                  Analisar Negócio
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Saldo Total</p>
                  <h2 className="text-2xl font-black">Kz {totalBalanceAOA.toLocaleString()}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-green-500 font-bold">
                    <ArrowUpRight size={12} />
                    +5.4% este mês
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Total Despesas</p>
                  <h2 className="text-2xl font-black">Kz {totalExpenses.toLocaleString()}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-red-500 font-bold">
                    <ArrowDownRight size={12} />
                    +12.1% este mês
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Visualizações</p>
                  <h2 className="text-2xl font-black">{viewsCount}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-500 font-bold">
                    <Eye size={12} />
                    Visitantes únicos
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Seguidores</p>
                  <h2 className="text-2xl font-black">{followersCount}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-purple-500 font-bold">
                    <Users size={12} />
                    Comunidade ativa
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-orange-500" />
                    Fluxo de Caixa
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        />
                        <Area type="monotone" dataKey="total" stroke="#f97316" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <PieChart size={16} className="text-blue-500" />
                    Gastos por Categoria
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={expensesByCategory.length > 0 ? expensesByCategory : [{ name: 'Sem dados', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#facc15', '#22d3ee', '#f43f5e', '#06b6d4', '#84cc16'][index % 10]} />
                          ))}
                          {expensesByCategory.length === 0 && <Cell fill="#ffffff10" />}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6">Cartões com Maior Uso</h3>
                  <div className="space-y-4">
                    {cards.slice(0, 3).map((card, i) => (
                      <div key={card.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{card.name}</p>
                            {card.balance_aoa > 0 && (
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Kz {card.balance_aoa.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-green-500">Ativo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6">Últimas Despesas</h3>
                  <div className="space-y-4">
                    {expenses.slice(0, 3).map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <ArrowDownRight size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{exp.description}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{new Date(exp.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black">- Kz {exp.total.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {expenses.length === 0 && (
                      <p className="text-center py-8 text-slate-600 italic">Nenhuma despesa registrada</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pay' && (
            <motion.div 
              key="pay"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Gestão de Dinheiro</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Carteira de Cartões e Cash do Negócio</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest border border-red-500/20"
                  >
                    <X size={16} />
                    Limpar Tudo
                  </button>
                  <div className="bg-slate-900/80 border border-white/10 px-8 py-4 rounded-2xl text-center min-w-[240px]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Total em todos os cartões</p>
                    <h3 className="text-3xl font-black text-emerald-500">{totalBalanceAOA.toLocaleString()} Kz</h3>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2">
                    <Plus size={16} />
                    Adicionar Cartão
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "bg-gradient-to-br border border-white/20 p-6 rounded-2xl relative overflow-hidden flex flex-col min-h-[200px] shadow-xl",
                      card.color || "from-slate-800 to-slate-900"
                    )}
                  >
                    {/* Card Chip & Logo */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-8 bg-yellow-500/80 rounded-md border border-yellow-600/50 relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-30">
                          {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20" />)}
                        </div>
                      </div>
                      <div className="opacity-80">
                        {card.type === 'cash' ? (
                          <PiggyBank size={24} className="text-white" />
                        ) : (
                          <div className="flex flex-col items-end">
                            <p className="text-[6px] font-black uppercase tracking-widest text-white/60">Business</p>
                            {card.name.includes('VISA') ? <span className="text-lg font-black italic text-white">VISA</span> : 
                             card.name.includes('Mastercard') ? <div className="flex -space-x-2"><div className="w-4 h-4 rounded-full bg-red-500" /><div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80" /></div> : 
                             <Building2 size={20} className="text-white" />}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/70 mb-1">Angola Business Account</p>
                      <h3 className="text-sm font-bold uppercase text-white truncate">{card.name}</h3>
                    </div>

                    <div className="mt-auto">
                      <div className="mb-4">
                        {card.balance_aoa > 0 ? (
                          <>
                            <p className="text-[7px] font-black uppercase tracking-widest text-white/60 mb-1">Saldo Disponível</p>
                            <h4 className="text-xl font-black text-white">{card.balance_aoa.toLocaleString()} Kz</h4>
                          </>
                        ) : (
                          <div className="h-10" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsAddingValue(card.id)}
                          className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md py-2 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border border-white/10 text-white"
                        >
                          {card.type === 'cash' ? 'Guardar' : 'Depósito'}
                        </button>
                        <button 
                          className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md py-2 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border border-white/10 text-white"
                        >
                          Tirar
                        </button>
                      </div>
                    </div>
                    
                    {/* Decorative Card Elements */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-black/10 rounded-full blur-xl" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'despesas' && (
            <motion.div 
              key="despesas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-widest">Controle de Despesas</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Registre e monitore seus gastos</p>
                </div>
                <button 
                  onClick={() => setIsAddingExpense(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Adicionar Despesa
                </button>
              </div>

              <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Local</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Itens</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                          {new Date(exp.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold">{exp.description}</td>
                        <td className="px-6 py-4 text-xs text-slate-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {exp.location}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {exp.items.map((item: any, i: number) => (
                              <span key={i} className="text-[8px] font-black uppercase px-2 py-0.5 bg-white/5 rounded-full text-slate-500">
                                {item.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-red-500">
                          - Kz {exp.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">
                          Nenhuma despesa registrada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'assistente' && (
            <motion.div 
              key="assistente"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto h-[70vh] flex flex-col"
            >
              <div className="bg-slate-900/50 border border-white/10 rounded-t-[2.5rem] p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Sparkles className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-widest">The Cedav-Business</h2>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Consultoria Estratégica</p>
                </div>
              </div>

              <div className="flex-1 bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare size={32} className="text-slate-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-widest mb-2">Como posso ajudar hoje?</h3>
                    <p className="text-sm text-slate-500 max-w-xs">
                      Tire suas dúvidas sobre gestão, stock ou estratégias de vendas exclusivas para a plataforma The Cedav.
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-orange-500 text-white rounded-tr-none" 
                        : "bg-slate-800 text-slate-200 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] uppercase font-bold text-slate-600 mt-2 px-2">
                      {msg.role === 'user' ? 'Você' : 'The Cedav-Business'}
                    </span>
                  </motion.div>
                ))}
                {suggesting && (
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-800 px-6 py-4 rounded-3xl rounded-tl-none">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form 
                onSubmit={handleSendMessage}
                className="bg-slate-900/50 border border-white/10 rounded-b-[2.5rem] p-4 flex gap-4"
              >
                <input 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={suggesting || !userInput.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-orange-500/20"
                >
                  <ChevronRight size={24} />
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'stock' && (
            <motion.div 
              key="stock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-widest">Gestão de Stock</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Monitore a disponibilidade dos seus produtos e serviços</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900/80 border border-white/10 px-8 py-4 rounded-2xl text-center min-w-[240px] shadow-2xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Valor Total em Stock</p>
                    <h3 className="text-3xl font-black text-orange-500">{totalStockValue.toLocaleString()} Kz</h3>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{totalProducts} Produtos</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{totalServices} Serviços</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/create')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Adicionar Produto
                  </button>
                </div>
              </div>

              {/* Stock Sub-tabs */}
              <div className="flex items-center gap-4 border-b border-white/5 mb-6">
                {['produtos', 'serviços'].map((sTab) => (
                  <button
                    key={sTab}
                    onClick={() => setActiveStockTab(sTab as StockTabType)}
                    className={cn(
                      "pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 px-4",
                      activeStockTab === sTab 
                        ? "text-orange-500 border-orange-500" 
                        : "text-slate-500 border-transparent hover:text-white"
                    )}
                  >
                    {sTab}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stock.filter(p => activeStockTab === 'produtos' ? !p.is_service : p.is_service).map((product) => (
                  <div key={product.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl flex items-center gap-4 hover:border-white/10 transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-black/50 overflow-hidden flex-shrink-0">
                      {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{product.name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Kz {product.price.toLocaleString()}</p>
                      {!product.is_service && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className={cn(
                            "h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden"
                          )}>
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                product.stock < 5 ? "bg-red-500" : "bg-green-500"
                              )}
                              style={{ width: `${Math.min((product.stock / 20) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black",
                            product.stock < 5 ? "text-red-500" : "text-green-500"
                          )}>
                            {product.stock}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stock.filter(p => activeStockTab === 'produtos' ? !p.is_service : p.is_service).length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-600 italic">
                    Nenhum {activeStockTab} cadastrado.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {businessReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBusinessReport(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest">Relatório Estratégico</h3>
                <button onClick={() => setBusinessReport(null)} className="p-2 hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                {businessReport}
              </div>
              <button 
                onClick={() => setBusinessReport(null)}
                className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all mt-8"
              >
                Fechar Relatório
              </button>
            </motion.div>
          </div>
        )}

        {isAddingValue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingValue(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest">Adicionar Valor</h3>
                <button onClick={() => setIsAddingValue(null)} className="p-2 hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddValue(isAddingValue, Number(formData.get('amount')), String(formData.get('currency')));
              }} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Valor</label>
                  <input 
                    name="amount"
                    type="number" 
                    required
                    placeholder="0.00"
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xl font-black focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Moeda</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['AOA', 'USD', 'EUR'].map((curr) => (
                      <label key={curr} className="relative cursor-pointer group">
                        <input type="radio" name="currency" value={curr} defaultChecked={curr === 'AOA'} className="peer sr-only" />
                        <div className="bg-black border border-white/10 rounded-xl py-3 text-center text-xs font-black peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all">
                          {curr}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all mt-4"
                >
                  Confirmar Depósito
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {businessReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBusinessReport(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <BarChart3 size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest">Relatório de Análise</h3>
                </div>
                <button onClick={() => setBusinessReport(null)} className="p-2 hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-medium">
                  {businessReport}
                </div>
              </div>

              <button 
                onClick={() => setBusinessReport(null)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all mt-8"
              >
                Fechar Relatório
              </button>
            </motion.div>
          </div>
        )}

        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingExpense(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest">Nova Despesa</h3>
                <button onClick={() => setIsAddingExpense(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                handleAddExpense({
                  description: formData.get('description'),
                  location: formData.get('location'),
                  items: newExpenseItems.filter(i => i.name && i.value > 0),
                  cardId: formData.get('cardId')
                });
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Descrição da Despesa</label>
                    <input name="description" required placeholder="Ex: Compras Mensais" className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Onde foi realizado?</label>
                    <input name="location" required placeholder="Ex: Supermercado X" className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Itens de Gasto e Compras (AOA)</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setNewExpenseItems([...newExpenseItems, { name: '', value: 0, type: 'compra' }])}
                        className="text-[8px] font-black uppercase text-orange-500 hover:text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full"
                      >
                        + Adicionar Compra
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewExpenseItems([...newExpenseItems, { name: '', value: 0, type: 'gasto' }])}
                        className="text-[8px] font-black uppercase text-blue-500 hover:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full"
                      >
                        + Adicionar Gasto
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {newExpenseItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center bg-black/20 p-2 rounded-xl border border-white/5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.type === 'compra' ? "bg-orange-500" : "bg-blue-500"
                        )} />
                        <input 
                          placeholder={item.type === 'compra' ? "Nome do Produto" : "Descrição do Gasto"}
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...newExpenseItems];
                            updated[index].name = e.target.value;
                            setNewExpenseItems(updated);
                          }}
                          className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500" 
                        />
                        <input 
                          type="number"
                          placeholder="Preço"
                          value={item.value || ''}
                          onChange={(e) => {
                            const updated = [...newExpenseItems];
                            updated[index].value = Number(e.target.value);
                            setNewExpenseItems(updated);
                          }}
                          className="w-32 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500" 
                        />
                        <button 
                          type="button"
                          onClick={() => setNewExpenseItems(newExpenseItems.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Total da Despesa</span>
                    <span className="text-lg font-black text-orange-500">Kz {newExpenseItems.reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Selecionar Cartão para Pagamento</label>
                  <select name="cardId" required className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500">
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>{card.name} (Saldo: Kz {card.balance_aoa.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Registrar Despesa
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showClearConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest mb-4">Confirmar Limpeza</h3>
              <p className="text-slate-400 text-sm mb-8">Deseja realmente limpar todos os saldos e despesas? Esta ação não pode ser desfeita.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={clearFinancialData}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                  Limpar Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

