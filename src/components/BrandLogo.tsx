import React from 'react';
import { BookOpen } from 'lucide-react';
import { APP_CONFIG } from '../config/app.config';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-900 text-stone-100 shadow-sm">
        <BookOpen className={iconSizes[size]} strokeWidth={2} />
      </div>
      <div className="flex flex-col">
        <span
          className={`font-serif tracking-wider font-semibold text-stone-900 dark:text-stone-100 ${textSizes[size]}`}
        >
          {APP_CONFIG.name}
        </span>
        {showTagline && (
          <span className="text-[11px] font-sans tracking-wide text-stone-500 uppercase -mt-0.5">
            {APP_CONFIG.primaryTagline}
          </span>
        )}
      </div>
    </div>
  );
};
