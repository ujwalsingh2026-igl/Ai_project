import React, { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export const Card: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-stone-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-stone-300 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
