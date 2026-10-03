/**
 * LITERIA Design Tokens & Visual Identity System
 * "Write. Create. Remember."
 */

export const tokens = {
  colors: {
    // Palette Neutrals (Warm Literary Stones & Ivory)
    stone: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
      950: '#0c0a09',
    },
    amber: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Semantic Colors
    semantic: {
      background: 'var(--color-bg, #fafaf9)',
      surface: 'var(--color-surface, #ffffff)',
      surfaceElevated: 'var(--color-surface-elevated, #ffffff)',
      primaryText: 'var(--color-text-primary, #1c1917)',
      secondaryText: 'var(--color-text-secondary, #57534e)',
      mutedText: 'var(--color-text-muted, #a8a29e)',
      accent: 'var(--color-accent, #d97706)',
      accentHover: 'var(--color-accent-hover, #b45309)',
      border: 'var(--color-border, #e7e5e4)',
      borderSubtle: 'var(--color-border-subtle, #f5f5f4)',
      success: 'var(--color-success, #15803d)',
      successBg: 'var(--color-success-bg, #f0fdf4)',
      warning: 'var(--color-warning, #b45309)',
      warningBg: 'var(--color-warning-bg, #fffbeb)',
      error: 'var(--color-error, #b91c1c)',
      errorBg: 'var(--color-error-bg, #fef2f2)',
      info: 'var(--color-info, #0369a1)',
      infoBg: 'var(--color-info-bg, #f0f9ff)',
      focus: 'var(--color-focus, #d97706)',
    },
  },

  typography: {
    categories: {
      serif: "'EB Garamond', Georgia, serif",
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', Consolas, Monaco, monospace",
      classic: "'Cinzel', 'Playfair Display', Georgia, serif",
      modern: "'Plus Jakarta Sans', 'Inter', sans-serif",
      handwriting: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive",
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  spacing: {
    0: '0px',
    1: '0.25rem', // 4px
    2: '0.5rem',  // 8px
    3: '0.75rem', // 12px
    4: '1rem',    // 16px
    5: '1.25rem', // 20px
    6: '1.5rem',  // 24px
    8: '2rem',    // 32px
    10: '2.5rem', // 40px
    12: '3rem',   // 48px
    16: '4rem',   // 64px
  },

  radius: {
    none: '0px',
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },

  borders: {
    subtle: '1px solid var(--color-border-subtle, #f5f5f4)',
    default: '1px solid var(--color-border, #e7e5e4)',
    strong: '1.5px solid var(--color-border-strong, #d6d3d1)',
  },

  shadows: {
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    soft: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
    elevated: '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  blur: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
  },

  transparency: {
    frosted: 'rgba(255, 255, 255, 0.75)',
    frostedDark: 'rgba(28, 25, 23, 0.75)',
    subtleOverlay: 'rgba(0, 0, 0, 0.4)',
  },

  zIndex: {
    base: 0,
    dropdown: 50,
    sticky: 100,
    overlay: 200,
    modal: 300,
    popover: 400,
    toast: 500,
    tooltip: 600,
  },

  animation: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  breakpoints: {
    foldable: 540,
    mobile: 640,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    ultrawide: 1536,
  },
} as const;

export type TypographyCategory = keyof typeof tokens.typography.categories;
