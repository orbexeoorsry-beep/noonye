export type SupportedAITool =
  | 'explain'
  | 'simplify'
  | 'translate'
  | 'hint'
  | 'quiz'
  | 'analyzeProblem'
  | 'explainImage';

export interface AIRequest {
  selectedText?: string;
  selectedImage?: string;
  nearbyText?: string;
  pageNumber: number;
  selectionType: string;
  elementType?: string;
  bookTitle?: string;
  lessonTitle?: string;
  lessonContext?: string;
  studentLevel?: string;
  language?: string;
  targetLanguage?: string;
  hintIndex?: number;
  requestSolution?: boolean;
}

export type AIGatewayRequest = AIRequest;
