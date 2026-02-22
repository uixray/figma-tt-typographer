import { defineRule } from '../../core/rule';

const NBSP = '\u00A0';  // Non-breaking space
const THIN = '\u2009';  // Thin space

/**
 * Short Russian words (prepositions, conjunctions, particles)
 * that should be followed by a non-breaking space.
 */
const SHORT_WORDS = [
  'а', 'б', 'без', 'безо', 'будто', 'бы', 'в', 'во', 'ведь', 'вне', 'вот',
  'где', 'да', 'даже', 'для', 'до', 'если', 'есть', 'ж', 'же', 'за',
  'и', 'из', 'изо', 'из-за', 'из-под', 'или', 'иль', 'к', 'ко', 'как',
  'ли', 'ль', 'либо', 'между', 'на', 'над', 'надо', 'не', 'ни', 'но',
  'о', 'об', 'обо', 'около', 'от', 'ото', 'перед', 'по', 'по-за', 'по-над',
  'под', 'подо', 'после', 'при', 'про', 'ради', 'с', 'со', 'сквозь',
  'так', 'также', 'там', 'тем', 'то', 'тогда', 'того', 'тоже',
  'у', 'хоть', 'хотя', 'чего', 'через', 'что', 'чтобы', 'это',
];

/** Address and measurement abbreviations followed by non-breaking space after dot */
const ABBREVIATIONS = [
  'г', 'обл', 'кр', 'ст', 'пос', 'с', 'д', 'ул', 'пер', 'пр', 'пр-т',
  'просп', 'пл', 'бул', 'б-р', 'наб', 'ш', 'туп', 'оф', 'кв', 'комн',
  'под', 'мкр', 'уч', 'вл', 'влад', 'стр', 'корп', 'литер', 'эт', 'пгт',
  'гл', 'рис', 'илл', 'п', 'c',
];

/** Symbols that require non-breaking space after them */
const SYMBOLS = ['№', '§', 'АО', 'ОАО', 'ЗАО', 'ООО', 'ПАО'];

/** Non-breaking space after short words */
export const ruShortWords = defineRule({
  id: 'ru/spaces/shortwords',
  name: { ru: 'Неразрывный пробел после предлогов', en: 'Non-breaking space after prepositions' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 50,
  apply(text) {
    let result = text;
    const shortWordsPattern = SHORT_WORDS.map(w => w.replace(/-/g, '\\-')).join('|');
    // Apply multiple passes to handle chains like "в то же время"
    // First pass: standard \s before short word
    result = result.replace(
      new RegExp(`((?:^|\\s)(?:${shortWordsPattern})) `, 'gi'),
      `$1${NBSP}`
    );
    // Subsequent passes: also match NBSP before short word (from previous pass)
    for (let i = 0; i < 2; i++) {
      result = result.replace(
        new RegExp(`((?:^|[\\s${NBSP}])(?:${shortWordsPattern})) `, 'gi'),
        `$1${NBSP}`
      );
    }
    return result;
  },
});

/** Non-breaking space before em-dash */
export const ruEmDashSpace = defineRule({
  id: 'ru/spaces/emdash',
  name: { ru: 'Неразрывный пробел перед тире', en: 'Non-breaking space before em-dash' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 51,
  apply(text) {
    return text.replace(/ —/g, `${NBSP}—`);
  },
});

/** Initials formatting: А. Б. Иванов → А.Б.\u00A0Иванов */
export const ruInitials = defineRule({
  id: 'ru/spaces/initials',
  name: { ru: 'Инициалы', en: 'Initials formatting' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 52,
  apply(text) {
    let result = text;
    // И. О. Фамилия
    result = result.replace(/([А-Я]\.)\s*([А-Я]\.)\s+([А-Я][а-яёЁ-]+)/g, `$1$2${NBSP}$3`);
    // Фамилия И. О.
    result = result.replace(/([А-Я][а-яёЁ-]+)\s+([А-Я]\.)\s*([А-Я]\.)/g, `$1${NBSP}$2$3`);
    return result;
  },
});

/** Common abbreviation patterns: "и т.д.", "и т.п.", "и др." */
export const ruAbbreviationPatterns = defineRule({
  id: 'ru/spaces/abbr-patterns',
  name: { ru: 'Сокращения (и т.д., и т.п.)', en: 'Abbreviation patterns' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 53,
  apply(text) {
    return text.replace(/\s(и\sт\.д\.|и\sт\.п\.|и\sдр\.)/gi, `${NBSP}$1`);
  },
});

/** Non-breaking space between digits and Cyrillic units */
export const ruDigitsUnits = defineRule({
  id: 'ru/spaces/digits-units',
  name: { ru: 'Число + единица (5\u00A0кг)', en: 'Number + unit' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 54,
  apply(text) {
    return text.replace(/(\d)\s+([а-яА-ЯёЁ§№]+)/g, `$1${NBSP}$2`);
  },
});

/** Abbreviations followed by dot then non-breaking space: "г.\u00A0Москва" */
export const ruDotAbbreviations = defineRule({
  id: 'ru/spaces/dot-abbr',
  name: { ru: 'Сокращения с точкой (г.\u00A0Москва)', en: 'Dot abbreviations' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 55,
  apply(text) {
    const abbrPattern = ABBREVIATIONS.map(a => a.replace(/-/g, '\\-')).join('|');
    return text.replace(
      new RegExp(`(^|\\s)(${abbrPattern})\\.\\s`, 'gi'),
      `$1$2.${NBSP}`
    );
  },
});

/** Symbols (№, §, ООО, etc.) followed by non-breaking space */
export const ruSymbolSpaces = defineRule({
  id: 'ru/spaces/symbols',
  name: { ru: 'Символы (№, §, ООО)', en: 'Symbol spaces' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 56,
  apply(text) {
    const symbolPattern = SYMBOLS.join('|');
    return text.replace(
      new RegExp(`(^|\\s)(${symbolPattern})\\s`, 'gi'),
      `$1$2${NBSP}`
    );
  },
});

/** Clean up spaces around brackets and punctuation */
export const ruBracketSpaces = defineRule({
  id: 'ru/spaces/brackets',
  name: { ru: 'Пробелы у скобок и пунктуации', en: 'Bracket/punctuation spaces' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 48,
  apply(text) {
    let result = text;
    // Remove space after opening brackets/quotes
    result = result.replace(/([«„(\[])\s+/g, '$1');
    // Remove space before closing punctuation
    result = result.replace(/\s+([.…:,;?!»")\]])/g, '$1');
    return result;
  },
});
