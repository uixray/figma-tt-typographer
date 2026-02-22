import { defineRule } from '../../core/rule';

/**
 * Expanded yo-fication dictionary.
 * Only includes unambiguous cases where «ё» is always correct.
 * Ambiguous cases like «все/всё» are excluded — they need AI context.
 */
const YO_DICTIONARY: Record<string, string> = {
  // Unambiguous words (ё is always correct)
  'еще': 'ещё',
  'моем': 'моём',
  'твоем': 'твоём',
  'своем': 'своём',
  'чем': 'чём',  // only in "ни при чём", context-dependent — keep simple cases
  'елка': 'ёлка',
  'елки': 'ёлки',
  'елку': 'ёлку',
  'елкой': 'ёлкой',
  'елке': 'ёлке',
  'елок': 'ёлок',
  'елочка': 'ёлочка',
  'елочки': 'ёлочки',
  'елочку': 'ёлочку',
  'берёза': 'берёза', // already correct, skip
  'мед': 'мёд',
  'меда': 'мёда',
  'медом': 'мёдом',
  'лед': 'лёд',
  'льда': 'льда', // no ё here
  'лен': 'лён',
  'шел': 'шёл',
  'шла': 'шла', // no ё
  'зеленый': 'зелёный',
  'зеленая': 'зелёная',
  'зеленое': 'зелёное',
  'зеленые': 'зелёные',
  'черный': 'чёрный',
  'черная': 'чёрная',
  'черное': 'чёрное',
  'черные': 'чёрные',
  'желтый': 'жёлтый',
  'желтая': 'жёлтая',
  'желтое': 'жёлтое',
  'желтые': 'жёлтые',
  'тёмный': 'тёмный',
  'темный': 'тёмный',
  'темная': 'тёмная',
  'темное': 'тёмное',
  'темные': 'тёмные',
  'ребенок': 'ребёнок',
  'ребенка': 'ребёнка',
  'ребенку': 'ребёнку',
  'ребенком': 'ребёнком',
  'приём': 'приём',
  'прием': 'приём',
  'приема': 'приёма',
  'приему': 'приёму',
  'приемом': 'приёмом',
  'подъем': 'подъём',
  'подъема': 'подъёма',
  'учет': 'учёт',
  'учета': 'учёта',
  'учетом': 'учётом',
  'ученый': 'учёный',
  'ученого': 'учёного',
  'расчет': 'расчёт',
  'расчета': 'расчёта',
  'расчетом': 'расчётом',
  'счет': 'счёт',
  'счета': 'счёта',
  'полет': 'полёт',
  'полета': 'полёта',
  'самолет': 'самолёт',
  'самолета': 'самолёта',
  'трех': 'трёх',
  'трехкомнатный': 'трёхкомнатный',
  'четырех': 'четырёх',
  'идет': 'идёт',
  'пойдет': 'пойдёт',
  'найдет': 'найдёт',
  'дает': 'даёт',
  'задает': 'задаёт',
  'передает': 'передаёт',
  'берет': 'берёт',
  'несет': 'несёт',
  'ведет': 'ведёт',
  'везет': 'везёт',
  'течет': 'течёт',
  'печет': 'печёт',
  'жжет': 'жжёт',
  'жует': 'жуёт',
  'клюет': 'клюёт',
  'поет': 'поёт',
  'пришел': 'пришёл',
  'ушел': 'ушёл',
  'нашел': 'нашёл',
  'зашел': 'зашёл',
  'вышел': 'вышёл',
  'подошел': 'подошёл',
  'перешел': 'перешёл',
  'обошел': 'обошёл',
};

// Build a case-insensitive lookup: only apply replacements where source differs from target
const effectiveEntries: Array<[string, string]> = [];
for (const [from, to] of Object.entries(YO_DICTIONARY)) {
  if (from !== to) {
    effectiveEntries.push([from, to]);
  }
}

export const ruYo = defineRule({
  id: 'ru/yo/basic',
  name: { ru: 'Ёфикатор', en: 'Yo-fication (ё)' },
  locale: 'ru',
  group: 'yo',
  enabled: true,
  priority: 25,
  apply(text) {
    let result = text;
    for (const [from, to] of effectiveEntries) {
      // Word boundary for Cyrillic
      const regex = new RegExp(`(?<![а-яА-ЯёЁ])${from}(?![а-яА-ЯёЁ])`, 'g');
      result = result.replace(regex, to);

      // Capitalize first letter if original was capitalized
      const capitalFrom = from.charAt(0).toUpperCase() + from.slice(1);
      const capitalTo = to.charAt(0).toUpperCase() + to.slice(1);
      if (capitalFrom !== capitalTo) {
        const capitalRegex = new RegExp(`(?<![а-яА-ЯёЁ])${capitalFrom}(?![а-яА-ЯёЁ])`, 'g');
        result = result.replace(capitalRegex, capitalTo);
      }
    }
    return result;
  },
});
