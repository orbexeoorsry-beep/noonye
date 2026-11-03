import React from 'react';
import { InteractiveElement } from '../../types';
import { Sparkles, Layers, FileText, Image as ImageIcon, Calculator, Table } from 'lucide-react';

interface OverlayHotspot {
  id: string;
  type: 'paragraph' | 'figure' | 'equation' | 'table' | 'exercise';
  title: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  heightPct: number;
  element: InteractiveElement;
}

interface PdfInteractionOverlayProps {
  pageNumber: number;
  width: number;
  height: number;
  selectedElementId: string | null;
  onSelectElement: (element: InteractiveElement) => void;
  isEnabled: boolean;
}

export const PdfInteractionOverlay: React.FC<PdfInteractionOverlayProps> = ({
  pageNumber,
  width,
  height,
  selectedElementId,
  onSelectElement,
  isEnabled,
}) => {
  if (!isEnabled || width === 0 || height === 0) return null;

  // Curated hotspots corresponding to the genuine educational layout in the PDF
  const hotspotsForPage: OverlayHotspot[] = React.useMemo(() => {
    if (pageNumber === 1) {
      return [
        {
          id: 'elem-bio-p1',
          type: 'paragraph',
          title: 'الفقرة: النفاذية الاختيارية والنقل الخلوي',
          topPct: 15,
          leftPct: 6,
          widthPct: 88,
          heightPct: 11,
          element: {
            id: 'elem-bio-p1',
            type: 'paragraph',
            title: 'النفاذية الاختيارية والنقل الخلوي',
            badge: 'فقرة علمية',
            content: 'يمتاز الغشاء البلازمي بخاصية حيوية تُعرف بالنفاذية الاختيارية، حيث يسمح بمرور بعض المواد مثل جزيئات الماء والأكسجين بسهولة عبر طبقتي الدهون المفسفرة، بينما يتحكم بمرور الجزيئات الكبيرة كالجلوكوز.',
            mockAiAnalysis: {
              simplified: 'الغشاء البلازمي كبوابة ذكية: يسمح بعبور المواد البسيطة بدون عناء، ويخضع المواد الكبيرة لقنوات فحص وبروتينات ناقلة متخصصة.',
              stepByStep: [
                '1. طبقة الفوسفوليبيد تمنع عبور المواد القطبية والذائبة عشوائياً.',
                '2. الغازات الصغيرة (الأكسجين) تعبر بالانتشار البسيط.',
                '3. القنوات البروتينية تنظم حركة الأيونات والجلوكوز.',
              ],
              hint: 'ركز على العلاقة بين حجم الجزيء وشحنته وقدرته على النفاذ.',
              quizQuestion: {
                question: 'ما الخاصية التي تسمح للخلية بالتحكم في المواد الداخلة والخارجة؟',
                options: ['النفاذية الاختيارية', 'الخاصية الشعرية', 'التحلل المائي', 'الضغط الجوي'],
                correctIndex: 0,
                explanation: 'النفاذية الاختيارية هي قدرة الغشاء البلازمي على فرز المواد بحسب حاجة الخلية.',
              },
              audioTranscript: 'يمتاز الغشاء البلازمي بخاصية حيوية تُعرف بالنفاذية الاختيارية...',
            },
          },
        },
        {
          id: 'elem-bio-fig1',
          type: 'figure',
          title: 'رسم توضيحي: نموذج الفسيفساء السائل للغشاء',
          topPct: 27,
          leftPct: 6,
          widthPct: 88,
          heightPct: 32,
          element: {
            id: 'elem-bio-fig1',
            type: 'figure',
            title: 'نموذج الفسيفساء السائل للغشاء البلازمي',
            badge: 'شكل توضيحي علمي',
            content: 'رسم يوضح طبقة الدهون المفسفرة المزدوجة المحبة والكارهة للماء مع البروتينات الغائرة والقنوات الناقلة ومضخات الأيونات.',
            mockAiAnalysis: {
              simplified: 'الرسم يوضح طبقتين من الدهون: الرؤوس تحب الماء فتواجه الداخل والخارج، والذيول كارهة للماء فتحتمي في المنتصف، وبروتينات أسطوانية تعمل كمعابر.',
              stepByStep: [
                '1. الرؤوس الزرقاء: قطبية محبة للماء تتلامس مع السائلين الخارجي والداخلي.',
                '2. الذيول الدهنية: غير قطبية تشكل وسطاً عازلاً غير نفاذ للماء.',
                '3. البروتين البنفسجي: يعمل كقناة ناقلة للأيونات.',
              ],
              hint: 'لاحظ موقع الرؤوس المحبة للماء بالنسبة للوسط المائي الداخلي والخارجي.',
              quizQuestion: {
                question: 'أين تتجه الذيول الكارهة للماء في الغشاء البلازمي؟',
                options: ['إلى الداخل نحو منتصف الغشاء بعيداً عن الماء', 'إلى السيتوبلازم الخارجي', 'إلى داخل النواة', 'تطفو بحرية خارج الخلية'],
                correctIndex: 0,
                explanation: 'تتجمع الذيول غير القطبية في مركز الغشاء لتجنب التلامس مع البيئة المائية.',
              },
              audioTranscript: 'يوضح الشكل نموذج الفسيفساء السائل للغشاء البلازمي مبيناً الرؤوس القطبية والذيول الدهنية.',
              figureExplanation: 'تمثيل هندسي حيوي لمكونات الغشاء الخلوي، مبيناً مواقع النواقل البروتينية ومناطق العزل الدهني.',
            },
          },
        },
        {
          id: 'elem-bio-ex1',
          type: 'exercise',
          title: 'تمرين وتطبيق: مضخة الصوديوم والبوتاسيوم واستخدام ATP',
          topPct: 62,
          leftPct: 6,
          widthPct: 88,
          heightPct: 18,
          element: {
            id: 'elem-bio-ex1',
            type: 'exercise',
            title: 'تمرين: استهلاك الطاقة في النقل النشط',
            badge: 'مسألة تدريبية',
            content: 'ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم لنقل الأيونات ضد منحدر التركيز؟',
            mockAiAnalysis: {
              simplified: 'الخلية تدفع الأيونات إلى المكان الأكثر ازدحاماً، وهذا مثل صعود تل يتطلب مجهوداً وطاقة من بطارية الخلية المسماة ATP.',
              stepByStep: [
                '1. النقل النشط يحرك الأيونات ضد منحدر التركيز.',
                '2. استهلاك رابطة فوسفاتية من جزيء ATP يحرر الطاقة اللازمة لتغيير شكل البروتين الناقل.',
                '3. يتم طرد 3 أيونات صوديوم مقابل سحب أيوني بوتاسيوم.',
              ],
              hint: 'تذكر دائماً: كلمة "نشط" تعني مباشرة وجود استهلاك لطاقة ATP.',
              quizQuestion: {
                question: 'ما هي العملة الأساسية للطاقة المستخدمة في النقل النشط؟',
                options: ['ATP', 'DNA', 'RNA', 'NaCl'],
                correctIndex: 0,
                explanation: 'جزيء ATP (أدينوسين ثلاثي الفوسفات) هو المصدر الكيميائي المباشر للطاقة في الخلية.',
              },
              audioTranscript: 'تمرين: ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم؟',
            },
          },
        },
      ];
    }

    if (pageNumber === 2) {
      return [
        {
          id: 'elem-math-eq1',
          type: 'equation',
          title: 'المعادلة: القانون العام لحل المعادلة التربيعية',
          topPct: 15,
          leftPct: 6,
          widthPct: 88,
          heightPct: 13,
          element: {
            id: 'elem-math-eq1',
            type: 'equation',
            title: 'القانون العام للمعادلة التربيعية',
            badge: 'قاعدة رياضية',
            content: 'x = [-b +/- sqrt(b^2 - 4ac)] / 2a',
            mockAiAnalysis: {
              simplified: 'صيغة قياسية لحل أي معادلة من الدرجة الثانية بمجرد استخراج المعاملات a و b والحد المطلق c.',
              stepByStep: [
                '1. كتابة المعادلة على الصورة: ax^2 + bx + c = 0.',
                '2. حساب المميز Delta = b^2 - 4ac لتحديد عدد وطبيعة الحلول.',
                '3. التعويض في القانون لإيجاد قيم x الممكنة.',
              ],
              hint: 'احسب ما تحت الجذر أولاً لتتأكد هل يوجد حل حقيقي أم لا.',
              quizQuestion: {
                question: 'إذا كان المميز (b² - 4ac) سالباً، فما نوع الجذور؟',
                options: ['لا توجد حلول حقيقية', 'حل حقيقي واحد مكرر', 'حلان حقيقيان مختلفان', 'ما لا نهاية من الحلول'],
                correctIndex: 0,
                explanation: 'الجذر التربيعي لعدد سالب غير معرف في مجموعة الأعداد الحقيقية.',
              },
              audioTranscript: 'القانون العام لحل المعادلة التربيعية: سين يساوي سالب باء زائد أو ناقص الجذر التربيعي لباء تربيع ناقص أربعة ألف جيم...',
            },
          },
        },
        {
          id: 'elem-math-fig1',
          type: 'figure',
          title: 'الرسم البياني: المنحنى القطعي المكافئ وجذور المعادلة',
          topPct: 30,
          leftPct: 6,
          widthPct: 88,
          heightPct: 30,
          element: {
            id: 'elem-math-fig1',
            type: 'figure',
            title: 'المنحنى القطعي المكافئ وجذور الدالة',
            badge: 'رسم بياني هندسي',
            content: 'منحنى الدالة التربيعية f(x) = (x-2)^2 - 1 برأس المنحنى عند (2, -1) ونقاط التقاطع مع محور السينات عند x = 1 و x = 3.',
            mockAiAnalysis: {
              simplified: 'النقاط التي يقطع فيها المنحنى الخط الأفقي (محور السينات) هي تماماً حلول المعادلة الرياضية.',
              stepByStep: [
                '1. رأس المنحنى يمثل القاع (القيمة الصغرى) عند النقطة (2, -1).',
                '2. التماثل الرأسي حول المستقيم x = 2.',
                '3. الجذور هما النقطتان x = 1 و x = 3.',
              ],
              hint: 'انظر إلى تقاطع المنحنى مع المحور الأفقي x.',
              quizQuestion: {
                question: 'ما هي إحداثيات رأس المنحنى في هذا الرسم؟',
                options: ['(2, -1)', '(0, 3)', '(1, 0)', '(3, 0)'],
                correctIndex: 0,
                explanation: 'رأس المنحنى هو أدنى نقطة يبلغها القطع المكافئ عند x = 2 و y = -1.',
              },
              audioTranscript: 'يوضح الرسم البياني منحنياً قطعياً مكافئاً برأس يقع عند النقطة اثنين وسالب واحد.',
            },
          },
        },
      ];
    }

    // Page 3: Geography
    return [
      {
        id: 'elem-geo-fig1',
        type: 'figure',
        title: 'الخريطة: حوض وادي النيل ومسارات الجريان',
        topPct: 15,
        leftPct: 6,
        widthPct: 88,
        heightPct: 31,
        element: {
          id: 'elem-geo-fig1',
          type: 'figure',
          title: 'خريطة حوض وادي النيل وانحدار التضاريس',
          badge: 'خريطة جغرافية',
          content: 'خريطة توضح انحدار مجرى نهر النيل من الجنوب المرتفع إلى الشمال، وموقع هضبة إثيوبيا والبحيرات الاستوائية والتقاء النيلين عند الخرطوم.',
          mockAiAnalysis: {
            simplified: 'الأرض تنحدر من الجنوب المرتفع إلى الشمال المنخفض، مما يجعل نهر النيل يجري بشكل طبيعي نحو البحر الأبيض المتوسط.',
            stepByStep: [
              '1. المنابع الاستوائية دائمة المطر طوال العام.',
              '2. هضبة إثيوبيا موسمية صيفية وتمد النهر بأكثر من 84% من إيراده.',
              '3. التقاء النيل الأزرق والنيل الأبيض عند الخرطوم.',
            ],
            hint: 'تذكر أن المياه تجري دائماً من المناطق المرتفعة تضاريسياً إلى المنخفضة.',
            quizQuestion: {
              question: 'أي الهضاب تمد نهر النيل بنحو 84% من مياهه في موسم الصيف؟',
              options: ['هضبة إثيوبيا', 'هضبة نجد', 'هضبة التبت', 'هضبة الشطوط'],
              correctIndex: 0,
              explanation: 'الأمطار الصيفية الموسمية على هضبة إثيوبيا تشكل المصدر الأكبر لمياه النيل.',
            },
            audioTranscript: 'توضح الخريطة الطبيعية حوض نهر النيل وانحدار مجراه العام من هضاب الجنوب نحو سهول الشمال.',
          },
        },
      },
      {
        id: 'elem-geo-tab1',
        type: 'table',
        title: 'الجدول الإحصائي: الموارد المائية ومساهمات الروافد',
        topPct: 49,
        leftPct: 6,
        widthPct: 88,
        heightPct: 23,
        element: {
          id: 'elem-geo-tab1',
          type: 'table',
          title: 'جدول الموارد المائية وحصص الروافد',
          badge: 'جدول إحصائي',
          content: 'جدول تفصيلي يوضح الروافد الرئيسية لنهر النيل (النيل الأزرق 59%، عطبرة 14%، النيل الأبيض 16%، السوباط 11%).',
          mockAiAnalysis: {
            simplified: 'مقارنة رقمية توضح أن النيل الأزرق وحده يقدم أكثر من نصف مياه النيل السنوية، ويليه النيل الأبيض ثم عطبرة والسوباط.',
            stepByStep: [
              '1. النيل الأزرق: 59% (المصدر الرئيسي الصيفي).',
              '2. النيل الأبيض: 16% (تدفق دائم مستقر).',
              '3. عطبرة: 14% (آخر الروافد الصابة في النيل).',
              '4. السوباط: 11%.',
            ],
            hint: 'اجمع نسب الروافد الإثيوبية (النيل الأزرق + عطبرة + السوباط) لترى النسبة الإجمالية للهضبة.',
            quizQuestion: {
              question: 'ما هو الرافد الذي يساهم بنحو 59% بمفرده من مجمل مياه النيل السنوية؟',
              options: ['النيل الأزرق', 'النيل الأبيض', 'نهر عطبرة', 'بحر الجبل'],
              correctIndex: 0,
              explanation: 'النيل الأزرق هو الشريان الأكبر لإيراد نهر النيل السنوي.',
            },
            audioTranscript: 'جدول الموارد المائية يوضح نسب مساهمة الروافد المختلفة في نهر النيل.',
          },
        },
      },
    ];
  }, [pageNumber]);

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none select-none z-10 transition-opacity duration-200"
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-hidden="true"
    >
      {hotspotsForPage.map((hotspot) => {
        const isSelected = selectedElementId === hotspot.id;

        const getIcon = () => {
          switch (hotspot.type) {
            case 'paragraph':
              return <FileText className="w-3 h-3 text-indigo-600" />;
            case 'figure':
              return <ImageIcon className="w-3 h-3 text-indigo-600" />;
            case 'equation':
              return <Calculator className="w-3 h-3 text-indigo-600" />;
            case 'table':
              return <Table className="w-3 h-3 text-indigo-600" />;
            default:
              return <Sparkles className="w-3 h-3 text-indigo-600" />;
          }
        };

        return (
          <div
            key={hotspot.id}
            onClick={() => onSelectElement(hotspot.element)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelectElement(hotspot.element);
            }}
            style={{
              top: `${hotspot.topPct}%`,
              left: `${hotspot.leftPct}%`,
              width: `${hotspot.widthPct}%`,
              height: `${hotspot.heightPct}%`,
            }}
            className={`absolute pointer-events-auto rounded-xl transition-all cursor-pointer group flex flex-col justify-between p-2 border ${
              isSelected
                ? 'border-indigo-600 bg-indigo-600/10 shadow-sm ring-2 ring-indigo-400/60'
                : 'border-transparent hover:border-indigo-400 hover:bg-indigo-500/10'
            }`}
            title={`اضغط لفتح أدوات نون حول: ${hotspot.title}`}
          >
            {/* Interactive Badge indicator on top-right (RTL) */}
            <div className="flex items-center justify-between w-full">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs transition-opacity ${
                  isSelected
                    ? 'bg-indigo-600 text-white opacity-100'
                    : 'bg-white/95 text-slate-800 border border-slate-200/90 opacity-0 group-hover:opacity-100'
                }`}
              >
                {getIcon()}
                <span>{hotspot.element.badge || 'عنصر تفاعلي'}</span>
              </span>

              {/* Quick AI Trigger button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(hotspot.element);
                }}
                className={`min-h-[28px] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-900/90 text-white hover:bg-indigo-600 opacity-0 group-hover:opacity-100 shadow-sm'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>أدوات نون</span>
              </button>
            </div>

            {/* Bottom Highlight Kicker */}
            <div
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/90 text-slate-600 self-start truncate max-w-full transition-opacity ${
                isSelected ? 'opacity-100 text-indigo-700' : 'opacity-0 group-hover:opacity-90'
              }`}
            >
              {hotspot.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};
