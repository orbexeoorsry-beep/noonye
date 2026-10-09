export interface MathAnalysis {
  given: string;
  required: string;
  concept: string;
  hint: string;
  steps: string;
  finalSolution: string;
  confidence: string;
}

export type ParsedMathSections = MathAnalysis;
