/**
 * Typography system for the Noon educational platform.
 * Maintains optimal Arabic readability with IBM Plex Sans Arabic and Alexandria.
 */

export const TYPOGRAPHY = {
  fonts: {
    display: "'Alexandria', 'IBM Plex Sans Arabic', sans-serif",
    body: "'IBM Plex Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  sizes: {
    display: {
      fontSize: '2rem', // 32px
      lineHeight: '2.5rem',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
    },
    h1: {
      fontSize: '1.5rem', // 24px
      lineHeight: '2rem',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
    },
    h2: {
      fontSize: '1.25rem', // 20px
      lineHeight: '1.75rem',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
    },
    h3: {
      fontSize: '1rem', // 16px
      lineHeight: '1.5rem',
      fontWeight: 600,
      fontFamily: 'var(--font-sans)',
    },
    h4: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      fontWeight: 600,
      fontFamily: 'var(--font-sans)',
    },
    bodyLarge: {
      fontSize: '1rem', // 16px
      lineHeight: '1.625rem',
      fontWeight: 400,
      fontFamily: 'var(--font-sans)',
    },
    body: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.375rem',
      fontWeight: 400,
      fontFamily: 'var(--font-sans)',
    },
    bodySmall: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1.125rem',
      fontWeight: 400,
      fontFamily: 'var(--font-sans)',
    },
    caption: {
      fontSize: '0.6875rem', // 11px
      lineHeight: '0.9375rem',
      fontWeight: 500,
      fontFamily: 'var(--font-sans)',
    },
  },

  // Tailwind utility classes for consistent typography across pages
  classes: {
    display: 'font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight',
    h1: 'font-display text-xl sm:text-2xl font-bold text-slate-900 leading-snug',
    h2: 'font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug',
    h3: 'font-sans text-base font-semibold text-slate-900 leading-normal',
    h4: 'font-sans text-sm font-semibold text-slate-800 leading-normal',
    bodyLarge: 'font-sans text-base text-slate-700 leading-relaxed',
    body: 'font-sans text-sm text-slate-600 leading-relaxed',
    bodySmall: 'font-sans text-xs text-slate-500 leading-normal',
    caption: 'font-sans text-[11px] text-slate-400 font-medium leading-tight',
    badge: 'font-sans text-[10px] font-bold tracking-wide uppercase',
  },
} as const;

export type TypographyVariant = keyof typeof TYPOGRAPHY.classes;
