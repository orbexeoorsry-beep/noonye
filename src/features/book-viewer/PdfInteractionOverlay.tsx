import React from 'react';
import { InteractiveElement } from '../../types';
import { Sparkles, FileText, Image as ImageIcon, Calculator, Table } from 'lucide-react';
import { useI18n } from '../../i18n';
import { isFeatureEnabled } from '../../config/feature-flags';

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
  const { lang } = useI18n();
  const isEn = lang === 'en';

  // Curated hotspots corresponding to the genuine educational layout in the PDF
  const hotspotsForPage: OverlayHotspot[] = React.useMemo(() => {
    if (pageNumber === 1) {
      return [
        {
          id: 'elem-bio-p1',
          type: 'paragraph',
          title: isEn
            ? 'Paragraph: Selective Permeability & Cellular Transport'
            : 'الفقرة: النفاذية الاختيارية والنقل الخلوي',
          topPct: 15,
          leftPct: 6,
          widthPct: 88,
          heightPct: 11,
          element: {
            id: 'elem-bio-p1',
            type: 'paragraph',
            title: isEn
              ? 'Selective Permeability & Cellular Transport'
              : 'النفاذية الاختيارية والنقل الخلوي',
            badge: isEn ? 'Scientific Paragraph' : 'فقرة علمية',
            content: isEn
              ? 'The plasma membrane features selective permeability, allowing small molecules like water and oxygen to pass easily through the phospholipid bilayer while regulating larger molecules such as glucose and ions.'
              : 'يمتاز الغشاء البلازمي بخاصية حيوية تُعرف بالنفاذية الاختيارية، حيث يسمح بمرور بعض المواد مثل جزيئات الماء والأكسجين بسهولة عبر طبقتي الدهون المفسفرة، بينما يتحكم بمرور الجزيئات الكبيرة كالجلوكوز.',
            mockAiAnalysis: {
              simplified: isEn
                ? 'The plasma membrane acts like a smart gatekeeper: small molecules pass freely, while larger molecules and ions require specialized carrier proteins and channels.'
                : 'الغشاء البلازمي كبوابة ذكية: يسمح بعبور المواد البسيطة بدون عناء، ويخضع المواد الكبيرة لقنوات فحص وبروتينات ناقلة متخصصة.',
              stepByStep: isEn
                ? [
                    '1. The phospholipid bilayer prevents random passage of polar or large dissolved substances.',
                    '2. Small gases (such as oxygen) cross by simple diffusion.',
                    '3. Protein channels regulate the movement of ions and glucose.',
                  ]
                : [
                    '1. طبقة الفوسفوليبيد تمنع عبور المواد القطبية والذائبة عشوائياً.',
                    '2. الغازات الصغيرة (الأكسجين) تعبر بالانتشار البسيط.',
                    '3. القنوات البروتينية تنظم حركة الأيونات والجلوكوز.',
                  ],
              hint: isEn
                ? 'Focus on the relationship between molecule size/charge and its ability to cross the membrane.'
                : 'ركز على العلاقة بين حجم الجزيء وشحنته وقدرته على النفاذ.',
              quizQuestion: {
                question: isEn
                  ? 'Which property allows the cell membrane to control substances entering and leaving the cell?'
                  : 'ما الخاصية التي تسمح للخلية بالتحكم في المواد الداخلة والخارجة؟',
                options: isEn
                  ? ['Selective permeability', 'Capillary action', 'Hydrolysis', 'Atmospheric pressure']
                  : ['النفاذية الاختيارية', 'الخاصية الشعرية', 'التحلل المائي', 'الضغط الجوي'],
                correctIndex: 0,
                explanation: isEn
                  ? 'Selective permeability is the plasma membrane’s ability to regulate substances according to cellular needs.'
                  : 'النفاذية الاختيارية هي قدرة الغشاء البلازمي على فرز المواد بحسب حاجة الخلية.',
              },
              audioTranscript: isEn
                ? 'The plasma membrane is characterized by selective permeability...'
                : 'يمتاز الغشاء البلازمي بخاصية حيوية تُعرف بالنفاذية الاختيارية...',
              equationAnalysis: {
                variables: isEn
                  ? [
                      { symbol: 'O₂ , H₂O', meaning: 'Small molecules crossing via simple diffusion / osmosis' },
                      { symbol: 'Na⁺ , K⁺', meaning: 'Charged ions requiring transport proteins and ATP' },
                    ]
                  : [
                      { symbol: 'O₂ , H₂O', meaning: 'جزيئات صغيرة تعبر بالانتشار البسيط والأسموزية' },
                      { symbol: 'Na⁺ , K⁺', meaning: 'أيونات مشحونة تتطلب قنوات ومضخات بروتينية' },
                    ],
                derivation: isEn
                  ? 'Transport across the membrane is governed by concentration gradients and lipid solubility.'
                  : 'تحكم النفاذية الاختيارية حركة المواد حسب تدرج التركيز وحجم الجزيئات وشحنتها.',
                application: isEn
                  ? 'Maintains cellular homeostasis and internal chemical balance.'
                  : 'الحفاظ على الاتزان الداخلي للخلية الحية.',
              },
            },
          },
        },
        {
          id: 'elem-bio-fig1',
          type: 'figure',
          title: isEn
            ? 'Diagram: Fluid Mosaic Model of the Plasma Membrane'
            : 'رسم توضيحي: نموذج الفسيفساء السائل للغشاء',
          topPct: 27,
          leftPct: 6,
          widthPct: 88,
          heightPct: 32,
          element: {
            id: 'elem-bio-fig1',
            type: 'figure',
            title: isEn
              ? 'Fluid Mosaic Model of the Plasma Membrane'
              : 'نموذج الفسيفساء السائل للغشاء البلازمي',
            badge: isEn ? 'Scientific Diagram' : 'شكل توضيحي علمي',
            content: isEn
              ? 'Diagram showing the phospholipid bilayer with hydrophilic heads, hydrophobic tails, integral proteins, and ion pumps.'
              : 'رسم يوضح طبقة الدهون المفسفرة المزدوجة المحبة والكارهة للماء مع البروتينات الغائرة والقنوات الناقلة ومضخات الأيونات.',
            mockAiAnalysis: {
              simplified: isEn
                ? 'The diagram shows two lipid layers: water-loving heads face the inside and outside fluids, water-fearing tails hide in the middle, and protein channels act as bridges.'
                : 'الرسم يوضح طبقتين من الدهون: الرؤوس تحب الماء فتواجه الداخل والخارج، والذيول كارهة للماء فتحتمي في المنتصف، وبروتينات أسطوانية تعمل كمعابر.',
              stepByStep: isEn
                ? [
                    '1. Blue hydrophilic heads: polar heads facing the aqueous intracellular and extracellular fluids.',
                    '2. Fatty acid tails: non-polar hydrophobic core forming an insulating barrier.',
                    '3. Carrier proteins: span the membrane to transport ions and nutrients.',
                  ]
                : [
                    '1. الرؤوس الزرقاء: قطبية محبة للماء تتلامس مع السائلين الخارجي والداخلي.',
                    '2. الذيول الدهنية: غير قطبية تشكل وسطاً عازلاً غير نفاذ للماء.',
                    '3. البروتين البنفسجي: يعمل كقناة ناقلة للأيونات.',
                  ],
              hint: isEn
                ? 'Notice how the hydrophilic heads face the water on both sides while the tails point inward.'
                : 'لاحظ موقع الرؤوس المحبة للماء بالنسبة للوسط المائي الداخلي والخارجي.',
              quizQuestion: {
                question: isEn
                  ? 'Where do the hydrophobic tails point in the plasma membrane?'
                  : 'أين تتجه الذيول الكارهة للماء في الغشاء البلازمي؟',
                options: isEn
                  ? ['Inward toward the center of the membrane away from water', 'Outward toward the extracellular fluid', 'Into the nucleus', 'Floating freely outside the cell']
                  : ['إلى الداخل نحو منتصف الغشاء بعيداً عن الماء', 'إلى السيتوبلازم الخارجي', 'إلى داخل النواة', 'تطفو بحرية خارج الخلية'],
                correctIndex: 0,
                explanation: isEn
                  ? 'Non-polar hydrophobic tails cluster in the interior of the bilayer away from water.'
                  : 'تتجمع الذيول غير القطبية في مركز الغشاء لتجنب التلامس مع البيئة المائية.',
              },
              audioTranscript: isEn
                ? 'The figure illustrates the fluid mosaic model of the plasma membrane showing polar heads and lipid tails.'
                : 'يوضح الشكل نموذج الفسيفساء السائل للغشاء البلازمي مبيناً الرؤوس القطبية والذيول الدهنية.',
              figureExplanation: isEn
                ? 'A structural biological diagram of the cell membrane highlighting protein carriers and the lipid bilayer.'
                : 'تمثيل هندسي حيوي لمكونات الغشاء الخلوي، مبيناً مواقع النواقل البروتينية ومناطق العزل الدهني.',
              equationAnalysis: {
                variables: isEn
                  ? [
                      { symbol: 'Hydrophilic Head', meaning: 'Polar phosphate head attracted to water' },
                      { symbol: 'Hydrophobic Tail', meaning: 'Non-polar fatty acid chains repelled by water' },
                    ]
                  : [
                      { symbol: 'الرؤوس القطبية', meaning: 'رؤوس فوسفاتية محبة للماء تواجه السطحين الخارجي والداخلي' },
                      { symbol: 'الذيول الدهنية', meaning: 'سلاسل أحماض دهنية كارهة للماء تتجه لمركز الغشاء' },
                    ],
                derivation: isEn
                  ? 'The amphipathic nature of phospholipids automatically forms a stable bilayer in aqueous environments.'
                  : 'الطبيعة المزدوجة للدهون المفسفرة تجعلها تصطف تلقائياً في طبقتين متقابلتين.',
                application: isEn
                  ? 'Explains membrane flexibility and selective barrier function.'
                  : 'تفسير مرونة الغشاء الخلوي وقدرته على العزل والنقل الانتقائي.',
              },
            },
          },
        },
        {
          id: 'elem-bio-ex1',
          type: 'exercise',
          title: isEn
            ? 'Exercise: Sodium-Potassium Pump & ATP Usage'
            : 'تمرين وتطبيق: مضخة الصوديوم والبوتاسيوم واستخدام ATP',
          topPct: 62,
          leftPct: 6,
          widthPct: 88,
          heightPct: 18,
          element: {
            id: 'elem-bio-ex1',
            type: 'exercise',
            title: isEn
              ? 'Exercise: Energy Consumption in Active Transport'
              : 'تمرين: استهلاك الطاقة في النقل النشط',
            badge: isEn ? 'Practice Problem' : 'مسألة تدريبية',
            content: isEn
              ? 'What is the direct energy source used by the sodium-potassium pump to transport ions against the concentration gradient?'
              : 'ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم لنقل الأيونات ضد منحدر التركيز؟',
            mockAiAnalysis: {
              simplified: isEn
                ? 'The cell pushes ions from low to high concentration—like pushing a ball uphill—which requires energy supplied directly by ATP molecules.'
                : 'الخلية تدفع الأيونات إلى المكان الأكثر ازدحاماً، وهذا مثل صعود تل يتطلب مجهوداً وطاقة من بطارية الخلية المسماة ATP.',
              stepByStep: isEn
                ? [
                    '1. Active transport moves ions against their concentration gradient.',
                    '2. Hydrolysis of a phosphate bond in ATP releases energy to change the carrier protein shape.',
                    '3. 3 Na⁺ ions are pumped out for every 2 K⁺ ions pumped in.',
                  ]
                : [
                    '1. النقل النشط يحرك الأيونات ضد منحدر التركيز.',
                    '2. استهلاك رابطة فوسفاتية من جزيء ATP يحرر الطاقة اللازمة لتغيير شكل البروتين الناقل.',
                    '3. يتم طرد 3 أيونات صوديوم مقابل سحب أيوني بوتاسيوم.',
                  ],
              hint: isEn
                ? 'Remember: "Active" transport always requires cellular energy (ATP).'
                : 'تذكر دائماً: كلمة "نشط" تعني مباشرة وجود استهلاك لطاقة ATP.',
              quizQuestion: {
                question: isEn
                  ? 'What is the primary energy currency used in active transport?'
                  : 'ما هي العملة الأساسية للطاقة المستخدمة في النقل النشط؟',
                options: ['ATP', 'DNA', 'RNA', 'NaCl'],
                correctIndex: 0,
                explanation: isEn
                  ? 'ATP (Adenosine Triphosphate) is the direct chemical energy source in the cell.'
                  : 'جزيء ATP (أدينوسين ثلاثي الفوسفات) هو المصدر الكيميائي المباشر للطاقة في الخلية.',
              },
              audioTranscript: isEn
                ? 'Exercise: What is the direct energy source used by the sodium-potassium pump?'
                : 'تمرين: ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم؟',
              equationAnalysis: {
                variables: isEn
                  ? [
                      { symbol: '3 Na⁺', meaning: 'Three sodium ions pumped out of the cell' },
                      { symbol: '2 K⁺', meaning: 'Two potassium ions pumped into the cell' },
                      { symbol: 'ATP → ADP + Pi', meaning: 'ATP hydrolysis releasing chemical energy for active transport' },
                    ]
                  : [
                      { symbol: '3 Na⁺', meaning: 'ثلاثة أيونات صوديوم يتم ضخها إلى خارج الخلية' },
                      { symbol: '2 K⁺', meaning: 'أيونان من البوتاسيوم يتم سحبهما إلى داخل الخلية' },
                      { symbol: 'ATP → ADP + Pi', meaning: 'تحلل جزيء الطاقة لتحرير الطاقة الكيميائية اللازمة للنقل النشط' },
                    ],
                derivation: isEn
                  ? 'Because ions move from lower to higher concentration (against the gradient), the pump requires direct chemical energy from ATP.'
                  : 'بما أن حركة الأيونات تتم من التركيز الأقل إلى التركيز الأعلى (عكس منحدر التركيز)، فإن العملية تحتاج إلى استهلاك طاقة كيميائية مباشرة من جزيئات ATP.',
                application: isEn
                  ? 'Maintains resting membrane potential and nerve impulse transmission in neurons and muscle cells.'
                  : 'الحفاظ على الجهد الكهربائي للغشاء الخلوي ونقل السيالات العصبية في الخلايا العصبية والعضلية.',
              },
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
          title: isEn
            ? 'Equation: Quadratic Formula'
            : 'المعادلة: القانون العام لحل المعادلة التربيعية',
          topPct: 15,
          leftPct: 6,
          widthPct: 88,
          heightPct: 13,
          element: {
            id: 'elem-math-eq1',
            type: 'equation',
            title: isEn ? 'The Quadratic Formula' : 'القانون العام للمعادلة التربيعية',
            badge: isEn ? 'Mathematical Formula' : 'قاعدة رياضية',
            content: 'x = [-b +/- sqrt(b^2 - 4ac)] / 2a',
            mockAiAnalysis: {
              simplified: isEn
                ? 'A universal formula to solve any second-degree quadratic equation once you identify the coefficients a, b, and constant c.'
                : 'صيغة قياسية لحل أي معادلة من الدرجة الثانية بمجرد استخراج المعاملات a و b والحد المطلق c.',
              stepByStep: isEn
                ? [
                    '1. Write the equation in standard form: ax² + bx + c = 0.',
                    '2. Compute the discriminant Δ = b² - 4ac to determine the number and nature of roots.',
                    '3. Substitute into x = (-b ± √Δ) / (2a) to find the roots.',
                  ]
                : [
                    '1. كتابة المعادلة على الصورة: ax^2 + bx + c = 0.',
                    '2. حساب المميز Delta = b^2 - 4ac لتحديد عدد وطبيعة الحلول.',
                    '3. التعويض في القانون لإيجاد قيم x الممكنة.',
                  ],
              hint: isEn
                ? 'Calculate the discriminant (b² - 4ac) under the square root first to check if real solutions exist.'
                : 'احسب ما تحت الجذر أولاً لتتأكد هل يوجد حل حقيقي أم لا.',
              quizQuestion: {
                question: isEn
                  ? 'If the discriminant (b² - 4ac) is negative, what is the nature of the roots?'
                  : 'إذا كان المميز (b² - 4ac) سالباً، فما نوع الجذور؟',
                options: isEn
                  ? ['No real roots', 'One repeated real root', 'Two distinct real roots', 'Infinitely many roots']
                  : ['لا توجد حلول حقيقية', 'حل حقيقي واحد مكرر', 'حلان حقيقيان مختلفان', 'ما لا نهاية من الحلول'],
                correctIndex: 0,
                explanation: isEn
                  ? 'The square root of a negative number is not defined in the set of real numbers.'
                  : 'الجذر التربيعي لعدد سالب غير معرف في مجموعة الأعداد الحقيقية.',
              },
              audioTranscript: isEn
                ? 'The quadratic formula: x equals negative b plus or minus the square root of b squared minus 4ac, all over 2a.'
                : 'القانون العام لحل المعادلة التربيعية: سين يساوي سالب باء زائد أو ناقص الجذر التربيعي لباء تربيع ناقص أربعة ألف جيم...',
              equationAnalysis: {
                variables: isEn
                  ? [
                      { symbol: 'a', meaning: 'Coefficient of x² (must not equal 0)' },
                      { symbol: 'b', meaning: 'Coefficient of the linear term x' },
                      { symbol: 'c', meaning: 'Constant term in the equation' },
                      { symbol: 'Δ = b² - 4ac', meaning: 'Discriminant that determines the number and type of roots' },
                    ]
                  : [
                      { symbol: 'a', meaning: 'معامل الحد التربيعي (x²) ويشترط ألا يساوي صفراً' },
                      { symbol: 'b', meaning: 'معامل الحد الخطي (x)' },
                      { symbol: 'c', meaning: 'الحد الثابت (المطلق) في المعادلة' },
                      { symbol: 'Δ = b² - 4ac', meaning: 'المميز الذي يحدد عدد ونوع جذور المعادلة' },
                    ],
                derivation: isEn
                  ? 'Derived by completing the square on the standard quadratic equation ax² + bx + c = 0 and taking the square root of both sides.'
                  : 'يُشتق القانون العام بإكمال المربع للمعادلة القياسية ax² + bx + c = 0 ثم أخذ الجذر التربيعي للطرفين.',
                application: isEn
                  ? 'Used to calculate projectile trajectories, geometric intersections, and optimization problems.'
                  : 'حساب مسارات المقذوفات الفيزيائية، وتحديد نقاط تقاطع المنحنيات الهندسية وحل مسائل المساحات.',
              },
            },
          },
        },
        {
          id: 'elem-math-fig1',
          type: 'figure',
          title: isEn
            ? 'Graph: Parabola Curve & Roots of the Equation'
            : 'الرسم البياني: المنحنى القطعي المكافئ وجذور المعادلة',
          topPct: 30,
          leftPct: 6,
          widthPct: 88,
          heightPct: 30,
          element: {
            id: 'elem-math-fig1',
            type: 'figure',
            title: isEn
              ? 'Parabola Curve & Roots of the Function'
              : 'المنحنى القطعي المكافئ وجذور الدالة',
            badge: isEn ? 'Geometric Graph' : 'رسم بياني هندسي',
            content: isEn
              ? 'Graph of the quadratic function f(x) = (x-2)² - 1 with vertex at (2, -1) and x-axis intercepts at x = 1 and x = 3.'
              : 'منحنى الدالة التربيعية f(x) = (x-2)^2 - 1 برأس المنحنى عند (2, -1) ونقاط التقاطع مع محور السينات عند x = 1 و x = 3.',
            mockAiAnalysis: {
              simplified: isEn
                ? 'The points where the parabola crosses the horizontal x-axis are the exact real roots (solutions) of the quadratic equation.'
                : 'النقاط التي يقطع فيها المنحنى الخط الأفقي (محور السينات) هي تماماً حلول المعادلة الرياضية.',
              stepByStep: isEn
                ? [
                    '1. The vertex represents the minimum point at (2, -1).',
                    '2. The axis of symmetry is the vertical line x = 2.',
                    '3. The roots (x-intercepts) are x = 1 and x = 3.',
                  ]
                : [
                    '1. رأس المنحنى يمثل القاع (القيمة الصغرى) عند النقطة (2, -1).',
                    '2. التماثل الرأسي حول المستقيم x = 2.',
                    '3. الجذور هما النقطتان x = 1 و x = 3.',
                  ],
              hint: isEn
                ? 'Look at the points where the curve intersects the horizontal x-axis.'
                : 'انظر إلى تقاطع المنحنى مع المحور الأفقي x.',
              quizQuestion: {
                question: isEn
                  ? 'What are the coordinates of the vertex of the parabola in this graph?'
                  : 'ما هي إحداثيات رأس المنحنى في هذا الرسم؟',
                options: ['(2, -1)', '(0, 3)', '(1, 0)', '(3, 0)'],
                correctIndex: 0,
                explanation: isEn
                  ? 'The vertex is the lowest point reached by the parabola at x = 2 and y = -1.'
                  : 'رأس المنحنى هو أدنى نقطة يبلغها القطع المكافئ عند x = 2 و y = -1.',
              },
              audioTranscript: isEn
                ? 'The graph illustrates a parabola with its vertex at (2, -1) and roots at x = 1 and x = 3.'
                : 'يوضح الرسم البياني منحنياً قطعياً مكافئاً برأس يقع عند النقطة اثنين وسالب واحد.',
              equationAnalysis: {
                variables: isEn
                  ? [
                      { symbol: 'f(x) = (x - 2)² - 1', meaning: 'Quadratic function in vertex form' },
                      { symbol: '(h, k) = (2, -1)', meaning: 'Coordinates of the vertex (minimum point)' },
                      { symbol: 'x = 1 , x = 3', meaning: 'Roots of the equation (x-intercepts where y = 0)' },
                    ]
                  : [
                      { symbol: 'f(x) = (x - 2)² - 1', meaning: 'معادلة القطع المكافئ بصيغة رأس المنحنى' },
                      { symbol: '(h, k) = (2, -1)', meaning: 'إحداثيات رأس المنحنى (نقطة القيمة الصغرى)' },
                      { symbol: 'x = 1 , x = 3', meaning: 'جذرا المعادلة (نقاط التقاطع مع محور السينات y = 0)' },
                    ],
                derivation: isEn
                  ? 'Setting f(x) = 0 gives (x - 2)² = 1, so x - 2 = ±1, yielding the two roots x = 3 and x = 1.'
                  : 'بوضع f(x) = 0 ينتج (x - 2)² = 1 ومنها x - 2 = ±1، وبالتالي الجذران هما x = 3 و x = 1.',
                application: isEn
                  ? 'Graphing quadratic functions and finding minimum/maximum values directly from the curve.'
                  : 'تمثيل الدوال التربيعية بيانياً وإيجاد القيم القصوى (العظمى أو الصغرى) مباشرة من الرسم.',
              },
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
        title: isEn
          ? 'Map: Nile Basin & Flow Pathways'
          : 'الخريطة: حوض وادي النيل ومسارات الجريان',
        topPct: 15,
        leftPct: 6,
        widthPct: 88,
        heightPct: 31,
        element: {
          id: 'elem-geo-fig1',
          type: 'figure',
          title: isEn
            ? 'Nile Basin Map & Topographic Slope'
            : 'خريطة حوض وادي النيل وانحدار التضاريس',
          badge: isEn ? 'Geographic Map' : 'خريطة جغرافية',
          content: isEn
            ? 'Map showing the northward slope of the Nile River from the southern highlands to the Mediterranean Sea, highlighting the Ethiopian Highlands, Equatorial Lakes, and Khartoum confluence.'
            : 'خريطة توضح انحدار مجرى نهر النيل من الجنوب المرتفع إلى الشمال، وموقع هضبة إثيوبيا والبحيرات الاستوائية والتقاء النيلين عند الخرطوم.',
          mockAiAnalysis: {
            simplified: isEn
              ? 'The terrain slopes from the high southern plateaus toward the low northern plains, causing the Nile to flow naturally northward to the Mediterranean Sea.'
              : 'الأرض تنحدر من الجنوب المرتفع إلى الشمال المنخفض، مما يجعل نهر النيل يجري بشكل طبيعي نحو البحر الأبيض المتوسط.',
            stepByStep: isEn
              ? [
                  '1. Equatorial Lake sources provide steady, year-round water flow.',
                  '2. The Ethiopian Highlands provide over 84% of water during summer monsoon rains.',
                  '3. The Blue Nile and White Nile meet at Khartoum.',
                ]
              : [
                  '1. المنابع الاستوائية دائمة المطر طوال العام.',
                  '2. هضبة إثيوبيا موسمية صيفية وتمد النهر بأكثر من 84% من إيراده.',
                  '3. التقاء النيل الأزرق والنيل الأبيض عند الخرطوم.',
                ],
            hint: isEn
              ? 'Remember that rivers always flow from higher elevation plateaus to lower elevation plains.'
              : 'تذكر أن المياه تجري دائماً من المناطق المرتفعة تضاريسياً إلى المنخفضة.',
            quizQuestion: {
              question: isEn
                ? 'Which plateau supplies the Nile River with about 84% of its water during summer?'
                : 'أي الهضاب تمد نهر النيل بنحو 84% من مياهه في موسم الصيف؟',
              options: isEn
                ? ['Ethiopian Plateau', 'Najd Plateau', 'Tibetan Plateau', 'Shotts Plateau']
                : ['هضبة إثيوبيا', 'هضبة نجد', 'هضبة التبت', 'هضبة الشطوط'],
              correctIndex: 0,
              explanation: isEn
                ? 'Summer seasonal rains on the Ethiopian Highlands form the largest source of Nile water.'
                : 'الأمطار الصيفية الموسمية على هضبة إثيوبيا تشكل المصدر الأكبر لمياه النيل.',
            },
            audioTranscript: isEn
              ? 'The physical map illustrates the Nile River basin and its general northward slope.'
              : 'توضح الخريطة الطبيعية حوض نهر النيل وانحدار مجراه العام من هضاب الجنوب نحو سهول الشمال.',
            equationAnalysis: {
              variables: isEn
                ? [
                    { symbol: 'South → North', meaning: 'General topographic slope direction toward the Mediterranean' },
                    { symbol: '84% vs 16%', meaning: 'Ratio of seasonal Ethiopian share vs. permanent Equatorial share' },
                  ]
                : [
                    { symbol: 'الجنوب ← الشمال', meaning: 'اتجاه الانحدار العام لمجرى نهر النيل نحو البحر المتوسط' },
                    { symbol: '84% مقابل 16%', meaning: 'نسبة مساهمة المنابع الموسمية مقارنة بالمنابع الدائمة' },
                  ],
              derivation: isEn
                ? 'Water flow velocity and direction are determined by the elevation difference between the southern plateaus and northern delta.'
                : 'يتحدد اتجاه الجريان وسرعته بفارق الارتفاع التضاريسي بين هضاب الجنوب وسهول الدلتا شمالاً.',
              application: isEn
                ? 'Understanding river hydrology, dam placement, and seasonal flood management.'
                : 'فهم هيدرولوجيا الأنهار وتوزيع السدود وإدارة الفيضانات الموسمية.',
            },
          },
        },
      },
      {
        id: 'elem-geo-tab1',
        type: 'table',
        title: isEn
          ? 'Statistical Table: Water Resources & Tributary Shares'
          : 'الجدول الإحصائي: الموارد المائية ومساهمات الروافد',
        topPct: 49,
        leftPct: 6,
        widthPct: 88,
        heightPct: 23,
        element: {
          id: 'elem-geo-tab1',
          type: 'table',
          title: isEn
            ? 'Water Resources & Tributary Shares Table'
            : 'جدول الموارد المائية وحصص الروافد',
          badge: isEn ? 'Statistical Table' : 'جدول إحصائي',
          content: isEn
            ? 'Detailed table showing the main Nile tributaries: Blue Nile 59%, White Nile 16%, Atbara River 14%, Sobat River 11%.'
            : 'جدول تفصيلي يوضح الروافد الرئيسية لنهر النيل (النيل الأزرق 59%، عطبرة 14%، النيل الأبيض 16%، السوباط 11%).',
          mockAiAnalysis: {
            simplified: isEn
              ? 'A numerical comparison showing that the Blue Nile alone provides more than half of the Nile’s annual water, followed by the White Nile, Atbara, and Sobat.'
              : 'مقارنة رقمية توضح أن النيل الأزرق وحده يقدم أكثر من نصف مياه النيل السنوية، ويليه النيل الأبيض ثم عطبرة والسوباط.',
            stepByStep: isEn
              ? [
                  '1. Blue Nile: 59% (primary summer source).',
                  '2. White Nile: 16% (steady permanent flow).',
                  '3. Atbara River: 14% (last tributary joining the Nile).',
                  '4. Sobat River: 11%.',
                ]
              : [
                  '1. النيل الأزرق: 59% (المصدر الرئيسي الصيفي).',
                  '2. النيل الأبيض: 16% (تدفق دائم مستقر).',
                  '3. عطبرة: 14% (آخر الروافد الصابة في النيل).',
                  '4. السوباط: 11%.',
                ],
            hint: isEn
              ? 'Sum the Ethiopian tributary percentages (Blue Nile + Atbara + Sobat) to find the total highland share.'
              : 'اجمع نسب الروافد الإثيوبية (النيل الأزرق + عطبرة + السوباط) لترى النسبة الإجمالية للهضبة.',
            quizQuestion: {
              question: isEn
                ? 'Which tributary alone contributes about 59% of the total annual Nile water?'
                : 'ما هو الرافد الذي يساهم بنحو 59% بمفرده من مجمل مياه النيل السنوية؟',
              options: isEn
                ? ['Blue Nile', 'White Nile', 'Atbara River', 'Bahr el Jebel']
                : ['النيل الأزرق', 'النيل الأبيض', 'نهر عطبرة', 'بحر الجبل'],
              correctIndex: 0,
              explanation: isEn
                ? 'The Blue Nile is the single largest contributor to the Nile’s annual water discharge.'
                : 'النيل الأزرق هو الشريان الأكبر لإيراد نهر النيل السنوي.',
            },
            audioTranscript: isEn
              ? 'The water resources table shows the percentage contribution of each tributary to the Nile River.'
              : 'جدول الموارد المائية يوضح نسب مساهمة الروافد المختلفة في نهر النيل.',
            equationAnalysis: {
              variables: isEn
                ? [
                    { symbol: '59% + 14% + 11% = 84%', meaning: 'Total contribution of seasonal sources (Ethiopian Highlands)' },
                    { symbol: '16%', meaning: 'Contribution of permanent Equatorial sources (White Nile)' },
                    { symbol: '84% + 16% = 100%', meaning: 'Total annual Nile water discharge' },
                  ]
                : [
                    { symbol: '59% + 14% + 11% = 84%', meaning: 'إجمالي مساهمة المنابع الموسمية (هضبة إثيوبيا)' },
                    { symbol: '16%', meaning: 'مساهمة المنابع الاستوائية الدائمة (النيل الأبيض)' },
                    { symbol: '84% + 16% = 100%', meaning: 'المجموع الكلي لإيراد نهر النيل السنوي' },
                  ],
              derivation: isEn
                ? 'Adding the three seasonal Ethiopian tributaries (Blue Nile 59% + Atbara 14% + Sobat 11%) yields the 84% Ethiopian Highlands share.'
                : 'يتم جمع نسب الروافد الموسمية الثلاثة (النيل الأزرق 59% + عطبرة 14% + السوباط 11%) للحصول على حصة الهضبة الإثيوبية (84%).',
              application: isEn
                ? 'Analyzing hydrological statistical tables and computing river basin contribution shares.'
                : 'تحليل الجداول الإحصائية المائية وحساب نسب مساهمة الأنهار والأحواض الجغرافية.',
            },
          },
        },
      },
    ];
  }, [pageNumber, isEn]);

  if (!isFeatureEnabled('aiAssistantEnabled') || !isEnabled || width === 0 || height === 0) return null;

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
            title={isEn ? `Click to open Noon Tools for: ${hotspot.title}` : `اضغط لفتح أدوات نون حول: ${hotspot.title}`}
          >
            {/* Interactive Badge indicator */}
            <div className="flex items-center justify-between w-full">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs transition-opacity ${
                  isSelected
                    ? 'bg-indigo-600 text-white opacity-100'
                    : 'bg-white/95 text-slate-800 border border-slate-200/90 opacity-0 group-hover:opacity-100'
                }`}
              >
                {getIcon()}
                <span>{hotspot.element.badge || (isEn ? 'Interactive Element' : 'عنصر تفاعلي')}</span>
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
                <span>{isEn ? 'Noon Tools' : 'أدوات نون'}</span>
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
