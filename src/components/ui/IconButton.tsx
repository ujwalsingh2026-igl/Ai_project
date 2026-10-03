import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-lg transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 disabled:opacity-40 disabled:pointer-events-none active:scale-95';

    const variants = {
      primary: 'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-xs',
      secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200',
      outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50',
      ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80',
      destructive: 'text-red-600 hover:bg-red-50 hover:text-red-700',
    };

    const sizes = {
      xs: 'w-7 h-7 p-1 text-xs',
      sm: 'w-8 h-8 p-1.5 text-xs',
      md: 'w-9 h-9 p-2 text-sm',
      lg: 'w-10 h-10 p-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

IconButton.displayName = 'IconButton';
