import React, { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface DividerProps {
  label?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  label,
  orientation = 'horizontal',
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          'w-px h-full bg-stone-200 dark:bg-stone-800 self-stretch',
          className
        )}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={cn('flex items-center gap-3 my-4 w-full select-none', className)}
      >
        <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
          {label}
        </span>
        <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
      </div>
    );
  }

  return (
    <hr
      className={cn(
        'w-full border-0 h-px bg-stone-200 dark:bg-stone-800 my-4',
        className
      )}
    />
  );
};
