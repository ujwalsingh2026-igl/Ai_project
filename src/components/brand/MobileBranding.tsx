import React from 'react';
import { LiteriaLogo } from './LiteriaLogo';
import { LiteriaWordmark } from './LiteriaWordmark';

export const MobileBranding: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LiteriaLogo size="sm" />
      <LiteriaWordmark size="sm" showTagline={false} />
    </div>
  );
};
