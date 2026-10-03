import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-xs dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
      secondary:
        'bg-stone-100 text-stone-900 hover:bg-stone-200/80 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
      outline:
        'border border-stone-200 text-stone-800 hover:bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800',
      ghost:
        'text-stone-700 hover:bg-stone-100/70 dark:text-stone-300 dark:hover:bg-stone-800/60',
      subtle:
        'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/60 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 shadow-xs focus-visible:ring-red-400',
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1 gap-1.5 rounded-md',
      sm: 'text-xs px-3.5 py-1.5 gap-2',
      md: 'text-sm px-4 py-2 gap-2.5',
      lg: 'text-base px-6 py-2.5 gap-3',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
