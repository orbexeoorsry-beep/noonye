/**
 * Motion and Animation Design Tokens for Noon.
 * Lightweight, accessible transitions that strictly respect prefers-reduced-motion.
 */

export const MOTION = {
  // Duration tokens
  durations: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
  },

  // Easing tokens
  easings: {
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Standard Tailwind Motion Classnames
  classes: {
    // 1. Panel & Modal Opening Transitions
    panelSlideIn:
      'transition-all duration-200 ease-out motion-reduce:transition-none',
    modalBackdrop:
      'animate-in fade-in duration-200 motion-reduce:animate-none',
    modalContent:
      'animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none',
    drawerSlideRight:
      'animate-in slide-in-from-right duration-200 motion-reduce:animate-none',
    drawerSlideLeft:
      'animate-in slide-in-from-left duration-200 motion-reduce:animate-none',

    // 2. Card Appearance
    cardFadeIn:
      'animate-in fade-in duration-200 motion-reduce:animate-none',
    cardSlideUp:
      'animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none',

    // 3. Button & Interactive Element Press Feedback
    buttonPress:
      'transition-all duration-150 active:scale-[0.98] motion-reduce:transform-none select-none',
    clickable:
      'transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transform-none',

    // 4. Loading States
    spinner:
      'animate-spin motion-reduce:animate-pulse',
    pulse:
      'animate-pulse motion-reduce:animate-none',

    // 5. Tooltip & Popover Appearance
    tooltip:
      'animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none',
  },
} as const;

export type MotionClassKey = keyof typeof MOTION.classes;
