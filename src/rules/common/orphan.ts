import { defineRule } from '../../core/rule';

/**
 * Anti-orphan rule: glue last 2 words on each line with non-breaking space.
 * Prevents a single short word from wrapping to the last line alone.
 * This emulates CSS `text-wrap: pretty`.
 *
 * Priority 900 ensures this runs LAST, after all other rules,
 * so inserted NBSP characters are not stripped by earlier rules.
 */
export const nbspOrphan = defineRule({
  id: 'common/layout/orphan',
  name: {
    ru: 'Висячие строки (NBSP)',
    en: 'Orphan lines (NBSP)',
    fr: 'Lignes orphelines (NBSP)',
    zh: '孤行防护 (NBSP)',
    ja: '孤立行防止 (NBSP)',
  },
  locale: 'common',
  group: 'layout',
  enabled: false, // Off by default — enabled via balance settings
  priority: 900,
  apply(text) {
    return text
      .split('\n')
      .map(line => {
        // Split on regular spaces only (preserve existing NBSP)
        const trimmed = line.trimEnd();
        const trailingWs = line.slice(trimmed.length);
        const tokens = trimmed.split(' ');

        // Need at least 3 words to glue last 2
        if (tokens.length < 3) return line;

        // Extract last 2 tokens and join with NBSP
        const tail = tokens.splice(-2);
        return tokens.join(' ') + ' ' + tail.join('\u00A0') + trailingWs;
      })
      .join('\n');
  },
});
