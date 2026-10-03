import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-stone-700 dark:text-stone-300 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-stone-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              'w-full px-3.5 py-2 text-sm bg-white dark:bg-stone-900 border rounded-lg transition-colors placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:focus:ring-amber-400/40 text-stone-900 dark:text-stone-100 disabled:opacity-50 disabled:bg-stone-50',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-400/40'
                : 'border-stone-200 dark:border-stone-700 focus:border-amber-600',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-stone-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-stone-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
