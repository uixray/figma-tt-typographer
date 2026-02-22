import { defineRule } from '../../core/rule';

const NBSP = '\u00A0';

/** Prevent orphaned short words at the end of lines */
export const ruHanging = defineRule({
  id: 'ru/spaces/hanging',
  name: { ru: 'Предотвращение висячих строк', en: 'Prevent hanging lines' },
  locale: 'ru',
  group: 'spaces',
  enabled: true,
  priority: 90, // Run late, after other space rules
  apply(text) {
    // Replace space before short word (1-3 Cyrillic chars) at end of line
    return text.replace(/(\S+)\s([а-яА-ЯёЁ-]{1,3}[.,!?…]?)$/gm, `$1${NBSP}$2`);
  },
});
