import { defineRule } from '../../core/rule';
import type { RuleContext } from '../../core/rule';
import { isProtected } from '../../core/engine';

const NBSP = '\u00A0';
const THIN = '\u2009';

/**
 * Russian currency formatting.
 * FIX for Б5: requires digit before currency abbreviation to avoid "р. Волга" → "₽ Волга"
 */
export const ruCurrency = defineRule({
  id: 'ru/currency/format',
  name: { ru: 'Валюта (₽, $, €)', en: 'Currency formatting' },
  locale: 'ru',
  group: 'currency',
  enabled: true,
  priority: 60,
  apply(text) {
    let result = text;

    // "15 р. 50 коп." → "15,50 ₽"
    result = result.replace(
      /(\d+)\s*(?:р\.|руб\.?)\s*(\d{1,2})\s*коп\.?/gi,
      (_, r, k) => `${r},${k.padStart(2, '0')}${NBSP}₽`
    );

    // Currency abbreviations — ONLY when preceded by a digit
    // FIX: "р" alone is NOT replaced (could be "река")
    // Note: \b doesn't work with Cyrillic, so we use \s* to consume trailing space
    result = result.replace(/(\d+)\s*(руб\.?)\s*/gi, `$1${NBSP}₽`);
    result = result.replace(/(\d+)\s*(RUR|RUB)\b/gi, `$1${NBSP}₽`);
    result = result.replace(/(\d+)\s*р\./g, `$1${NBSP}₽`);  // "100 р." but not "р. Волга"
    result = result.replace(/(\d)\s*USD\b/gi, `$1${NBSP}$`);
    result = result.replace(/(\d)\s*EUR\b/gi, `$1${NBSP}€`);

    // Non-breaking space before/after currency symbols
    result = result.replace(/(\d)\s*([$€₽])/g, `$1${NBSP}$2`);

    return result;
  },
});

/**
 * Decimal separator: dot → comma for Russian locale.
 * FIX for Б3: skip protected ranges (URLs, IPs, version numbers)
 */
export const ruDecimals = defineRule({
  id: 'ru/numbers/decimals',
  name: { ru: 'Десятичная запятая (3,14)', en: 'Decimal comma' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 62,
  apply(text, ctx) {
    // Replace decimal dots, but only when:
    // 1. Not in a protected range (URL, IP, version)
    // 2. Surrounded by exactly digits (not part of a longer dotted sequence like 1.2.3)
    return text.replace(/(\d)\.(\d)/g, (match, d1, d2, offset) => {
      // Check if this position is protected
      if (isProtected(offset, ctx.protectedRanges)) return match;

      // Check if this is part of a multi-dot pattern (like 1.2.3 or 192.168.1.1)
      // Look ahead: is there another dot-digit after?
      const afterPos = offset + match.length;
      if (afterPos < text.length && text[afterPos] === '.') return match;
      // Look behind: is there a digit-dot before?
      if (offset >= 2 && text[offset - 1] === '.' && /\d/.test(text[offset - 2])) return match;

      return `${d1},${d2}`;
    });
  },
});

/** Thousands separator: thin space */
export const ruThousands = defineRule({
  id: 'ru/numbers/thousands',
  name: { ru: 'Разделитель тысяч (1\u2009000)', en: 'Thousands separator' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 63,
  apply(text, ctx) {
    return text.replace(/(\d)(?=(?:\d{3})+(?![,.\d]))/g, (match, d1, offset) => {
      if (isProtected(offset, ctx.protectedRanges)) return match;
      return `${d1}${THIN}`;
    });
  },
});

/** Percentage: non-breaking thin space before % */
export const ruPercent = defineRule({
  id: 'ru/numbers/percent',
  name: { ru: 'Процент (10\u2009%)', en: 'Percentage' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 64,
  apply(text) {
    return text.replace(/(\d+)\s*%/g, `$1${THIN}%`);
  },
});

/** Abbreviations: тыс → тыс., млн/млрд/трлн without dot */
export const ruNumberAbbr = defineRule({
  id: 'ru/numbers/abbreviations',
  name: { ru: 'Сокращения (тыс., млн)', en: 'Number abbreviations' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 65,
  apply(text) {
    let result = text;
    result = result.replace(/\b(тыс)(?![.\w])/gi, '$1.');
    result = result.replace(/\b(млн|млрд|трлн)\./gi, '$1');
    return result;
  },
});

/**
 * Multiplication sign: digit x digit → digit × digit.
 * FIX for Б4: only match when both sides are digits and not part of hex (0x1F)
 */
export const ruMultiplication = defineRule({
  id: 'ru/numbers/multiplication',
  name: { ru: 'Знак умножения (×)', en: 'Multiplication sign' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 61,
  apply(text) {
    // Only replace x/х between multi-digit numbers, not in hex codes (0x...)
    // Using \d{2,} ensures single-digit "0" in "0x1F" doesn't match
    return text.replace(/\b(\d{2,})\s*[xх]\s*(\d+)\b/gi, '$1×$2');
  },
});

/**
 * Temperature formatting.
 * FIX for Б8: only match °C pattern, require degree context
 */
export const ruTemperature = defineRule({
  id: 'ru/numbers/temperature',
  name: { ru: 'Температура (°C)', en: 'Temperature formatting' },
  locale: 'ru',
  group: 'numbers',
  enabled: true,
  priority: 66,
  apply(text) {
    let result = text;
    // Only match when C is immediately after optional space and digits, and NOT followed by letters
    // "20 C" → "20\u00A0°C" but NOT "100 Calories"
    result = result.replace(/([+-]?\d+)\s*°?\s*C(?![a-zA-Zа-яА-ЯёЁ])/g, `$1${NBSP}°C`);
    // "градусов/градуса/градус" → °
    result = result.replace(/(\d+)\s*(градусов|градуса|градус)\b/gi, '$1°');
    return result;
  },
});
