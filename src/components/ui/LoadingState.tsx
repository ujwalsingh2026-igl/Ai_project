import React from 'react';
import { cn } from '../../utils/cn';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizes = {
    xs: 'w-3.5 h-3.5 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[2.5px]',
  };

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        role="status"
        className={cn(
          'rounded-full border-stone-300 dark:border-stone-700 border-t-stone-800 dark:border-t-stone-200 animate-spin shrink-0',
          sizes[size]
        )}
      />
      {label && (
        <span className="text-xs text-stone-500 font-medium select-none">
          {label}
        </span>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-stone-200/70 dark:bg-stone-800 rounded-md',
        className
      )}
    />
  );
};
