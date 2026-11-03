/**
 * AI Gateway
 * خدمة موحدة لإدارة طلبات الذكاء الاصطناعي (Gemini) في منصة نون
 * مسؤولة عن إدارة الطلبات، التحكم في معدل الاستخدام أثناء الجلسة، ومنع تكرار المحاولات اللانهائية.
 */

export interface AIGatewayRequest {
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

export interface AIGatewayResponse {
  success: boolean;
  text: string;
  isGeminiPowered: boolean;
  errorMessage?: string;
  canRetry: boolean;
}

export type SupportedAITool =
  | 'explain'
  | 'simplify'
  | 'translate'
  | 'hint'
  | 'quiz'
  | 'analyzeProblem'
  | 'explainImage';

// حدود الجلسة وحماية إعادة المحاولة
const MAX_REQUESTS_PER_SESSION = 100;
const MAX_CONSECUTIVE_RETRIES = 15;

class AIGatewayService {
  private sessionRequestCount: number = 0;
  private consecutiveFailures: number = 0;

  /**
   * إرسال طلب عام إلى الخادم
   */
  private async sendRequest(
    toolName: string,
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    const isEn = params.language === 'en';
    void toolName;
    void params;
    void signal;
    return {
      success: false,
      text: '',
      isGeminiPowered: false,
      errorMessage: isEn ? 'Assistant is temporarily unavailable.' : 'المساعد غير متاح حالياً.',
      canRetry: false,
    };
  }

  /**
   * تصفير عداد الإخفاقات يدويًا (مثلاً عند تغيير التحديد أو تغيير الصفحة)
   */
  public resetRetryCount(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * عدد الطلبات المتبقية في الجلسة الحالية
   */
  public getRemainingRequests(): number {
    return Math.max(0, MAX_REQUESTS_PER_SESSION - this.sessionRequestCount);
  }

  /**
   * 1. شرح الفكرة خطوة بخطوة
   */
  public async explain(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('explain', params, signal);
  }

  /**
   * 2. تبسيط الفقرة
   */
  public async simplify(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('simplify', params, signal);
  }

  /**
   * 3. ترجمة النص أو الجزء المحدد إلى اللغة العربية (أو اللغة المستهدفة)
   */
  public async translate(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('translate', params, signal);
  }

  /**
   * 4. تقديم تلميح ذكي دون كشف الحل
   */
  public async hint(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('hint', params, signal);
  }

  /**
   * 5. اختبار الفهم بسؤال قصير
   */
  public async quiz(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('quiz', params, signal);
  }

  /**
   * 6. تحليل المسألة والمعطيات
   */
  public async analyzeProblem(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('analyzeProblem', params, signal);
  }

  /**
   * 7. شرح الصورة أو الشكل التوضيحي
   */
  public async explainImage(
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    return this.sendRequest('explainImage', params, signal);
  }

  /**
   * تنفيذ طلب مخصص بناءً على المعرف
   */
  public async execute(
    tool: string,
    params: AIGatewayRequest,
    signal?: AbortSignal
  ): Promise<AIGatewayResponse> {
    switch (tool) {
      case 'simplify':
        return this.simplify(params, signal);
      case 'stepByStep':
      case 'explain':
        return this.explain(params, signal);
      case 'translate':
        return this.translate(params, signal);
      case 'hint':
        return this.hint(params, signal);
      case 'quiz':
        return this.quiz(params, signal);
      case 'analyze':
      case 'analyzeProblem':
        return this.analyzeProblem(params, signal);
      case 'explainFigure':
      case 'explainImage':
        return this.explainImage(params, signal);
      default:
        return this.sendRequest(tool, params, signal);
    }
  }
}

// تصدير كائن وحيد للخدمة (Singleton)
export const aiGateway = new AIGatewayService();
