import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'translucent';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      interactive = false,
      ...props
    },
    ref
  ) => {
    const variants = {
      default:
        'bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-subtle',
      elevated:
        'bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-soft',
      subtle:
        'bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800/80',
      translucent:
        'bg-white/70 dark:bg-stone-900/70 backdrop-blur-md border border-stone-200/70 dark:border-stone-800/70 shadow-subtle',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl p-5 transition-all duration-200',
          variants[variant],
          interactive &&
            'cursor-pointer hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-soft active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
