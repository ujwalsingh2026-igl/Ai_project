/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cockpit: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          border: 'var(--color-border)',
          text: 'var(--color-text-primary)',
          muted: 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          glow: 'var(--color-accent-glow)',
        },
        severity: {
          info: 'var(--color-severity-info)',
          low: 'var(--color-severity-low)',
          med: 'var(--color-severity-med)',
          high: 'var(--color-severity-high)',
          crit: 'var(--color-severity-crit)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 12px var(--color-accent-glow)',
        'glow-high': '0 0 16px var(--color-severity-high-glow)',
      },
    },
  },
  plugins: [],
}
