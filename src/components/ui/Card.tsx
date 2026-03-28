import React from 'react';
import { cn } from '@/utils/helpers/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card = ({ className, children, onClick }: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all duration-300',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};
