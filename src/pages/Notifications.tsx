import React, { useEffect, useState } from 'react';
import { Heart, User, MessageCircle, ShoppingBag, Wrench, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // Mock notifications for now as we don't have a notifications table yet
      const mockNotifications = [
        {
          id: '1',
          type: 'like',
          user: { name: 'John Doe', photo_url: null },
          content: 'curtiu sua publicação',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          post_image: 'https://picsum.photos/seed/like/100/100'
        },
        {
          id: '2',
          type: 'comment',
          user: { name: 'Jane Smith', photo_url: null },
          content: 'comentou: "Isso parece incrível!"',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          post_image: 'https://picsum.photos/seed/comment/100/100'
        },
        {
          id: '3',
          type: 'follow',
          user: { name: 'Market Angola', photo_url: null },
          content: 'começou a seguir você',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          post_image: null
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-slate-900" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-900 rounded w-3/4" />
              <div className="h-3 bg-slate-900 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">
      <div className="p-4 md:p-8 flex flex-col items-center">
        <h2 className="text-xl font-black uppercase tracking-tight mb-8 text-center">Notificações</h2>

        <div className="space-y-6 w-full">
          {notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              Nenhuma notificação ainda.
            </div>
          ) : (
            notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                      {notif.user.photo_url ? (
                        <img src={notif.user.photo_url} alt={notif.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={20} /></div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center">
                      {notif.type === 'like' && <Heart size={10} className="text-red-500 fill-red-500" />}
                      {notif.type === 'comment' && <MessageCircle size={10} className="text-orange-500" />}
                      {notif.type === 'follow' && <User size={10} className="text-blue-500" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm leading-tight">
                      <span className="font-bold hover:underline">{notif.user.name}</span>{' '}
                      <span className="text-slate-300">{notif.content}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      há {formatDistanceToNow(new Date(notif.created_at), { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {notif.post_image && (
                  <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10">
                    <img src={notif.post_image} alt="Post" className="w-full h-full object-cover" />
                  </div>
                )}

                {notif.type === 'follow' && (
                  <button className="px-4 py-1.5 bg-orange-500 text-black text-xs font-bold rounded-lg hover:bg-orange-400 transition-colors">
                    Seguir
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
