import React from 'react';
import { APP_CONFIG } from '../../config/app.config';
import { cn } from '../../utils/cn';

interface LiteriaWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  secondaryTagline?: boolean;
  className?: string;
}

export const LiteriaWordmark: React.FC<LiteriaWordmarkProps> = ({
  size = 'md',
  showTagline = false,
  secondaryTagline = false,
  className = '',
}) => {
  const fontSizes = {
    sm: 'text-base tracking-widest',
    md: 'text-xl tracking-[0.18em]',
    lg: 'text-2xl tracking-[0.2em]',
    xl: 'text-3xl tracking-[0.22em]',
  };

  return (
    <div className={cn('flex flex-col select-none', className)}>
      <span
        className={cn(
          'font-classic-literary uppercase font-bold text-stone-900 dark:text-stone-100',
          fontSizes[size]
        )}
      >
        {APP_CONFIG.name}
      </span>
      {showTagline && (
        <span className="text-[10px] font-sans tracking-[0.14em] uppercase text-stone-500 font-medium -mt-0.5">
          {secondaryTagline ? APP_CONFIG.secondaryTagline : APP_CONFIG.primaryTagline}
        </span>
      )}
    </div>
  );
};
