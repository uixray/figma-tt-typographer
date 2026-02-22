import { defineRule } from '../../core/rule';

/** Known abbreviations that should remain uppercase */
const ABBREVIATIONS: Record<string, string> = {
  'ссср': 'СССР', 'гост': 'ГОСТ', 'сша': 'США', 'рф': 'РФ', 'снг': 'СНГ',
  'ооо': 'ООО', 'пао': 'ПАО', 'зао': 'ЗАО', 'оао': 'ОАО', 'смс': 'СМС',
  'cvv': 'CVV', 'cvc': 'CVC', 'qr-код': 'QR-код', 'пин-код': 'ПИН-код',
  'wi-fi': 'Wi-Fi', 'фгос': 'ФГОС', 'мвд': 'МВД', 'фсб': 'ФСБ',
  'гибдд': 'ГИБДД', 'мчс': 'МЧС', 'фнс': 'ФНС', 'ндс': 'НДС',
  'нко': 'НКО', 'ип': 'ИП', 'инн': 'ИНН', 'огрн': 'ОГРН', 'кпп': 'КПП',
  'url': 'URL', 'api': 'API', 'html': 'HTML', 'css': 'CSS', 'pdf': 'PDF',
  'usb': 'USB', 'hdmi': 'HDMI', 'ram': 'RAM', 'ssd': 'SSD', 'hdd': 'HDD',
  'dpi': 'DPI', 'fps': 'FPS',
};

/**
 * Fix ALL CAPS text to proper case.
 * Detects when text is mostly uppercase (>70% of letters, >20 letters)
 * and converts to sentence case while preserving known abbreviations.
 */
export const ruFixCase = defineRule({
  id: 'ru/case/capslock',
  name: { ru: 'Исправление регистра (CAPS LOCK)', en: 'Fix ALL CAPS' },
  locale: 'ru',
  group: 'case',
  enabled: true,
  priority: 5, // Run first, before other rules
  apply(text) {
    const letters = text.match(/[а-яА-ЯёЁa-zA-Z]/g);
    if (!letters || letters.length < 20) return text;

    const uppercaseLetters = text.match(/[А-ЯЁA-Z]/g) || [];
    if (uppercaseLetters.length / letters.length < 0.7) return text;

    // Convert to lowercase first
    let result = text.toLowerCase();

    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);

    // Capitalize after sentence-ending punctuation
    result = result.replace(/([.!?…]\s+)([а-яёa-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    // Restore known abbreviations
    const abbrPattern = new RegExp(
      `\\b(${Object.keys(ABBREVIATIONS).map(k => k.replace(/-/g, '\\-')).join('|')})\\b`,
      'gi'
    );
    result = result.replace(abbrPattern, m => ABBREVIATIONS[m.toLowerCase()] || m);

    return result;
  },
});
