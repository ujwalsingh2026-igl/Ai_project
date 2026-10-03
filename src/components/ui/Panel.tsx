import React, { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  footer,
  children,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl overflow-hidden shadow-subtle',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-serif">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="flex-1 p-5">{children}</div>

      {footer && (
        <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          {footer}
        </div>
      )}
    </div>
  );
};
