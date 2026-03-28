import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface AuthLoadingOverlayProps {
  message: string | null;
}

export const AuthLoadingOverlay: React.FC<AuthLoadingOverlayProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-64 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute inset-0 ps6-processing" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">
                {message}
              </span>
              <p className="text-slate-400 text-xs uppercase tracking-tighter font-bold">Processamento PS6 em curso</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
