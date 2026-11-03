import { SelectionActionType, SelectionToolId } from './types';

export interface SelectionMenuToolDefinition {
  action: SelectionActionType;
  toolId: SelectionToolId;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  badgeAr?: string;
  iconColorClass: string;
  defaultEnabled: boolean;
}

export interface TranslationLanguageOption {
  code: string;
  labelAr: string;
  labelEn: string;
  isDefault?: boolean;
}

export interface StudentSelectionToolsPreferences {
  enabledActions: SelectionActionType[];
  orderedActions: SelectionActionType[];
  targetLanguageCode: string;
}

const STORAGE_KEY = 'noon_custom_selection_tools_v1';
const ADMIN_LANGUAGES_STORAGE_KEY = 'noon_admin_translation_languages_v1';

/**
 * اللغات المستهدفة للترجمة (حاليًا: من اللغة المحددة بالمؤشر إلى اللغة العربية،
 * مع بنية جاهزة للتوسيع لاحقًا من لوحة التحكم لإضافة لغات أخرى)
 */
export const DEFAULT_TRANSLATION_LANGUAGES: TranslationLanguageOption[] = [
  {
    code: 'ar',
    labelAr: 'اللغة العربية',
    labelEn: 'Arabic',
    isDefault: true,
  },
];

export const ALL_SELECTION_MENU_TOOLS: SelectionMenuToolDefinition[] = [
  {
    action: 'explain',
    toolId: 'stepByStep',
    labelAr: 'شرح الخطوات',
    labelEn: 'Explain',
    descAr: 'شرح الفكرة المحددة خطوة بخطوة',
    descEn: 'Step-by-step explanation',
    iconColorClass: 'text-indigo-400',
    defaultEnabled: true,
  },
  {
    action: 'simplify',
    toolId: 'simplify',
    labelAr: 'تبسيط المفهوم',
    labelEn: 'Simplify',
    descAr: 'إعادة صياغة مبسطة وسهلة الفهم',
    descEn: 'Simplify selected concept',
    iconColorClass: 'text-amber-400',
    defaultEnabled: true,
  },
  {
    action: 'translate',
    toolId: 'translate',
    labelAr: 'الترجمة',
    labelEn: 'Translate',
    descAr: 'ترجمة من اللغة المحددة بالمؤشر إلى العربية',
    descEn: 'Translate from selected language to Arabic',
    badgeAr: 'إلى العربية',
    iconColorClass: 'text-sky-400',
    defaultEnabled: true,
  },
  {
    action: 'hint',
    toolId: 'hint',
    labelAr: 'تلميح ذكي',
    labelEn: 'Hint',
    descAr: 'إعطاء تلميح توجيهي دون كشف الحل',
    descEn: 'Smart hint without full solution',
    iconColorClass: 'text-yellow-400',
    defaultEnabled: true,
  },
  {
    action: 'quiz',
    toolId: 'quiz',
    labelAr: 'اختبرني',
    labelEn: 'Quiz Me',
    descAr: 'سؤال تدريبي سريع على هذا الجزء',
    descEn: 'Quick quiz on selected area',
    iconColorClass: 'text-emerald-400',
    defaultEnabled: true,
  },
  {
    action: 'analyze',
    toolId: 'analyze',
    labelAr: 'تحليل المسألة',
    labelEn: 'Analyze Problem',
    descAr: 'استخراج المعطيات والمطلوب وخطوات الحل',
    descEn: 'Analyze math/science problem',
    iconColorClass: 'text-cyan-400',
    defaultEnabled: true,
  },
  {
    action: 'explainFigure',
    toolId: 'explainFigure',
    labelAr: 'شرح الصورة',
    labelEn: 'Explain Figure',
    descAr: 'تحليل الصور والرسوم والجداول والخرائط',
    descEn: 'Explain diagram, map, or figure',
    iconColorClass: 'text-pink-400',
    defaultEnabled: true,
  },
];

const DEFAULT_PREFERENCES: StudentSelectionToolsPreferences = {
  enabledActions: ALL_SELECTION_MENU_TOOLS.filter((t) => t.defaultEnabled).map((t) => t.action),
  orderedActions: ALL_SELECTION_MENU_TOOLS.map((t) => t.action),
  targetLanguageCode: 'ar',
};

export const selectionToolsConfigService = {
  getAllTools(): SelectionMenuToolDefinition[] {
    return ALL_SELECTION_MENU_TOOLS;
  },

  getAvailableTranslationLanguages(): TranslationLanguageOption[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(ADMIN_LANGUAGES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_TRANSLATION_LANGUAGES;
  },

  getPreferences(): StudentSelectionToolsPreferences {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StudentSelectionToolsPreferences>;
          const allActions = ALL_SELECTION_MENU_TOOLS.map((t) => t.action);

          // Ensure any newly added tools (like 'translate') are included in orderedActions
          const savedOrder = Array.isArray(parsed.orderedActions)
            ? parsed.orderedActions.filter((a): a is SelectionActionType => allActions.includes(a))
            : [];
          const missingFromOrder = allActions.filter((a) => !savedOrder.includes(a));
          const orderedActions = [...savedOrder, ...missingFromOrder];

          let enabledActions = Array.isArray(parsed.enabledActions)
            ? parsed.enabledActions.filter((a): a is SelectionActionType => allActions.includes(a))
            : DEFAULT_PREFERENCES.enabledActions;

          // Ensure 'translate' and 'analyze' are enabled if migrating from an older schema
          if (
            Array.isArray(parsed.orderedActions) &&
            !parsed.orderedActions.includes('translate') &&
            !enabledActions.includes('translate')
          ) {
            enabledActions = [...enabledActions, 'translate'];
          }

          if (enabledActions.length === 0) {
            enabledActions = DEFAULT_PREFERENCES.enabledActions;
          }

          return {
            enabledActions,
            orderedActions,
            targetLanguageCode: parsed.targetLanguageCode || 'ar',
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
    return { ...DEFAULT_PREFERENCES };
  },

  savePreferences(prefs: StudentSelectionToolsPreferences): StudentSelectionToolsPreferences {
    const cleanPrefs: StudentSelectionToolsPreferences = {
      ...prefs,
      enabledActions:
        prefs.enabledActions.length > 0 ? prefs.enabledActions : [prefs.orderedActions[0] || 'explain'],
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanPrefs));
      }
    } catch {
      // Ignore storage errors
    }
    return cleanPrefs;
  },

  toggleTool(action: SelectionActionType): StudentSelectionToolsPreferences {
    const current = this.getPreferences();
    const isEnabled = current.enabledActions.includes(action);
    let nextEnabled: SelectionActionType[];

    if (isEnabled) {
      // Keep at least one tool active so the menu is never completely empty
      if (current.enabledActions.length <= 1) {
        return current;
      }
      nextEnabled = current.enabledActions.filter((a) => a !== action);
    } else {
      nextEnabled = [...current.enabledActions, action];
    }

    return this.savePreferences({
      ...current,
      enabledActions: nextEnabled,
    });
  },

  moveToolOrder(action: SelectionActionType, direction: 'up' | 'down'): StudentSelectionToolsPreferences {
    const current = this.getPreferences();
    const list = [...current.orderedActions];
    const index = list.indexOf(action);
    if (index === -1) return current;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return current;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    return this.savePreferences({
      ...current,
      orderedActions: list,
    });
  },

  resetToDefaults(): StudentSelectionToolsPreferences {
    return this.savePreferences({ ...DEFAULT_PREFERENCES });
  },
};
