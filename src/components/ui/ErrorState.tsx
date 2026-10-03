import React, { type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something interrupted your work',
  message = 'An unexpected error occurred while loading this section. Your manuscripts remain safe locally.',
  onRetry,
  action,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'text-center py-12 px-6 bg-red-50/40 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/40 flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100 mb-1">
        {title}
      </h3>
      <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
