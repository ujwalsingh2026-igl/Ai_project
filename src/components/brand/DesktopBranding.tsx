import React from 'react';
import { LiteriaLogo } from './LiteriaLogo';
import { LiteriaWordmark } from './LiteriaWordmark';

interface DesktopBrandingProps {
  collapsed?: boolean;
  className?: string;
}

export const DesktopBranding: React.FC<DesktopBrandingProps> = ({
  collapsed = false,
  className = '',
}) => {
  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <LiteriaLogo size="sm" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LiteriaLogo size="md" />
      <LiteriaWordmark size="md" showTagline={true} />
    </div>
  );
};
