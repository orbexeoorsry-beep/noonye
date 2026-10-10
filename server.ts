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

// Track quota-exhausted models in memory with expiry timestamp
const exhaustedModels = new Map<string, number>();

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
        targetLanguage = 'ar',
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
        case 'translate': {
          const targetLangLabel =
            targetLanguage === 'ar' || !targetLanguage ? 'اللغة العربية' : targetLanguage;
          toolInstruction =
            `المطلوب: تعرّف تلقائياً على اللغة المكتوب بها النص أو المحتوى الموجود في الجزء المحدد بالمؤشر (سواء من النص المستخرج أو من الصورة المرفقة)، وترجمه بدقة وأمانة علمية إلى ${targetLangLabel}.
التزم بالتنسيق الواضح التالي:
### الترجمة إلى ${targetLangLabel}
(قدّم الترجمة الكاملة والدقيقة والواضحة للمحتوى المحدد بلغة عربية فصحى سلسة تحافظ على المعنى العلمي والتربوي).

### المصطلحات والكلمات المفتاحية
(استخرج أهم المصطلحات أو المفردات الواردة في التحديد مع مقابلها ومعناها الدقيق في ${targetLangLabel}؛ وإذا كان النص الأصلي باللغة العربية، فاشرح معاني مفرداته ومصطلحاته العلمية بأسلوب معجمي مبسّط للطالب).`;
          break;
        }
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
            `المطلوب: تحليل دقيق وشامل للمسألة أو السؤال أو التمرين أو المفهوم العلمي/الرياضي المحدد في الصفحة (أو في الصورة المرفقة وسياق الدرس) بالترتيب الصارم التالي مع ذكر العناوين السبعة التالية بالضبط:
### المعطيات
(استخراج كافة القيم والأرقام والمعلومات والحقائق المعطاة في المسألة أو النص المحدد أو الصورة المرفقة).

### المطلوب
(تحديد ما تطلبه المسألة أو الهدف من السؤال/المعادلة/التمرين بدقة).

### الفكرة أو القانون المناسب
(ذكر القاعدة العلمية أو القانون الرياضي أو المبدأ المناسب للتطبيق مع الحفاظ على الرموز الأصلية).

### تلميح أول
(توجيه استدلالي ذكي يساعد الطالب على بدء التفكير في الحل خطوة بخطوة).

### خطوات الحل
(تفكيك الحل والتحليل في خطوات رقمية متسلسلة وواضحة ١، ٢، ٣).

### الحل النهائي
(النتيجة النهائية الكاملة والواضحة للمسألة أو السؤال بدقة).

### درجة الثقة
(نسبة مئوية مثل: 98% أو 95%).

تنبيهات حاسمة:
1. حافظ تماماً على رموز المسألة أو المعادلة وترتيبها دون أي تغيير.
2. اعتمد على النص المستخرج والصورة المرفقة والنص القريب وسياق الدرس لتقديم تحليل كامل ومفيد دائماً في الأقسام السبعة أعلاه، ولا تترك أي قسم فارغاً.`;
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
        case 'lessonSummary':
          toolInstruction =
            `المطلوب: تصرف كمعلم خبير وطالب متفوق يجهز ورقة مراجعة وتلخيص شاملة، غنية، ومنظمة للدرس أو الدروس المحددة.
خذ حريتك الكاملة في التلخيص بأفضل صورة ممكنة وأظهر جميع المحتوى العلمي المتاح في الدروس المحددة دون اختزال مخل أو حصر الملخص في نقاط قليلة، بحيث يغطي الملخص كافة الأفكار، التعريفات، القوانين، الخطوات، المقارنات، الأمثلة، ونقاط المراجعة وأسئلة المراجعة مع إجاباتها النموذجية.
أخرج النتيجة حصراً بصيغة JSON صالحة ومطابقة للبنية المطلوبة في النص.`;
          break;
        default:
          toolInstruction =
            'المطلوب: اشرح هذا الجزء المحدد بعربية فصحى مبسطة ومنظمة.';
      }

      const isLessonSummary = tool === 'lessonSummary';

      // Strict instructions: explain only selected part, don't change meaning, don't invent pages/sources, simplified Arabic
      const systemInstruction = isLessonSummary
        ? `أنت "مساعد نون" التعليمي الذكي داخل منصة نون للكتب المدرسية.
مهمتك إعداد ملخص دراسي شامل ومتكامل ووافي للدروس المحددة من كتاب "${bookTitle || 'الكتاب المدرسي'}"، يغطي جميع المعلومات والمفاهيم والقوانين والتعريفات والخطوات والأمثلة المتاحة في المحتوى دون اختصار يخل بالمعنى، مع إخراج النتيجة بصيغة JSON صحيحة 100%.`
        : `أنت "مساعد نون" التعليمي الذكي داخل منصة نون للكتب المدرسية.
أنت تساعد طالباً في ${studentLevel} يقرأ في الصفحة ${pageNumber || ''} من: "${bookTitle || 'الكتاب المدرسي'}"${lessonTitle ? ` - درس: "${lessonTitle}"` : ''}.

القواعد الصارمة:
1. حلل الجزء المحدد من الصفحة المرفقة أو النص، واشرحه بوضوح دون الخروج عن موضوعه.
2. حافظ تماماً على المعنى التعليمي الصحيح للكتاب المدرسي ورموز المسائل وترتيبها ولا تحرّفها.
3. لا تخترع رقم صفحة ولا تذكر مراجع أو أرقاماً غير واردة في الصفحة.
4. استخدم اللغة العربية الفصحى المبسطة الواضحة والسلسة المناسبة لمستوى الطالب (المرحلة المتوسطة).
5. عند اختيار "تلميح" (hint): اعرض تلميحاً واحداً فقط ولا تعطِ الحل أو الإجابة النهائية إطلاقاً.
6. ميّز دائماً في الشرح بين «مذكور أو ظاهر في الصفحة» و «استنتاج من العنصر».
7. عند اختيار "تحليل المسألة" (analyze / analyzeProblem): قدم التحليل دائماً في الأقسام السبعة المطلوبة (المعطيات، المطلوب، الفكرة أو القانون المناسب، تلميح أول، خطوات الحل، الحل النهائي، درجة الثقة) بالاعتماد على النص والصورة وسياق الدرس.`;

      const safeText =
        typeof selectedText === 'string' && selectedText.trim().length > 0
          ? selectedText.trim()
          : 'الجزء المحدد في الصورة المرفقة من صفحة الكتاب';

      const userPrompt = isLessonSummary
        ? `${safeText}\n\n${toolInstruction}`
        : `بيانات الجزء المحدد من الصفحة:
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

      // Track models that recently hit 429 quota limits to avoid repeated failed calls
      const now = Date.now();
      const candidateModels = [
        'gemini-3.1-flash-lite-preview',
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-3-flash-preview',
      ];
      const availableModels = candidateModels.filter((m) => {
        const cooldownUntil = exhaustedModels.get(m);
        return !cooldownUntil || now >= cooldownUntil;
      });
      const modelsToTry =
        availableModels.length > 0 ? availableModels : candidateModels.slice(0, 2);

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
              ...(isLessonSummary ? { responseMimeType: 'application/json' } : {}),
            },
          });
          responseText = response.text?.trim() || '';
          if (responseText) {
            break;
          }
        } catch (mErr: unknown) {
          lastErr = mErr;
          const errStr = mErr instanceof Error ? mErr.message : String(mErr);
          if (
            errStr.includes('429') ||
            errStr.includes('RESOURCE_EXHAUSTED') ||
            errStr.toLowerCase().includes('quota')
          ) {
            // Cooldown this model for 15 minutes so subsequent requests skip it immediately
            exhaustedModels.set(modelName, Date.now() + 15 * 60 * 1000);
          }
        }
      }

      if (!responseText) {
        return res.status(200).json({
          success: false,
          isGeminiReady: false,
          isQuotaExceeded: true,
          message:
            'خدمة المساعد الذكي غير متصلة حاليًا بسبب تجاوز حد الطلبات المؤقت، سيتم استخدام الشرح التعليمي المحلي.',
          errorDetail: lastErr instanceof Error ? lastErr.message : String(lastErr || ''),
        });
      }

      return res.status(200).json({
        success: true,
        isGeminiReady: true,
        text: responseText,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      return res.status(200).json({
        success: false,
        isGeminiReady: false,
        message: 'خدمة المساعد الذكي غير متصلة حاليًا، سيتم استخدام الشرح التعليمي المحلي.',
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
