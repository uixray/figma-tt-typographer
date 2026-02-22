import type { TypographyRule } from '../../core/rule';
import { defineRule } from '../../core/rule';

/** Remove multiple consecutive spaces (but not non-breaking spaces) */
const removeDoubleSpaces = defineRule({
  id: 'common/spaces/double',
  name: { ru: 'Удаление двойных пробелов', en: 'Remove double spaces', fr: 'Supprimer les doubles espaces', zh: '删除多余空格', ja: '二重スペースの削除' },
  locale: 'common',
  group: 'spaces',
  enabled: true,
  priority: 10,
  apply(text) {
    return text.replace(/ {2,}/g, ' ');
  },
});

/** (c) → ©, (r) → ®, (tm) → ™ */
const specialSymbols = defineRule({
  id: 'common/special/symbols',
  name: { ru: 'Спецсимволы ©®™', en: 'Special symbols ©®™', fr: 'Symboles spéciaux ©®™', zh: '特殊符号 ©®™', ja: '特殊記号 ©®™' },
  locale: 'common',
  group: 'special',
  enabled: true,
  priority: 20,
  apply(text) {
    return text
      .replace(/\(c\)/gi, '©')
      .replace(/\(r\)/gi, '®')
      .replace(/\(tm\)/gi, '™');
  },
});

/** +- → ± */
const plusMinus = defineRule({
  id: 'common/special/plusminus',
  name: { ru: 'Плюс-минус ±', en: 'Plus-minus ±', fr: 'Plus-moins ±', zh: '正负号 ±', ja: 'プラスマイナス ±' },
  locale: 'common',
  group: 'special',
  enabled: true,
  priority: 21,
  apply(text) {
    return text.replace(/\+-/g, '±');
  },
});

/** ... or .. → … (ellipsis) */
const ellipsis = defineRule({
  id: 'common/punctuation/ellipsis',
  name: { ru: 'Многоточие …', en: 'Ellipsis …', fr: 'Points de suspension …', zh: '省略号 …', ja: '省略記号 …' },
  locale: 'common',
  group: 'punctuation',
  enabled: true,
  priority: 15,
  apply(text) {
    return text.replace(/\.{2,}/g, '…');
  },
});

/** Remove duplicate punctuation: ?? → ?, !! → !, ;; → ; etc. Fix ?! order */
const duplicatePunctuation = defineRule({
  id: 'common/punctuation/duplicates',
  name: { ru: 'Дублирующаяся пунктуация', en: 'Duplicate punctuation', fr: 'Ponctuation en double', zh: '重复标点', ja: '重複句読点' },
  locale: 'common',
  group: 'punctuation',
  enabled: true,
  priority: 12,
  apply(text) {
    let result = text;
    // Normalize ?! and !? to ?!
    result = result.replace(/\s*!+\s*\?+/g, '?!').replace(/\s*\?+\s*!+/g, '?!');
    // Remove duplicate punctuation (but keep ?! as is)
    result = result.replace(/([?!,;:])\1+/g, '$1');
    return result;
  },
});

export const commonRules: TypographyRule[] = [
  removeDoubleSpaces,
  specialSymbols,
  plusMinus,
  ellipsis,
  duplicatePunctuation,
];
