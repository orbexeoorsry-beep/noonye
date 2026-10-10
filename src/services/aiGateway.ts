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
const MAX_REQUESTS_PER_SESSION = 40;
const MAX_CONSECUTIVE_RETRIES = 3;

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
    // 1. فحص الحد الأقصى لعدد الطلبات أثناء الجلسة
    if (this.sessionRequestCount >= MAX_REQUESTS_PER_SESSION) {
      return {
        success: false,
        text: '',
        isGeminiPowered: false,
        errorMessage:
          'تم بلوغ الحد الأقصى لطلبات المساعد في هذه الجلسة (40 طلبًا). يمكنك متابعة قراءة الكتاب بحرية.',
        canRetry: false,
      };
    }

    // 2. فحص ومنع تكرار المحاولات اللانهائي
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_RETRIES) {
      return {
        success: false,
        text: '',
        isGeminiPowered: false,
        errorMessage:
          'تم استنفاد محاولات إعادة الاتصال (3 محاولات متتالية). يرجى الانتظار قليلاً أو الاعتماد على الشرح المحلي.',
        canRetry: false,
      };
    }

    this.sessionRequestCount += 1;

    try {
      const response = await fetch('/api/assistant/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolName,
          selectedText: params.selectedText || '',
          selectedImage: params.selectedImage || '',
          nearbyText: params.nearbyText || '',
          pageNumber: params.pageNumber,
          selectionType: params.selectionType,
          elementType: params.elementType || params.selectionType,
          bookTitle: params.bookTitle || '',
          lessonTitle: params.lessonTitle || '',
          lessonContext: params.lessonContext || '',
          studentLevel: params.studentLevel || 'المرحلة المتوسطة',
          language: params.language || 'ar',
          targetLanguage: params.targetLanguage || 'ar',
          hintIndex: params.hintIndex || 1,
          requestSolution: Boolean(params.requestSolution),
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error('فشل استجابة خادم المساعد');
      }

      const data = await response.json();

      // حالة النجاح
      if (data.success && data.text) {
        this.consecutiveFailures = 0; // تصفير عداد الإخفاق
        return {
          success: true,
          text: data.text,
          isGeminiPowered: true,
          canRetry: true,
        };
      }

      // حالة عدم توفر مفتاح Gemini على الخادم (محاكاة محلية آمنة)
      if (data.isGeminiReady === false) {
        this.consecutiveFailures = 0;
        return {
          success: false,
          text: '',
          isGeminiPowered: false,
          errorMessage: data.message || 'خدمة الذكاء الاصطناعي غير متصلة حالياً.',
          canRetry: false,
        };
      }

      // إخفاق من جهة النموذج
      this.consecutiveFailures += 1;
      const reachedRetryLimit = this.consecutiveFailures >= MAX_CONSECUTIVE_RETRIES;
      return {
        success: false,
        text: '',
        isGeminiPowered: false,
        errorMessage:
          data.error || 'حدث خطأ أثناء معالجة الطلب عبر Gemini. يرجى المحاولة مرة أخرى.',
        canRetry: !reachedRetryLimit,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      this.consecutiveFailures += 1;
      const reachedRetryLimit = this.consecutiveFailures >= MAX_CONSECUTIVE_RETRIES;

      return {
        success: false,
        text: '',
        isGeminiPowered: false,
        errorMessage: reachedRetryLimit
          ? 'تعذر الوصول لخدمة المساعد وتم استنفاد محاولات إعادة الاتصال. كتابك وملاحظاتك تعمل بشكل طبيعي.'
          : 'تعذر الاتصال بخدمة المساعد. يرجى التأكد من الاتصال وإعادة المحاولة.',
        canRetry: !reachedRetryLimit,
      };
    }
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
