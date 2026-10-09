import React from 'react';
import {
  Home,
  BookOpen,
  PlusCircle,
  TrendingUp,
  Settings,
  Globe,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Crop,
  StickyNote,
  Trash2,
  Smartphone,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Layers,
  Award,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Search,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Maximize2,
  Minimize2,
  Eye,
  BookMarked,
  GraduationCap,
  Calculator,
  LucideIcon,
  LucideProps,
} from 'lucide-react';

/**
 * Unified icon registry for Noon project.
 * All icons are sourced exclusively from the existing lucide-react package.
 * Single source of truth for changing, updating, or referencing icons.
 */
export const ICON_REGISTRY = {
  // Navigation & Core
  home: Home,
  library: BookOpen,
  addBook: PlusCircle,
  progress: TrendingUp,
  settings: Settings,
  language: Globe,
  sparkles: Sparkles,

  // Directions & Navigation
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUpRight: ArrowUpRight,

  // Actions & States
  check: Check,
  close: X,
  delete: Trash2,
  refresh: RefreshCw,
  rotate: RotateCcw,
  search: Search,
  upload: UploadCloud,
  fullscreen: Maximize2,
  exitFullscreen: Minimize2,
  view: Eye,

  // Tools & Study Aids
  crop: Crop,
  notes: StickyNote,
  mobileFit: Smartphone,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  layers: Layers,
  lightbulb: Lightbulb,
  help: HelpCircle,
  award: Award,
  math: Calculator,
  fileText: FileText,
  bookMarked: BookMarked,
  education: GraduationCap,

  // Status & Alerts
  alert: AlertCircle,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

export interface StandardIconProps extends Omit<LucideProps, 'ref'> {
  name?: IconName;
  icon?: LucideIcon;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

/**
 * Global default stroke settings for rounded, modern, uniform icon styling
 */
export const DEFAULT_ICON_CONFIG = {
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  defaultSize: 18,
};
