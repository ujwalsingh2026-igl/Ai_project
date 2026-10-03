import React from 'react';

interface LiteriaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverted?: boolean;
}

export const LiteriaLogo: React.FC<LiteriaLogoProps> = ({
  size = 'md',
  className = '',
  inverted = false,
}) => {
  const pixelSizes = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const px = pixelSizes[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      aria-label="LITERIA Emblem"
    >
      {/* Ground tile */}
      <rect
        width="64"
        height="64"
        rx="14"
        fill={inverted ? '#fafaf9' : '#1c1917'}
      />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        stroke={inverted ? '#1c1917' : '#fafaf9'}
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* Open Book Spread */}
      <path
        d="M16 43C21 41 27 41.5 32 44C37 41.5 43 41 48 43V23C43 21 37 21.5 32 24C27 21.5 21 21 16 23V43Z"
        fill={inverted ? '#f5f5f4' : '#292524'}
        stroke={inverted ? '#1c1917' : '#fafaf9'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M32 24V44"
        stroke={inverted ? '#1c1917' : '#fafaf9'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* L Stem */}
      <path
        d="M24 16V37C24 37 25 38 28 38H31"
        stroke="#f59e0b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Quill Nib & Plume */}
      <path
        d="M40 14C37 17 35 22 35 27C37 26 40 25.5 43 25.5C43 21 42 16.5 40 14Z"
        fill="#fef3c7"
        fillOpacity="0.9"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M40 14L33 32"
        stroke="#d97706"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};
