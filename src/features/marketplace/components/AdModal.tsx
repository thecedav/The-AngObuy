import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Advertisement } from '@/types/index';
import { useNavigate } from 'react-router-dom';

interface AdModalProps {
  ad: Advertisement;
  onClose: () => void;
  allAds?: Advertisement[];
  onNext?: () => void;
  onPrev?: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ ad, onClose, allAds, onNext, onPrev }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const navigate = useNavigate();

  const media = ad.media_urls || [];
  const isVideo = (url: string) => url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || url.includes('video');

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex < media.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    } else if (onNext) {
      onNext();
      setCurrentMediaIndex(0);
    }
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    } else if (onPrev) {
      onPrev();
      setCurrentMediaIndex(0);
    }
  };

  const handleAction = () => {
    if (ad.target_product_id) {
      navigate(`/product/${ad.target_product_id}`);
      onClose();
    } else if (ad.target_store_id) {
      navigate(`/store/${ad.target_store_id}`);
      onClose();
    } else if (ad.link_url) {
      window.open(ad.link_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-5xl aspect-[4/5] md:aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Section */}
        <div className="relative flex-1 bg-black flex items-center justify-center group">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${ad.id}-${currentMediaIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full"
            >
              {isVideo(media[currentMediaIndex]) ? (
                <div className="relative w-full h-full">
                  <video 
                    src={media[currentMediaIndex]} 
                    autoPlay={isPlaying}
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute bottom-4 right-4 p-3 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                </div>
              ) : (
                <img 
                  src={media[currentMediaIndex]} 
                  alt={ad.title} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Media Navigation */}
          {media.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {media.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentMediaIndex ? 'w-8 bg-orange-500' : 'w-2 bg-white/30'}`}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          {(onPrev || currentMediaIndex > 0) && (
            <button 
              onClick={handlePrevMedia}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-orange-500 hover:text-black transition-all active:scale-90"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {(onNext || currentMediaIndex < media.length - 1) && (
            <button 
              onClick={handleNextMedia}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-orange-500 hover:text-black transition-all active:scale-90"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-80 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/50">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                Patrocinado
              </span>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight leading-none">{ad.title}</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{ad.content}</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleAction}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {ad.target_product_id ? 'Ver Produto' : ad.target_store_id ? 'Visitar Loja' : 'Saiba Mais'}
              <ExternalLink size={16} />
            </button>
            
            <p className="text-[10px] text-slate-600 text-center uppercase font-bold tracking-tighter">
              The Cedav Marketplace • Publicidade
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
