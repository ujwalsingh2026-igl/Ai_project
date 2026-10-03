import React, { useEffect, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-modal flex flex-col justify-end bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'w-full bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 rounded-t-2xl shadow-modal max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250 pb-safe',
          className
        )}
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto my-3 shrink-0" />

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              {title}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
