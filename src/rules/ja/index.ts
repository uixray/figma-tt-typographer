import type { TypographyRule } from '../../core/rule';
import { defineRule } from '../../core/rule';

/** CJK + Hiragana/Katakana ranges */
const CJK_RANGE = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff';
const HIRA_RANGE = '\\u3040-\\u309f';
const KATA_RANGE = '\\u30a0-\\u30ff';
const JA_CHAR = `[${CJK_RANGE}${HIRA_RANGE}${KATA_RANGE}]`;

/** Japanese fullwidth punctuation: 、 and 。 */
const jaFullwidthPunctuation = defineRule({
  id: 'ja/punctuation/fullwidth',
  name: { ja: '全角句読点', en: 'Fullwidth punctuation', ru: 'Полноширинная пунктуация' },
  locale: 'ja',
  group: 'punctuation',
  enabled: true,
  priority: 30,
  apply(text) {
    let result = text;
    // Comma after Japanese chars → 、
    result = result.replace(new RegExp(`(${JA_CHAR}),`, 'g'), '$1、');
    // Period after Japanese chars → 。
    result = result.replace(new RegExp(`(${JA_CHAR})\\.(?!\\d)`, 'g'), '$1。');
    // Fullwidth ! and ?
    result = result.replace(new RegExp(`(${JA_CHAR})!`, 'g'), '$1！');
    result = result.replace(new RegExp(`(${JA_CHAR})\\?`, 'g'), '$1？');
    return result;
  },
});

/** Japanese quotes: 「...」 and 『...』 */
const jaQuotes = defineRule({
  id: 'ja/quotes/corner',
  name: { ja: '鉤括弧「」『』', en: 'Japanese corner quotes', ru: 'Японские кавычки' },
  locale: 'ja',
  group: 'quotes',
  enabled: true,
  priority: 31,
  apply(text) {
    let result = text;
    // Convert straight/curly quotes near Japanese text to corner brackets
    result = result.replace(/[\u201c""]([^""\u201c\u201d]*?)[\u201d""]/g, '「$1」');
    result = result.replace(/「([^「」]*?)「([^「」]*?)」([^「」]*?)」/g, '「$1『$2』$3」');
    return result;
  },
});

/** Add space between Japanese and Latin characters */
const jaCjkLatinSpacing = defineRule({
  id: 'ja/spaces/cjk-latin',
  name: { ja: '和欧間スペース', en: 'Japanese-Latin spacing', ru: 'Пробелы между японским и латиницей' },
  locale: 'ja',
  group: 'spaces',
  enabled: true,
  priority: 50,
  apply(text) {
    let result = text;
    // Japanese char followed by Latin/digit → add space
    result = result.replace(new RegExp(`(${JA_CHAR})([a-zA-Z0-9])`, 'g'), '$1 $2');
    // Latin/digit followed by Japanese char → add space
    result = result.replace(new RegExp(`([a-zA-Z0-9])(${JA_CHAR})`, 'g'), '$1 $2');
    return result;
  },
});

/**
 * Kinsoku processing (禁則処理): prevent certain characters from
 * starting or ending a line. Since Figma handles line breaking,
 * we add non-breaking spaces to keep prohibited chars attached.
 */
const jaKinsoku = defineRule({
  id: 'ja/punctuation/kinsoku',
  name: { ja: '禁則処理', en: 'Kinsoku line break rules', ru: 'Кинсоку (правила переноса)' },
  locale: 'ja',
  group: 'punctuation',
  enabled: true,
  priority: 90,
  apply(text) {
    let result = text;
    // Characters that must not start a line (closing marks, punctuation)
    const noStart = '、。，．・：；！？）」』】〉》〕｝〙〛»\u2019\u201d';
    // Add non-breaking space between content and these chars to prevent line break
    for (const ch of noStart) {
      const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // If there's a regular space before this char, make it non-breaking
      result = result.replace(new RegExp(` (${escaped})`, 'g'), `\u00A0$1`);
    }
    return result;
  },
});

/** Fullwidth width normalization (digits and Latin to halfwidth) */
const jaWidthNormalize = defineRule({
  id: 'ja/width/normalize',
  name: { ja: '全角半角正規化', en: 'Width normalization', ru: 'Нормализация ширины' },
  locale: 'ja',
  group: 'width',
  enabled: true,
  priority: 25,
  apply(text) {
    let result = text;
    // Fullwidth digits → halfwidth
    result = result.replace(/[\uff10-\uff19]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    // Fullwidth Latin → halfwidth
    result = result.replace(/[\uff21-\uff3a\uff41-\uff5a]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    return result;
  },
});

export const jaRules: TypographyRule[] = [
  jaWidthNormalize,
  jaFullwidthPunctuation,
  jaQuotes,
  jaCjkLatinSpacing,
  jaKinsoku,
];
