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
        language = 'ar',
        targetLanguage = 'ar',
        hintIndex = 1,
        requestSolution = false,
      } = req.body;

      const isEnglish = language === 'en';

      // Check if Gemini is configured on server
      if (!ai) {
        return res.status(200).json({
          success: false,
          isGeminiReady: false,
          message: isEnglish
            ? 'Gemini API key is not configured on the server; using local educational response.'
            : 'مفتاح خدمة Gemini غير متوفر على الخادم، سيتم استخدام الرد التجريبي المحلي.',
        });
      }

      // Configure specific pedagogical instructions per tool
      let toolInstruction = '';
      switch (tool) {
        case 'simplify':
          toolInstruction = isEnglish
            ? 'Task: Simplify this selected textbook section. Rewrite it in clear, direct, student-friendly English focusing on the core meaning, and include a simple real-world example.'
            : 'المطلوب: بسّط هذا الجزء المحدد من الكتاب المدرسي. أعد صياغته بلغة عربية فصحى سهلة ومباشرة تركز على المعنى الأساسي، مع ضرب مثال واقعي مبسّط.';
          break;
        case 'stepByStep':
        case 'explain':
          toolInstruction = isEnglish
            ? 'Task: Explain the selected concept step-by-step in clear numbered points (1, 2, 3) that are easy to follow and logically connected.'
            : 'المطلوب: اشرح الفكرة المحددة خطوة بخطوة في نقاط متسلسلة (١، ٢، ٣) يسهل تتبعها وفهم ترابطها المنطقي.';
          break;
        case 'translate': {
          if (isEnglish) {
            const targetLangLabel =
              targetLanguage === 'ar' ? 'Arabic (اللغة العربية)' : 'English';
            toolInstruction = `Task: Automatically detect the language of the selected text or image region and translate it accurately into ${targetLangLabel} (if it is already in English, provide its clear Arabic translation AND explain the key terms in English).
Follow this exact structure:
### Translation
(Provide the complete, accurate translation of the selected content).

### Key Terms & Vocabulary
(List the most important scientific or academic terms in the selection with their exact meanings and translations).`;
          } else {
            const targetLangLabel =
              targetLanguage === 'ar' || !targetLanguage ? 'اللغة العربية' : targetLanguage;
            toolInstruction =
              `المطلوب: تعرّف تلقائياً على اللغة المكتوب بها النص أو المحتوى الموجود في الجزء المحدد بالمؤشر (سواء من النص المستخرج أو من الصورة المرفقة)، وترجمه بدقة وأمانة علمية إلى ${targetLangLabel}.
التزم بالتنسيق الواضح التالي:
### الترجمة إلى ${targetLangLabel}
(قدّم الترجمة الكاملة والدقيقة والواضحة للمحتوى المحدد بلغة عربية فصحى سلسة تحافظ على المعنى العلمي والتربوي).

### المصطلحات والكلمات المفتاحية
(استخرج أهم المصطلحات أو المفردات الواردة في التحديد مع مقابلها ومعناها الدقيق في ${targetLangLabel}؛ وإذا كان النص الأصلي باللغة العربية، فاشرح معاني مفرداته ومصطلحاته العلمية بأسلوب معجمي مبسّط للطالب).`;
          }
          break;
        }
        case 'hint':
          if (requestSolution) {
            toolInstruction = isEnglish
              ? 'Task: Provide the direct, complete final solution to this selected problem or question with a clear explanation of the final result.'
              : 'المطلوب: اعرض الحل النهائي المباشر والواضح لهذه المسألة أو الفقرة المحددة مع شرح النتيجة النهائية.';
          } else {
            toolInstruction = isEnglish
              ? `Task: Give the student ONE guided hint only (Hint #${hintIndex}) that helps them reason one step forward.
Critical rules:
- Provide only ONE concise hint.
- Do NOT reveal the final answer or full solution.
- If the problem is completely unreadable, reply with:
"Could not read the problem clearly. Select a larger area and try again."`
              : `المطلوب: أعطِ الطالب في المرحلة المتوسطة تلميحاً واحداً فقط (التلميح رقم ${hintIndex}) موجهاً ومبسّطاً يساعده على الاستدلال والتفكير خطوة للأمام.
تنبيهات حاسمة:
- اعرض تلميحاً واحداً فقط.
- لا تذكر الحل النهائي أو الإجابة إطلاقاً.
- إذا كانت المسألة أو المعادلة غير واضحة تماماً أو مقطوعة، أجب بالضبط بالنص التالي دون زيادة:
«لم أتمكن من قراءة المسألة بوضوح. حدد منطقة أكبر وحاول مرة أخرى.»`;
          }
          break;
        case 'quiz':
          toolInstruction = isEnglish
            ? 'Task: Create ONE short multiple-choice practice question (with 3 to 4 options) based strictly on this selected part to test comprehension, and state the correct answer with a brief explanation on a separate line.'
            : 'المطلوب: اطرح سؤالاً تدريبياً قصيراً واحداً من نوع الاختيار من متعدد مبنياً حصراً على هذا الجزء المحدد لاختبار الفهم، مع وضع 3 إلى 4 خيارات وتوضيح الإجابة الصحيحة مع تعليل موجز في سطر منفصل.';
          break;
        case 'analyze':
        case 'analyzeProblem':
          toolInstruction = isEnglish
            ? `Task: Provide a complete, structured analysis of the selected math, science, or curriculum problem/question/exercise on the page (using the extracted text, attached image, nearby text, and lesson context) in the EXACT 7 ordered sections below with these exact English headings:
### Given
(Extract all given values, numbers, facts, equations, or statements from the selected problem/text/image).

### Required
(Clearly state what the problem, equation, or question is asking to find or explain).

### Concept or Formula
(State the relevant mathematical formula, scientific law, or curriculum principle, preserving original symbols).

### First Hint
(A smart guided hint to help the student start solving step-by-step).

### Solution Steps
(Break down the solution and analysis into clear numbered steps: 1, 2, 3).

### Final Solution
(The complete, accurate final answer or conclusion to the problem).

### Confidence
(A percentage such as: 98% or 95%).

Critical rules:
1. Preserve all mathematical symbols, variables, and equations accurately.
2. Always populate all 7 sections above in English using the selected text, image crop, nearby text, and lesson context; never leave any section empty.`
            : `المطلوب: تحليل دقيق وشامل للمسألة أو السؤال أو التمرين أو المفهوم العلمي/الرياضي المحدد في الصفحة (أو في الصورة المرفقة وسياق الدرس) بالترتيب الصارم التالي مع ذكر العناوين السبعة التالية بالضبط:
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
          toolInstruction = isEnglish
            ? `Task: Provide a thorough analysis of the selected visual element (image, map, table, scientific diagram, or experiment) in the EXACT 6 ordered sections below with these exact English headings:

### What Appears in the Element?
(Describe what appears in the element, clearly distinguishing between [Stated or visible on page] and [Inferred from element]).

### Important Parts
(Explain the key parts, labels, symbols, colors, headings, and arrows).

### Relation to Nearby Text
(Connect the visual element to the surrounding text and lesson topic on the page).

### Simplified Explanation for Student
(A clear, accessible explanation in English suitable for a middle/high school student).

### Quick Comprehension Question
(One short practice question to test the student's understanding of the visual element, with the correct answer).

### Confidence
(A percentage such as: 95% or 90%).

Rules:
1. Always distinguish between "[Stated or visible on page]" and "[Inferred from element]".
2. If the element is a mathematical equation or calculation problem, explicitly suggest using the "Analyze Problem" tool.`
            : `المطلوب: تحليل دقيق وشامل للعنصر البصري المحدد (سواء كان صورة، خريطة، جدولاً، رسماً علمياً، أو تجربة) بالترتيب الصارم التالي مع ذكر العناوين التالية بالضبط:

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
          toolInstruction = isEnglish
            ? `Task: Act as an expert teacher preparing a comprehensive, structured study and review summary for the selected lesson(s) in English.
Cover all concepts, definitions, formulas, steps, comparisons, examples, and review questions with model answers.
Output ONLY valid JSON matching the requested schema.`
            : `المطلوب: تصرف كمعلم خبير وطالب متفوق يجهز ورقة مراجعة وتلخيص شاملة، غنية، ومنظمة للدرس أو الدروس المحددة.
خذ حريتك الكاملة في التلخيص بأفضل صورة ممكنة وأظهر جميع المحتوى العلمي المتاح في الدروس المحددة دون اختزال مخل أو حصر الملخص في نقاط قليلة، بحيث يغطي الملخص كافة الأفكار، التعريفات، القوانين، الخطوات، المقارنات، الأمثلة، ونقاط المراجعة وأسئلة المراجعة مع إجاباتها النموذجية.
أخرج النتيجة حصراً بصيغة JSON صالحة ومطابقة للبنية المطلوبة في النص.`;
          break;
        default:
          toolInstruction = isEnglish
            ? 'Task: Explain this selected section in clear, well-organized English.'
            : 'المطلوب: اشرح هذا الجزء المحدد بعربية فصحى مبسطة ومنظمة.';
      }

      const isLessonSummary = tool === 'lessonSummary';

      // Strict instructions tailored to requested application language
      const systemInstruction = isLessonSummary
        ? isEnglish
          ? `You are "Noon Assistant", an intelligent educational tutor inside the Noon Textbook Platform.
Your task is to prepare a comprehensive, complete study summary in English for the selected lesson(s) from "${bookTitle || 'Textbook'}", outputting 100% valid JSON.`
          : `أنت "مساعد نون" التعليمي الذكي داخل منصة نون للكتب المدرسية.
مهمتك إعداد ملخص دراسي شامل ومتكامل ووافي للدروس المحددة من كتاب "${bookTitle || 'الكتاب المدرسي'}"، يغطي جميع المعلومات والمفاهيم والقوانين والتعريفات والخطوات والأمثلة المتاحة في المحتوى دون اختصار يخل بالمعنى، مع إخراج النتيجة بصيغة JSON صحيحة 100%.`
        : isEnglish
        ? `You are "Noon Assistant", an intelligent educational tutor inside the Noon Textbook Platform.
You are helping a student reading page ${pageNumber || ''} of "${bookTitle || 'Textbook'}"${lessonTitle ? ` - Lesson: "${lessonTitle}"` : ''}.

Strict Rules:
1. Analyze the selected region of the page/image/text and explain it clearly in ENGLISH without going off-topic.
2. When an image crop of the textbook page is attached, ALWAYS inspect the image visually (via OCR and mathematical/scientific vision) to read all Arabic/English text, equations, set notation ({ }, ∈, ⊂, ∪, ∩), arrow diagrams, tables, and figures accurately—especially if the PDF text layer is partial or from a scanned/complex-font textbook.
3. Even if the textbook text or image is in Arabic, you MUST write your entire explanation, headings, and results in clear, accurate ENGLISH because the application language is set to English.
4. Preserve all mathematical symbols, variables, and equations accurately.
5. When "hint" is selected: provide only ONE hint and do not reveal the final answer.
6. When "analyze" / "analyzeProblem" is selected: ALWAYS provide the analysis in the 7 required English sections (### Given, ### Required, ### Concept or Formula, ### First Hint, ### Solution Steps, ### Final Solution, ### Confidence).`
        : `أنت "مساعد نون" التعليمي الذكي داخل منصة نون للكتب المدرسية.
أنت تساعد طالباً في ${studentLevel} يقرأ في الصفحة ${pageNumber || ''} من: "${bookTitle || 'الكتاب المدرسي'}"${lessonTitle ? ` - درس: "${lessonTitle}"` : ''}.

القواعد الصارمة:
1. حلل الجزء المحدد من الصفحة المرفقة أو النص، واشرحه بوضوح ودقة علمية دون الخروج عن موضوعه.
2. عند وجود صورة مرفقة للجزء المحدد من صفحة الكتاب، اعتمد على القراءة البصرية المباشرة للصورة (OCR + قراءة الرموز الرياضية، المجموعات { }، الانتماء ∈، الأزواج المرتبة، المخططات السهمية والبيانية، الكسور، المعادلات، الجداول، والخرائط) باعتبارها المرجع البصري الأدق، وادمجها مع النص المستخرج وسياق الدرس؛ وتجاهل أي تشوه نصي ناتج عن خطوط PDF القديمة.
3. حافظ تماماً على المعنى التعليمي الصحيح للكتاب المدرسي ورموز المسائل وترتيبها ولا تحرّفها.
4. لا تخترع رقم صفحة ولا تذكر مراجع أو أرقاماً غير واردة في الصفحة أو الدرس.
5. استخدم اللغة العربية الفصحى المبسطة الواضحة والسلسة المناسبة لمستوى الطالب.
6. عند اختيار "تلميح" (hint): اعرض تلميحاً واحداً فقط ولا تعطِ الحل أو الإجابة النهائية إطلاقاً.
7. ميّز دائماً في الشرح بين «مذكور أو ظاهر في الصفحة» و «استنتاج من العنصر».
8. عند اختيار "تحليل المسألة" (analyze / analyzeProblem): قدم التحليل دائماً في الأقسام السبعة المطلوبة (### المعطيات، ### المطلوب، ### الفكرة أو القانون المناسب، ### تلميح أول، ### خطوات الحل، ### الحل النهائي، ### درجة الثقة) بالاعتماد على القراءة البصرية للصورة المرفقة والنص المستخرج وسياق الدرس.`;

      const safeText =
        typeof selectedText === 'string' && selectedText.trim().length > 0
          ? selectedText.trim()
          : isEnglish
          ? 'Read the selected region directly from the attached textbook page image crop and lesson context.'
          : 'اقرأ المحتوى أو المسألة مباشرة من الصورة المرفقة للجزء المحدد من صفحة الكتاب ومن سياق الدرس.';

      const userPrompt = isLessonSummary
        ? `${safeText}\n\n${toolInstruction}`
        : isEnglish
        ? `Selected Page Region Data:
- Page Number: ${pageNumber || 'Unspecified'}
- Element Type: ${elementType || selectionType || 'Visual/Text Element'}
- Book / Subject Title: ${bookTitle || 'Textbook'}
${lessonTitle ? `- Lesson Title: ${lessonTitle}` : ''}
${lessonContext ? `- Approved Curriculum Context & Facts for this Lesson:\n"""\n${lessonContext}\n"""` : ''}
${nearbyText ? `- Nearby Text Around Selection:\n"""\n${nearbyText}\n"""` : ''}
- Required Output Language: English (Write the entire response and headings in English)
- Extracted Text / Visual Reference Note:
"""
${safeText}
"""

${toolInstruction}
Provide the response directly in clear, well-structured English.`
        : `بيانات الجزء المحدد من الصفحة:
- رقم الصفحة: ${pageNumber || 'غير محدد'}
- نوع العنصر: ${elementType || selectionType || 'عنصر بصري/نصي'}
- عنوان المادة / الكتاب: ${bookTitle || 'كتاب مدرسي'}
${lessonTitle ? `- عنوان الدرس: ${lessonTitle}` : ''}
${lessonContext ? `- سياق وحقائق المنهج المعتمدة للدرس (لحل الأسئلة والتقويم بدقة وفق المنهج):\n"""\n${lessonContext}\n"""` : ''}
${nearbyText ? `- النص القريب من المنطقة:\n"""\n${nearbyText}\n"""` : ''}
- لغة الطالب: العربية
- المستوى: ${studentLevel}
- النص المستخرج / ملاحظة القراءة البصرية:
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
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-3.1-flash-lite-preview',
        'gemini-flash-latest',
        'gemini-2.5-pro',
        'gemini-3.1-pro-preview',
      ];
      const availableModels = candidateModels.filter((m) => {
        const cooldownUntil = exhaustedModels.get(m);
        return !cooldownUntil || now >= cooldownUntil;
      });
      const modelsToTry =
        availableModels.length > 0 ? availableModels : candidateModels.slice(0, 3);

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
            // Cooldown this model for 45 seconds so transient per-minute rate limits recover quickly
            exhaustedModels.set(modelName, Date.now() + 45 * 1000);
          }
        }
      }

      if (!responseText) {
        return res.status(200).json({
          success: false,
          isGeminiReady: false,
          isQuotaExceeded: true,
          message: isEnglish
            ? 'AI Assistant is temporarily rate-limited; using local curriculum analysis.'
            : 'خدمة المساعد الذكي غير متصلة حاليًا بسبب تجاوز حد الطلبات المؤقت، سيتم استخدام الشرح التعليمي المحلي.',
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
