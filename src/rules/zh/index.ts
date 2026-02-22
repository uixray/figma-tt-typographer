import type { TypographyRule } from '../../core/rule';
import { defineRule } from '../../core/rule';

/** CJK character ranges for detection */
const CJK_RANGE = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff';
const CJK_REGEX = `[${CJK_RANGE}]`;

/** Convert halfwidth punctuation to fullwidth in Chinese context */
const zhFullwidthPunctuation = defineRule({
  id: 'zh/punctuation/fullwidth',
  name: { zh: '全角标点符号', en: 'Fullwidth punctuation', ru: 'Полноширинная пунктуация' },
  locale: 'zh',
  group: 'punctuation',
  enabled: true,
  priority: 30,
  apply(text) {
    let result = text;
    // Only convert punctuation that's adjacent to CJK characters
    const map: Record<string, string> = {
      ',': '，', '.': '。', '!': '！', '?': '？', ';': '；', ':': '：',
      '(': '（', ')': '）',
    };
    for (const [half, full] of Object.entries(map)) {
      // After CJK character
      const escaped = half.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(`(${CJK_REGEX})${escaped}`, 'g'),
        `$1${full}`
      );
      // Before CJK character (for opening brackets)
      if (half === '(') {
        result = result.replace(
          new RegExp(`${escaped}(${CJK_REGEX})`, 'g'),
          `${full}$1`
        );
      }
    }
    return result;
  },
});

/** Chinese quotes: 「...」 and 『...』 */
const zhQuotes = defineRule({
  id: 'zh/quotes/corner',
  name: { zh: '引号「」『』', en: 'Chinese corner quotes', ru: 'Китайские кавычки' },
  locale: 'zh',
  group: 'quotes',
  enabled: true,
  priority: 31,
  apply(text) {
    let result = text;
    // Convert straight quotes to corner brackets in CJK context
    // Double quotes → 「...」
    result = result.replace(/[\u201c""]([^""\u201c\u201d]*?)[\u201d""]/g, '「$1」');
    // If nested → 『...』
    result = result.replace(/「([^「」]*?)「([^「」]*?)」([^「」]*?)」/g, '「$1『$2』$3」');
    return result;
  },
});

/** Add space between CJK and Latin/digit characters */
const zhCjkLatinSpacing = defineRule({
  id: 'zh/spaces/cjk-latin',
  name: { zh: '中西文间距', en: 'CJK-Latin spacing', ru: 'Пробелы между CJK и латиницей' },
  locale: 'zh',
  group: 'spaces',
  enabled: true,
  priority: 50,
  apply(text) {
    let result = text;
    // CJK followed by Latin/digit (no space) → add space
    result = result.replace(
      new RegExp(`(${CJK_REGEX})([a-zA-Z0-9])`, 'g'),
      '$1 $2'
    );
    // Latin/digit followed by CJK (no space) → add space
    result = result.replace(
      new RegExp(`([a-zA-Z0-9])(${CJK_REGEX})`, 'g'),
      '$1 $2'
    );
    return result;
  },
});

/** Normalize fullwidth/halfwidth consistency */
const zhWidthNormalize = defineRule({
  id: 'zh/width/normalize',
  name: { zh: '全角半角规范化', en: 'Width normalization', ru: 'Нормализация ширины' },
  locale: 'zh',
  group: 'width',
  enabled: true,
  priority: 25,
  apply(text) {
    let result = text;
    // Fullwidth digits → halfwidth (fullwidth digits are rarely desired)
    result = result.replace(/[\uff10-\uff19]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    // Fullwidth Latin letters → halfwidth
    result = result.replace(/[\uff21-\uff3a\uff41-\uff5a]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    return result;
  },
});

export const zhRules: TypographyRule[] = [
  zhWidthNormalize,
  zhFullwidthPunctuation,
  zhQuotes,
  zhCjkLatinSpacing,
];
