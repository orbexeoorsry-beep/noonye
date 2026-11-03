export interface ImageAnalysis {
  whatAppears: string;
  importantParts: string;
  relationToNearby: string;
  simplifiedExplanation: string;
  quizQuestion: string;
  confidence: string;
  suggestsMathAnalysis: boolean;
}

export type ParsedVisualSections = ImageAnalysis;
