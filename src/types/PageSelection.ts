export interface PageSliceRegion {
  pageNumber: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface SelectionRegion {
  pageNumber?: number;
  endPageNumber?: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  pageSlices?: PageSliceRegion[];
  docRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type SelectionToolId =
  | 'simplify'
  | 'stepByStep'
  | 'translate'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';

export type SelectionActionType =
  | 'simplify'
  | 'explain'
  | 'translate'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';

export type PageSelection = SelectionRegion;
