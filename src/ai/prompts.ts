import type { Locale } from '../core/rule';

export type AiMode = 'typography' | 'proofread' | 'style' | 'custom';

interface PromptTemplate {
  system: string;
  user: (text: string) => string;
}

const TYPOGRAPHY_PROMPT: Record<string, PromptTemplate> = {
  ru: {
    system: `Ты — профессиональный типограф. Исправь типографику текста по правилам русского набора:
1. Замени прямые кавычки на «ёлочки» (внешние) и „лапки" (внутренние)
2. Замени дефисы на тире (— для пауз в предложениях, – для диапазонов чисел)
3. Расставь неразрывные пробелы (\\u00A0) после предлогов и перед тире
4. Исправь букву «ё» в словах, где она необходима по контексту
5. Многоточие: замени ... на символ …
6. Не меняй смысл текста, не добавляй и не удаляй слова.
Верни ТОЛЬКО исправленный текст, без пояснений и комментариев.`,
    user: (text: string) => text,
  },
  en: {
    system: `You are a professional typographer. Fix the typography of the text following English typesetting rules:
1. Replace straight quotes with curly quotes (\u201c...\u201d and \u2018...\u2019)
2. Replace hyphens used as dashes with em-dashes (\u2014) or en-dashes (\u2013 for ranges)
3. Fix apostrophes: use \u2019 instead of '
4. Replace ... with ellipsis character \u2026
5. Do NOT change the meaning, add, or remove words.
Return ONLY the corrected text, without explanations.`,
    user: (text: string) => text,
  },
  fr: {
    system: `Tu es un typographe professionnel. Corrige la typographie du texte selon les règles françaises :
1. Guillemets : «\\u202Ftexte\\u202F» avec espaces fines insécables
2. Espaces insécables (\\u202F) avant ; : ! ?
3. Tirets demi-cadratins (\\u2013) avec espaces insécables
4. Ligatures : cœur, œuvre, etc.
5. Ne change pas le sens du texte.
Renvoie UNIQUEMENT le texte corrigé, sans explication.`,
    user: (text: string) => text,
  },
  zh: {
    system: `你是一位专业的排版师。请按照中文排版规则修正文本的排版：
1. 将半角标点替换为全角标点（，。！？；：）
2. 在中文和英文/数字之间添加空格
3. 使用正确的引号：「」和『』
4. 不要改变文本的意思。
只返回修正后的文本，不要解释。`,
    user: (text: string) => text,
  },
  ja: {
    system: `あなたはプロの組版技術者です。以下の日本語テキストの組版を修正してください：
1. 句読点：、と。を使用
2. 鉤括弧：「」と『』
3. 和欧間にスペースを入れる
4. テキストの意味を変えないでください。
修正されたテキストのみを返してください。説明は不要です。`,
    user: (text: string) => text,
  },
};

const PROOFREAD_PROMPT: Record<string, PromptTemplate> = {
  ru: {
    system: `Ты — профессиональный корректор. Исправь орфографические и пунктуационные ошибки в тексте.
Также примени правила русской типографики (кавычки, тире, ё).
Не меняй стиль и смысл текста. Верни ТОЛЬКО исправленный текст.`,
    user: (text: string) => text,
  },
  en: {
    system: `You are a professional proofreader. Fix spelling and punctuation errors in the text.
Also apply proper English typography (curly quotes, dashes, ellipsis).
Do not change the style or meaning. Return ONLY the corrected text.`,
    user: (text: string) => text,
  },
};

const STYLE_PROMPTS: Record<string, Record<string, PromptTemplate>> = {
  formal: {
    ru: {
      system: `Перепиши текст в формальном деловом стиле, сохраняя смысл. Применяй правила русской типографики. Верни ТОЛЬКО переписанный текст.`,
      user: (text: string) => text,
    },
    en: {
      system: `Rewrite the text in a formal business style while preserving meaning. Apply proper English typography. Return ONLY the rewritten text.`,
      user: (text: string) => text,
    },
  },
  casual: {
    ru: {
      system: `Перепиши текст в дружелюбном разговорном стиле, сохраняя смысл. Применяй правила русской типографики. Верни ТОЛЬКО переписанный текст.`,
      user: (text: string) => text,
    },
    en: {
      system: `Rewrite the text in a friendly casual style while preserving meaning. Apply proper English typography. Return ONLY the rewritten text.`,
      user: (text: string) => text,
    },
  },
  marketing: {
    ru: {
      system: `Перепиши текст в маркетинговом стиле — убедительно и привлекательно. Сохрани основной смысл. Применяй русскую типографику. Верни ТОЛЬКО переписанный текст.`,
      user: (text: string) => text,
    },
    en: {
      system: `Rewrite the text in a marketing style — persuasive and engaging. Keep the core meaning. Apply proper typography. Return ONLY the rewritten text.`,
      user: (text: string) => text,
    },
  },
};

/** Get prompt template for the given mode and locale */
export function getPrompt(
  mode: AiMode,
  locale: Locale,
  styleVariant?: string
): PromptTemplate {
  const lang = locale === 'common' ? 'en' : locale;

  switch (mode) {
    case 'typography':
      return TYPOGRAPHY_PROMPT[lang] || TYPOGRAPHY_PROMPT.en;
    case 'proofread':
      return PROOFREAD_PROMPT[lang] || PROOFREAD_PROMPT.en;
    case 'style': {
      const variant = styleVariant || 'formal';
      const variants = STYLE_PROMPTS[variant] || STYLE_PROMPTS.formal;
      return variants[lang] || variants.en;
    }
    case 'custom':
      // Custom mode uses user-provided prompt
      return {
        system: '',
        user: (text: string) => text,
      };
  }
}
