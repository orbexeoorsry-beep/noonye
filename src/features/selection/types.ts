import { PageSliceRegion } from '../../types/PageSelection';

export type { PageSliceRegion };

export interface SelectionRegion {
  pageNumber: number;
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
  | 'explain'
  | 'simplify'
  | 'translate'
  | 'hint'
  | 'quiz'
  | 'analyze'
  | 'explainFigure';
