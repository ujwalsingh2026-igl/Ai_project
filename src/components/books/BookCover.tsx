import React from 'react';
import type { BookCoverStyle } from '../../types';
import { Sparkles, Feather } from 'lucide-react';

interface BookCoverProps {
  title: string;
  author: string;
  subtitle?: string;
  coverStyle?: BookCoverStyle;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  author,
  subtitle,
  coverStyle,
  className = '',
  size = 'md',
}) => {
  const bg = coverStyle?.bgColor || '#1c1917';
  const text = coverStyle?.textColor || '#fafaf9';
  const accent = coverStyle?.accentColor || '#d97706';
  const pattern = coverStyle?.pattern || 'classic';

  const sizeClasses = {
    sm: 'w-24 h-36 p-2.5 text-[10px]',
    md: 'w-36 h-52 p-4 text-xs',
    lg: 'w-52 h-76 p-6 text-sm',
  };

  const patternDecorations = {
    minimal: <div className="absolute inset-2 border border-white/10 rounded-sm pointer-events-none" />,
    classic: (
      <div className="absolute inset-2 border-2 border-amber-500/30 rounded-sm pointer-events-none flex flex-col justify-between p-1">
        <div className="w-full h-0.5 bg-amber-500/20" />
        <div className="w-full h-0.5 bg-amber-500/20" />
      </div>
    ),
    vintage: (
      <div className="absolute inset-1.5 border border-amber-600/40 rounded-sm pointer-events-none">
        <div className="absolute inset-1 border border-dashed border-amber-600/30" />
      </div>
    ),
    botanical: (
      <div className="absolute top-2 right-2 text-emerald-500/30">
        <Feather className="w-6 h-6 rotate-45" />
      </div>
    ),
    modern: (
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/5 rounded-tl-full pointer-events-none" />
    ),
  };

  return (
    <div
      className={`relative rounded-md shadow-md flex flex-col justify-between overflow-hidden select-none shrink-0 transition-transform hover:scale-[1.02] duration-200 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {/* Spine highlight line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/30 pointer-events-none" />
      <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-white/15 pointer-events-none" />

      {/* Pattern decoration */}
      {patternDecorations[pattern]}

      {/* Top Header / Emblem */}
      <div className="relative z-10 flex items-center justify-between">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {pattern === 'classic' && <Sparkles className="w-3 h-3 text-amber-500/60" />}
      </div>

      {/* Center Title & Subtitle */}
      <div className="relative z-10 my-auto text-center px-1">
        <h3 className="font-serif font-bold leading-tight line-clamp-3 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 font-serif italic opacity-75 line-clamp-1 text-[0.8em]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom Author */}
      <div className="relative z-10 text-center pt-1 border-t border-white/10">
        <p className="font-sans font-medium uppercase tracking-wider text-[0.75em] opacity-90 truncate">
          {author}
        </p>
      </div>
    </div>
  );
};
