export interface AIResponse {
  success: boolean;
  text: string;
  isGeminiPowered: boolean;
  errorMessage?: string;
  canRetry: boolean;
}

export type AIGatewayResponse = AIResponse;
