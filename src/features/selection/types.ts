export interface SelectionRegion {
  pageNumber: number;
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
  | 'explain'
  | 'simplify'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';
