import type { TypographyRule } from '../../core/rule';
import { defineRule } from '../../core/rule';
import { isProtected } from '../../core/engine';

const NBSP = '\u00A0';

/** English curly quotes with nesting: "..." and '...' */
const enQuotes = defineRule({
  id: 'en/quotes/curly',
  name: { en: 'Curly quotes \u201c\u201d \u2018\u2019', ru: 'Английские кавычки \u201c\u201d \u2018\u2019' },
  locale: 'en',
  group: 'quotes',
  enabled: true,
  priority: 30,
  apply(text) {
    let result = text;
    // Double quotes: "..." → \u201c...\u201d
    result = result.replace(/[\u201c\u201d]/g, '"'); // normalize first
    result = result.replace(/(^|[\s(\[{])"(?=\S)/gm, '$1\u201c');
    result = result.replace(/"(?=[\s)\]},;:!?.]|$)/gm, '\u201d');
    // Remaining unmatched opening/closing
    result = result.replace(/(^|[\s(\[{])"/gm, '$1\u201c');
    result = result.replace(/"/g, '\u201d');

    // Single quotes / apostrophes: don't → don\u2019t, 'word' → \u2018word\u2019
    // Apostrophes in contractions
    result = result.replace(/(\w)'(\w)/g, '$1\u2019$2');
    // Opening single quote
    result = result.replace(/(^|[\s(\[{])'(?=\S)/gm, '$1\u2018');
    // Closing single quote
    result = result.replace(/'(?=[\s)\]},;:!?.]|$)/gm, '\u2019');

    return result;
  },
});

/** -- → em-dash, number ranges → en-dash */
const enDashes = defineRule({
  id: 'en/dashes/smart',
  name: { en: 'Smart dashes \u2014 \u2013', ru: 'Умные тире' },
  locale: 'en',
  group: 'dashes',
  enabled: true,
  priority: 35,
  apply(text) {
    let result = text;
    // -- or --- → em-dash
    result = result.replace(/---?/g, '\u2014');
    // Number ranges: 1-5 → 1\u20135
    result = result.replace(/(\d+)\s*-\s*(\d+)/g, '$1\u2013$2');
    return result;
  },
});

/** Non-breaking space after articles and short prepositions */
const enShortWords = defineRule({
  id: 'en/spaces/shortwords',
  name: { en: 'Non-breaking space after articles', ru: 'Неразрывный пробел после артиклей' },
  locale: 'en',
  group: 'spaces',
  enabled: true,
  priority: 50,
  apply(text) {
    const words = ['a', 'an', 'the', 'at', 'by', 'for', 'in', 'of', 'on', 'to', 'or', 'if', 'is'];
    const pattern = words.join('|');
    let result = text;
    const regex = new RegExp(`(^|\\s)(${pattern})\\s`, 'gi');
    for (let i = 0; i < 2; i++) {
      result = result.replace(regex, `$1$2${NBSP}`);
    }
    return result;
  },
});

/** Non-breaking space before units */
const enUnits = defineRule({
  id: 'en/spaces/units',
  name: { en: 'Non-breaking space before units', ru: 'Неразрывный пробел перед единицами' },
  locale: 'en',
  group: 'spaces',
  enabled: true,
  priority: 54,
  apply(text) {
    // Common units
    const units = ['kg', 'km', 'cm', 'mm', 'ml', 'lb', 'oz', 'ft', 'in', 'mi', 'mph', 'GB', 'MB', 'KB', 'TB'];
    const pattern = units.join('|');
    return text.replace(new RegExp(`(\\d)\\s+(${pattern})\\b`, 'g'), `$1${NBSP}$2`);
  },
});

/** Percentage: non-breaking space before % (or no space, depending on style) */
const enPercent = defineRule({
  id: 'en/numbers/percent',
  name: { en: 'Percentage formatting', ru: 'Процент' },
  locale: 'en',
  group: 'numbers',
  enabled: true,
  priority: 64,
  apply(text) {
    // English style: no space before % (10%)
    return text.replace(/(\d)\s+%/g, '$1%');
  },
});

/** Prevent orphaned short words at end of lines */
const enHanging = defineRule({
  id: 'en/spaces/hanging',
  name: { en: 'Prevent hanging lines', ru: 'Предотвращение висячих строк' },
  locale: 'en',
  group: 'spaces',
  enabled: true,
  priority: 90,
  apply(text) {
    return text.replace(/(\S+)\s([a-zA-Z-]{1,3}[.,!?]?)$/gm, `$1${NBSP}$2`);
  },
});

export const enRules: TypographyRule[] = [
  enQuotes,
  enDashes,
  enShortWords,
  enUnits,
  enPercent,
  enHanging,
];
