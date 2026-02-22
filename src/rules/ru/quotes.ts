import { defineRule } from '../../core/rule';

/**
 * Russian quotes: « » (guillemets) for outer level, „ " (low-high) for inner.
 * Handles nested quotes properly per GOST.
 */
export const ruQuotes = defineRule({
  id: 'ru/quotes/guillemets',
  name: { ru: 'Кавычки «ёлочки» и „лапки"', en: 'Russian quotes «» „"' },
  locale: 'ru',
  group: 'quotes',
  enabled: true,
  priority: 30,
  apply(text) {
    let result = text;

    // First normalize all fancy quotes to straight quotes for uniform processing
    result = result.replace(/[«»„"""\u201c\u201d\u201e]/g, '"');

    // Now process quotes with nesting awareness
    const chars = [...result];
    const output: string[] = [];
    let depth = 0;

    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '"') {
        // Determine if this is an opening or closing quote
        const before = i > 0 ? chars[i - 1] : ' ';
        const after = i < chars.length - 1 ? chars[i + 1] : ' ';

        // Opening quote: after whitespace, start of string, or opening bracket
        const isOpening = /[\s(\[{]/.test(before) || i === 0;
        // Also opening if after another opening quote
        const isOpeningAfterQuote = before === '«' || before === '„';

        if (isOpening || isOpeningAfterQuote) {
          // Opening quote
          if (depth === 0) {
            output.push('«');
          } else {
            output.push('„');
          }
          depth++;
        } else {
          // Closing quote
          depth--;
          if (depth <= 0) {
            output.push('»');
            depth = 0;
          } else {
            output.push('"');
          }
        }
      } else {
        output.push(chars[i]);
      }
    }

    return output.join('');
  },
});
