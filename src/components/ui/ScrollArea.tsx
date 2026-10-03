import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  maxHeight?: string | number;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, maxHeight, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{ maxHeight, ...style }}
        className={cn(
          'overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#d6d3d1_transparent] dark:[scrollbar-color:#44403c_transparent]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
