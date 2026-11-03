export interface SelectionRegion {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export type SelectionToolId =
  | 'simplify'
  | 'stepByStep'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';

export type SelectionActionType =
  | 'simplify'
  | 'explain'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';

export type PageSelection = SelectionRegion;
