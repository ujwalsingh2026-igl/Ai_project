import React, { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          'w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-modal overflow-hidden flex flex-col animate-in zoom-in-95 duration-200',
          sizes[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-stone-100 dark:border-stone-800">
            <div>
              {typeof title === 'string' ? (
                <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                  {title}
                </h2>
              ) : (
                title
              )}
              {description && (
                <p className="text-xs text-stone-500 mt-0.5">{description}</p>
              )}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Close dialog"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        <div className="p-5 overflow-y-auto max-h-[75vh]">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 p-4 bg-stone-50/60 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
