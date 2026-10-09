import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client securely on server with telemetry
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parser for JSON
  app.use(express.json({ limit: '5mb' }));

  // Status & Health Endpoint (Never returns API key)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiAvailable: Boolean(ai),
    });
  });

  // Secure Gemini Explanation Endpoint
  app.post('/api/assistant/explain', async (req: Request, res: Response) => {
    try {
      const {
        tool,
        selectedText,
        selectedImage,
        nearbyText,
        pageNumber,
        selectionType,
        elementType,
        bookTitle,
        lessonTitle,
        lessonContext,
        studentLevel = 'المرحلة المتوسطة',
        hintIndex = 1,
        requestSolution = false,
      } = req.body;

      // Check if Gemini is configured on server
      if (!ai) {
        return res.status(200).json({
          success: false,
          isGeminiReady: false,
          message: 'مفتاح خدمة Gemini غير متوفر على الخادم، سيتم استخدام الرد التجريبي المحلي.',
        });
      }

      // Configure specific pedagogical instructions per tool
      let toolInstruction = '';
      switch (tool) {
        case 'simplify':
          toolInstruction =
            'المطلوب: بسّط هذا الجزء المحدد من الكتاب المدرسي. أعد صياغته بلغة عربية فصحى سهلة ومباشرة تركز على المعنى الأساسي، مع ضرب مثال واقعي مبسّط.';
          break;
        case 'stepByStep':
        case 'explain':
          toolInstruction =
            'المطلوب: اشرح الفكرة المحددة خطوة بخطوة في نقاط متسلسلة (١، ٢، ٣) يسهل تتبعها وفهم ترابطها المنطقي.';
          break;
        case 'hint':
          if (requestSolution) {
            toolInstruction =
              'المطلوب: اعرض الحل النهائي المباشر والواضح لهذه المسألة أو الفقرة المحددة مع شرح النتيجة النهائية.';
          } else {
            toolInstruction =
              `المطلوب: أعطِ الطالب في المرحلة المتوسطة تلميحاً واحداً فقط (التلميح رقم ${hintIndex}) موجهاً ومبسّطاً يساعده على الاستدلال والتفكير خطوة للأمام.
تنبيهات حاسمة:
- اعرض تلميحاً واحداً فقط.
- لا تذكر الحل النهائي أو الإجابة إطلاقاً.
- إذا كانت المسألة أو المعادلة غير واضحة تماماً أو مقطوعة، أجب بالضبط بالنص التالي دون زيادة:
«لم أتمكن من قراءة المسألة بوضوح. حدد منطقة أكبر وحاول مرة أخرى.»`;
          }
          break;
        case 'quiz':
          toolInstruction =
            'المطلوب: اطرح سؤالاً تدريبياً قصيراً واحداً من نوع الاختيار من متعدد مبنياً حصراً على هذا الجزء المحدد لاختبار الفهم، مع وضع 3 إلى 4 خيارات وتوضيح الإجابة الصحيحة مع تعليل موجز في سطر منفصل.';
          break;
        case 'analyze':
        case 'analyzeProblem':
          toolInstruction =
            `المطلوب: تحليل دقيق وشامل للمسألة الرياضية المحددة في الصفحة بالترتيب الصارم التالي مع ذكر العناوين التالية بالضبط:
### المعطيات
(استخراج كافة القيم والأرقام والمعلومات المعطاة في المسألة دون اختراع).

### المطلوب
(تحديد ما تطلبه المسألة بدقة).

### الفكرة أو القانون المناسب
(ذكر القاعدة أو القانون الرياضي المناسب للتطبيق مع الحفاظ على الرموز الأصلية).

### تلميح أول
(توجيه استدلالي ذكي لبدء التفكير دون كشف الحل).

### خطوات الحل
(تفكيك الحل في خطوات رقمية متسلسلة ١، ٢، ٣).

### الحل النهائي
(القيمة والوحدة والناتج النهائي بدقة).

### درجة الثقة
(مثلاً: 95% أو 90%).

تنبيهات حاسمة:
1. حافظ تماماً على رموز المسألة وترتيبها دون أي تغيير.
2. لا تخترع بيانات أو أرقاماً غير موجودة في الجزء المحدد.
3. إذا كانت المسألة أو المعادلة غير واضحة تماماً أو مقطوعة، أجب فقط بالنص التالي بالضبط دون أي مقدمة أو خاتمة:
«لم أتمكن من قراءة المسألة بوضوح. حدد منطقة أكبر وحاول مرة أخرى.»`;
          break;
        case 'explainFigure':
        case 'explainImage':
          toolInstruction =
            `المطلوب: تحليل دقيق وشامل للعنصر البصري المحدد (سواء كان صورة، خريطة، جدولاً، رسماً علمياً، أو تجربة) بالترتيب الصارم التالي مع ذكر العناوين التالية بالضبط:

### ماذا يظهر في العنصر؟
(بيان ما يظهر في العنصر بدقة مع التمييز الواضح بين ما هو [مذكور أو ظاهر في الصفحة] وما هو [استنتاج من العنصر]).

### ما الأجزاء المهمة؟
(توضيح الأجزاء الرئيسية والبيانات أو الرموز والألوان والعناوين ومسميات الأسهم).

### ما علاقته بالنص القريب؟
(ربط العنصر البصري بالمحتوى والنص القريب منه في الصفحة).

### شرح مبسط للطالب
(شرح سلس بلغة عربية فصحى تناسب طالب المرحلة المتوسطة).

### سؤال قصير لاختبار الفهم
(سؤال تدريبي قصير واحد لاختبار استيعاب الطالب للعنصر مع توضيح الإجابة الصحيحة).

### درجة الثقة
(نسبة مئوية مثل: 95% أو 90%).

قواعد التعامل الصارمة مع الأنواع المختلفة:
1. الخريطة: اشرح الرموز والألوان والمناطق الظاهرة فقط دون تخمين.
2. الجدول: اشرح العناوين والبيانات المقروءة والنتيجة العامة المستخلصة.
3. الرسم العلمي: اشرح الأجزاء والعلاقة الفيزيائية أو الحيوية بينها.
4. صورة التجربة: اشرح الملاحظات الظاهرة دون اختراع نتائج لم تحدث.
5. إذا كان العنصر معادلة رياضية أو مسألة حسابية: اقترح صراحة استخدام أداة «تحليل المسألة».
6. ميّز دائماً بين: «مذكور أو ظاهر في الصفحة» و «استنتاج من العنصر».
7. إذا كانت الصورة غير واضحة بما يكفي أو مقطوعة، أجب فقط بالنص التالي بالضبط دون أي إضافة:
«الصورة غير واضحة بما يكفي للتحليل. حدد منطقة أوضح وحاول مرة أخرى.»`;
          break;
        default:
          toolInstruction =
            'المطلوب: اشرح هذا الجزء المحدد بعربية فصحى مبسطة ومنظمة.';
      }

      // Strict instructions: explain only selected part, don't change meaning, don't invent pages/sources, simplified Arabic
      const systemInstruction = `أنت "مساعد نون" التعليمي الذكي داخل منصة نون للكتب المدرسية.
أنت تساعد طالباً في ${studentLevel} يقرأ في الصفحة ${pageNumber || ''} من: "${bookTitle || 'الكتاب المدرسي'}"${lessonTitle ? ` - درس: "${lessonTitle}"` : ''}.

القواعد الصارمة:
1. حلل الجزء المحدد من الصفحة المرفقة أو النص، واشرحه بوضوح دون الخروج عن موضوعه.
2. حافظ تماماً على المعنى التعليمي الصحيح للكتاب المدرسي ورموز المسائل وترتيبها ولا تحرّفها.
3. لا تخترع رقم صفحة ولا تذكر مراجع أو أرقاماً غير واردة في الصفحة.
4. استخدم اللغة العربية الفصحى المبسطة الواضحة والسلسة المناسبة لمستوى الطالب (المرحلة المتوسطة).
5. عند اختيار "تلميح" (hint): اعرض تلميحاً واحداً فقط ولا تعطِ الحل أو الإجابة النهائية إطلاقاً.
6. ميّز دائماً في الشرح بين «مذكور أو ظاهر في الصفحة» و «استنتاج من العنصر».
7. إذا كانت الصورة أو الرسم أو الجدول غير واضح بما يكفي، اكتب النص المطلوب فقط: «الصورة غير واضحة بما يكفي للتحليل. حدد منطقة أوضح وحاول مرة أخرى.».
8. إذا كانت المسألة أو المعادلة غير واضحة، اكتب النص المطلوب فقط: «لم أتمكن من قراءة المسألة بوضوح. حدد منطقة أكبر وحاول مرة أخرى.».`;

      const safeText =
        typeof selectedText === 'string' && selectedText.trim().length > 0
          ? selectedText.trim()
          : 'الجزء المحدد في الصورة المرفقة من صفحة الكتاب';

      const userPrompt = `بيانات الجزء المحدد من الصفحة:
- رقم الصفحة: ${pageNumber || 'غير محدد'}
- نوع العنصر: ${elementType || selectionType || 'عنصر بصري'}
- عنوان المادة / الكتاب: ${bookTitle || 'كتاب مدرسي'}
${lessonTitle ? `- عنوان الدرس: ${lessonTitle}` : ''}
${lessonContext ? `- سياق وحقائق المنهج المعتمدة للدرس (لحل الأسئلة والتقويم بدقة وفق المنهج):\n"""\n${lessonContext}\n"""` : ''}
${nearbyText ? `- النص القريب من المنطقة:\n"""\n${nearbyText}\n"""` : ''}
- لغة الطالب: العربية
- المستوى: ${studentLevel}
- محتوى الجزء المحدد:
"""
${safeText}
"""

${toolInstruction}
قدم الإجابة مباشرة باللغة العربية الفصحى وبتنسيق واضح ومريح للقراءة.`;

      // Build multimodal contents payload if image crop is available
      const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (
        selectedImage &&
        typeof selectedImage === 'string' &&
        selectedImage.startsWith('data:image') &&
        selectedImage.includes('base64,')
      ) {
        const mimeType = selectedImage.split(';')[0].replace('data:', '') || 'image/jpeg';
        const base64Data = selectedImage.split('base64,')[1];
        if (base64Data) {
          contentParts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }
      contentParts.push({ text: userPrompt });

      // Robust model invocation: try gemini-3.1-flash-lite, fallback to gemini-3.8-flash on error
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      let responseText = '';
      let lastErr: unknown = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentParts,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          responseText = response.text?.trim() || '';
          if (responseText) {
            break;
          }
        } catch (mErr: unknown) {
          lastErr = mErr;
          console.warn(`Model ${modelName} returned error, attempting fallback:`, (mErr as Error)?.message || mErr);
        }
      }

      if (!responseText) {
        throw lastErr || new Error('تعذر استخراج رد من النموذج');
      }

      return res.status(200).json({
        success: true,
        isGeminiReady: true,
        text: responseText,
      });
    } catch (err: unknown) {
      // Do NOT log student text or content for privacy
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Gemini explanation request failed:', errorMessage);

      return res.status(500).json({
        success: false,
        isGeminiReady: true,
        error: 'حدث خطأ أثناء معالجة الطلب عبر Gemini. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
        errorDetail: errorMessage,
      });
    }
  });

  // Development vs Production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Noon Learning Server running on port ${PORT}`);
  });
}

startServer();
