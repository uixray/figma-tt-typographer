import { defineRule } from '../../core/rule';

/** Number ranges: 1 - 5 → 1–5 (en-dash) */
export const ruEnDash = defineRule({
  id: 'ru/dashes/endash',
  name: { ru: 'Короткое тире в диапазонах', en: 'En-dash in ranges' },
  locale: 'ru',
  group: 'dashes',
  enabled: true,
  priority: 35,
  apply(text) {
    let result = text;
    // Number ranges: 1 - 5, 1-5 → 1–5
    result = result.replace(/(\d+)\s*-\s*(\d+)/g, '$1–$2');
    // Roman numeral ranges: I - V → I–V
    result = result.replace(/([IVXLCDM]+)\s*-\s*([IVXLCDM]+)/g, '$1–$2');
    return result;
  },
});

/** Phrase dashes: " - " → " — " (em-dash) */
export const ruEmDash = defineRule({
  id: 'ru/dashes/emdash',
  name: { ru: 'Длинное тире', en: 'Em-dash' },
  locale: 'ru',
  group: 'dashes',
  enabled: true,
  priority: 36,
  apply(text) {
    // Replace " - " with " — " (space-hyphen-space → space-emdash-space)
    // But not at line start (which could be a list marker)
    return text.replace(/(?<=\S) - (?=\S)/g, ' — ');
  },
});
