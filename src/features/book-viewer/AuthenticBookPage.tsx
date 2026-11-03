import React from 'react';
import { Book, BookPage, InteractiveElement } from '../../types';
import { Sparkles, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

interface AuthenticBookPageProps {
  book: Book;
  page: BookPage;
  selectedElementId: string | null;
  onSelectElement: (element: InteractiveElement) => void;
  scale: number;
}

export const AuthenticBookPage: React.FC<AuthenticBookPageProps> = ({
  book,
  page,
  selectedElementId,
  onSelectElement,
  scale,
}) => {
  return (
    <div
      className="bg-white shadow-xl mx-auto rounded-md border border-slate-300 transition-transform origin-top duration-150 select-text"
      style={{
        width: '100%',
        maxWidth: '820px',
        minHeight: '1120px',
        transform: `scale(${scale})`,
        padding: '48px 56px',
        fontFamily: "'IBM Plex Sans Arabic', serif",
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Textbook Header Strip */}
      <div className="border-b-2 border-slate-800 pb-2 mb-6 flex items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{book?.subject || 'المنهاج الدراسي'}</span>
          <span aria-hidden="true">|</span>
          <span>{page?.chapterTitle || ''}</span>
        </div>
        <div className="tabular-nums font-semibold text-slate-800">
          صفحة {page?.pageNumber || book?.currentPage || 1}
        </div>
      </div>

      {/* Lesson Title Banner (Authentic textbook styling) */}
      <div className="mb-6 pb-3 border-b border-slate-200">
        <span className="text-xs font-bold text-indigo-700 block mb-1">
          {page.chapterTitle}
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {page.lessonTitle}
        </h1>
      </div>

      {/* Page Elements (Preserving exact textbook structure) */}
      <div className="space-y-6">
        {page.elements.map((elem) => {
          const isSelected = selectedElementId === elem.id;

          return (
            <div
              key={elem.id}
              onClick={() => onSelectElement(elem)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectElement(elem);
              }}
              className={`relative rounded-xl p-4 transition-all cursor-pointer text-right group ${
                isSelected
                  ? 'ring-2 ring-indigo-600 bg-indigo-50/40 shadow-xs'
                  : 'hover:bg-slate-50/80 hover:ring-1 hover:ring-slate-300'
              }`}
            >
              {/* Subtle Tool Hover Callout Badge */}
              <div
                className={`absolute top-2 left-2 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-opacity ${
                  isSelected
                    ? 'bg-indigo-600 text-white opacity-100'
                    : 'bg-slate-200 text-slate-700 opacity-0 group-hover:opacity-100'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>أدوات نون</span>
              </div>

              {/* Element Header */}
              {elem.badge && (
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  <span>{elem.badge}</span>
                </div>
              )}

              {/* RENDER BY TYPE */}
              {elem.type === 'paragraph' && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{elem.title}</h3>
                  <p className="text-slate-800 leading-relaxed text-sm sm:text-base text-justify">
                    {elem.content}
                  </p>
                </div>
              )}

              {elem.type === 'equation' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 my-2 text-center">
                  <span className="block text-xs font-semibold text-slate-500 mb-2">{elem.title}</span>
                  <div className="text-xl sm:text-2xl font-serif font-bold text-slate-900 py-3 tracking-wider dir-ltr inline-block">
                    {elem.id === 'elem-bio-eq1' ? (
                      <span className="text-slate-800 text-sm sm:text-base font-sans">
                        3 Na⁺<sub className="text-xs">داخل</sub> + 2 K⁺<sub className="text-xs">خارج</sub> + ATP ⟶ 3 Na⁺<sub className="text-xs">خارج</sub> + 2 K⁺<sub className="text-xs">داخل</sub> + ADP + P<sub>i</sub>
                      </span>
                    ) : elem.id === 'elem-math-eq1' ? (
                      <div className="flex items-center justify-center gap-2 font-serif">
                        <span className="text-xl font-bold">x</span>
                        <span>=</span>
                        <div className="inline-flex flex-col items-center">
                          <span className="border-b border-slate-900 px-3 pb-0.5 text-lg font-semibold">
                            -b &plusmn; &radic;<span className="border-t border-slate-800 px-0.5">b&sup2; - 4ac</span>
                          </span>
                          <span className="pt-0.5 text-lg font-semibold">2a</span>
                        </div>
                      </div>
                    ) : (
                      <span>{elem.content}</span>
                    )}
                  </div>
                  <span className="block text-xs text-slate-500 mt-2">
                    اضغط لفحص المتغيرات وطريقة الاشتقاق
                  </span>
                </div>
              )}

              {elem.type === 'figure' && (
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{elem.title}</span>
                    <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
                      <Layers className="w-3.5 h-3.5" />
                      <span>رسم تفاعلي</span>
                    </span>
                  </div>

                  {/* Biological Cell Membrane SVG Graphic */}
                  {elem.id === 'elem-bio-fig1' && (
                    <div className="my-2 bg-slate-50/50 rounded-lg p-2 overflow-hidden flex flex-col items-center justify-center">
                      <svg viewBox="0 0 540 220" className="w-full max-w-lg h-auto">
                        <defs>
                          <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                          <linearGradient id="protGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>

                        {/* Outside Cell Region */}
                        <rect x="0" y="0" width="540" height="40" fill="#f8fafc" />
                        <text x="270" y="24" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">
                          السائل خارج الخلوي (Extracellular Fluid)
                        </text>

                        {/* Top Lipid Heads */}
                        {[...Array(14)].map((_, i) => {
                          const cx = 35 + i * 36;
                          if (cx >= 220 && cx <= 320) return null; // Space for channel
                          return (
                            <g key={`top-${i}`}>
                              <circle cx={cx} cy="60" r="10" fill="url(#headGrad)" stroke="#0369a1" strokeWidth="1.5" />
                              <line x1={cx - 3} y1="70" x2={cx - 3} y2="92" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                              <line x1={cx + 3} y1="70" x2={cx + 3} y2="92" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                            </g>
                          );
                        })}

                        {/* Bottom Lipid Heads */}
                        {[...Array(14)].map((_, i) => {
                          const cx = 35 + i * 36;
                          if (cx >= 220 && cx <= 320) return null; // Space for channel
                          return (
                            <g key={`bot-${i}`}>
                              <line x1={cx - 3} y1="112" x2={cx - 3} y2="134" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                              <line x1={cx + 3} y1="112" x2={cx + 3} y2="134" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                              <circle cx={cx} cy="144" r="10" fill="url(#headGrad)" stroke="#0369a1" strokeWidth="1.5" />
                            </g>
                          );
                        })}

                        {/* Protein Channel in Middle */}
                        <g>
                          <rect x="230" y="48" width="80" height="110" rx="14" fill="url(#protGrad)" stroke="#4338ca" strokeWidth="2" />
                          <path d="M 270 50 L 270 155" stroke="#ffffff" strokeWidth="3" strokeDasharray="4 3" />
                          <text x="270" y="108" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                            بروتين ناقل
                          </text>

                          {/* Sodium ion tags */}
                          <circle cx="210" cy="40" r="8" fill="#ef4444" />
                          <text x="210" y="44" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Na⁺</text>
                          <circle cx="330" cy="165" r="8" fill="#10b981" />
                          <text x="330" y="169" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">K⁺</text>
                        </g>

                        {/* Inside Cell Region */}
                        <rect x="0" y="165" width="540" height="50" fill="#f8fafc" />
                        <text x="270" y="195" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">
                          السيتوبلازم (Cytoplasm)
                        </text>
                      </svg>
                    </div>
                  )}

                  {/* Math Parabola Graph SVG */}
                  {elem.id === 'elem-math-fig1' && (
                    <div className="my-2 bg-slate-50/50 rounded-lg p-2 overflow-hidden flex flex-col items-center justify-center">
                      <svg viewBox="0 0 460 220" className="w-full max-w-lg h-auto">
                        {/* Grid lines */}
                        <g stroke="#e2e8f0" strokeWidth="1">
                          {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((x) => (
                            <line key={x} x1={x} y1="20" x2={x} y2="200" />
                          ))}
                          {[40, 80, 120, 160].map((y) => (
                            <line key={y} x1="20" y1={y} x2="440" y2={y} />
                          ))}
                        </g>

                        {/* Axes */}
                        <line x1="20" y1="140" x2="440" y2="140" stroke="#475569" strokeWidth="2" />
                        <line x1="160" y1="20" x2="160" y2="200" stroke="#475569" strokeWidth="2" />

                        {/* Axis Labels */}
                        <text x="430" y="132" fill="#334155" fontSize="12" fontWeight="bold">س (x)</text>
                        <text x="170" y="32" fill="#334155" fontSize="12" fontWeight="bold">ص (y)</text>

                        {/* Parabola Curve: f(x) = x^2 - 4x + 3. Roots at 1 and 3, vertex at (2, -1). */}
                        {/* Scaled coordinates */}
                        <path
                          d="M 120 40 Q 240 230 360 40"
                          fill="none"
                          stroke="#4338ca"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Vertex Point */}
                        <circle cx="240" cy="165" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="240" y="185" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="bold">
                          رأس المنحنى (2, -1)
                        </text>

                        {/* Intercept Points */}
                        <circle cx="200" cy="140" r="4.5" fill="#10b981" />
                        <text x="195" y="130" fill="#047857" fontSize="10" fontWeight="bold">x=1</text>

                        <circle cx="280" cy="140" r="4.5" fill="#10b981" />
                        <text x="285" y="130" fill="#047857" fontSize="10" fontWeight="bold">x=3</text>
                      </svg>
                    </div>
                  )}

                  {/* Geography Map SVG */}
                  {elem.id === 'elem-geo-fig1' && (
                    <div className="my-2 bg-slate-50/50 rounded-lg p-2 overflow-hidden flex flex-col items-center justify-center">
                      <svg viewBox="0 0 460 220" className="w-full max-w-lg h-auto">
                        {/* Background Map Shape (Stylized Nile basin) */}
                        <rect x="0" y="0" width="460" height="220" fill="#f1f5f9" rx="8" />

                        {/* Mediterranean Sea */}
                        <path d="M 140 10 Q 230 30 320 10 L 320 35 Q 230 45 140 35 Z" fill="#bae6fd" />
                        <text x="230" y="26" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="bold">
                          البحر الأبيض المتوسط
                        </text>

                        {/* Nile Delta & River Path */}
                        <path
                          d="M 220 35 L 210 60 L 230 60 Z"
                          fill="#86efac"
                        />
                        <path
                          d="M 220 60 Q 230 90 220 115 Q 210 135 220 150 Q 225 170 210 190"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />

                        {/* Blue Nile tributary from Ethiopia */}
                        <path
                          d="M 220 150 Q 260 160 280 175"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="3"
                          strokeDasharray="2 2"
                        />

                        {/* Lake Victoria */}
                        <ellipse cx="210" cy="195" rx="20" ry="12" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="210" y="214" textAnchor="middle" fill="#0369a1" fontSize="9" fontWeight="bold">
                          بحيرة فيكتوريا (المنابع الاستوائية)
                        </text>

                        {/* Ethiopian Plateau */}
                        <circle cx="285" cy="178" r="16" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
                        <text x="335" y="180" fill="#92400e" fontSize="9" fontWeight="bold">
                          هضبة إثيوبيا (84% من الإيراد)
                        </text>

                        {/* Confluence in Khartoum */}
                        <circle cx="220" cy="150" r="3.5" fill="#4338ca" />
                        <text x="175" y="152" fill="#312e81" fontSize="9" fontWeight="bold">
                          الخرطوم
                        </text>
                      </svg>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {elem.content}
                  </p>
                </div>
              )}

              {elem.type === 'exercise' && (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 my-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>{elem.title}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed mb-3">
                    {elem.content}
                  </p>
                  <div className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>انقر لتفكيك المعطيات والحصول على تلميحات ذكية</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Page Footer Footnote */}
      <div className="border-t border-slate-200 pt-4 mt-12 flex items-center justify-between text-[11px] text-slate-400">
        <span>منصة نون التعليمية · عرض الكتاب كما هو</span>
        <span>{book.gradeLevel}</span>
      </div>
    </div>
  );
};
