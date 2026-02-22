import type { Locale } from './rule';

/** Character range counts for language detection */
interface CharCounts {
  cyrillic: number;
  cjk: number;
  hiraganaKatakana: number;
  french: number;
  latin: number;
  total: number;
}

/** Count characters by script category */
function countChars(text: string): CharCounts {
  const counts: CharCounts = {
    cyrillic: 0,
    cjk: 0,
    hiraganaKatakana: 0,
    french: 0,
    latin: 0,
    total: 0,
  };

  for (const ch of text) {
    const code = ch.codePointAt(0)!;

    // Cyrillic: U+0400–U+04FF
    if (code >= 0x0400 && code <= 0x04ff) {
      counts.cyrillic++;
      counts.total++;
    }
    // CJK Unified Ideographs: U+4E00–U+9FFF
    else if (code >= 0x4e00 && code <= 0x9fff) {
      counts.cjk++;
      counts.total++;
    }
    // Hiragana: U+3040–U+309F, Katakana: U+30A0–U+30FF
    else if (code >= 0x3040 && code <= 0x30ff) {
      counts.hiraganaKatakana++;
      counts.total++;
    }
    // French-specific diacritics and characters
    else if ('àâçéèêëïîôùûüÿœæÀÂÇÉÈÊËÏÎÔÙÛÜŸŒÆ'.includes(ch)) {
      counts.french++;
      counts.total++;
    }
    // Basic Latin letters
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      counts.latin++;
      counts.total++;
    }
  }

  return counts;
}

/**
 * Detect the most likely language of the given text.
 * Uses a simple heuristic based on character frequency.
 */
export function detectLocale(text: string): Locale {
  const counts = countChars(text);

  if (counts.total === 0) return 'en';

  // If >20% hiragana/katakana → Japanese (even if CJK characters are present)
  if (counts.hiraganaKatakana / counts.total > 0.05) return 'ja';

  // If >20% CJK ideographs (and not Japanese) → Chinese
  if (counts.cjk / counts.total > 0.2) return 'zh';

  // If >20% Cyrillic → Russian
  if (counts.cyrillic / counts.total > 0.2) return 'ru';

  // If French-specific chars found among latin text → French
  if (counts.french > 0 && counts.latin > 0 && counts.french / (counts.latin + counts.french) > 0.03) {
    return 'fr';
  }

  // Check for French punctuation patterns: space before : ; ! ?
  if (/\s[;:!?]/.test(text) && counts.latin > 0) {
    return 'fr';
  }

  return 'en';
}
