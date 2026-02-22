import type { TypographyRule } from '../../core/rule';
import { defineRule } from '../../core/rule';

const NBSP = '\u00A0';
const NNBSP = '\u202F'; // Narrow no-break space (French standard)

/** French guillemets with non-breaking spaces inside: « text » */
const frQuotes = defineRule({
  id: 'fr/quotes/guillemets',
  name: { fr: 'Guillemets « »', en: 'French quotes « »', ru: 'Французские кавычки « »' },
  locale: 'fr',
  group: 'quotes',
  enabled: true,
  priority: 30,
  apply(text) {
    let result = text;
    // Normalize existing quotes
    result = result.replace(/[""«»\u201c\u201d]/g, '"');
    // Opening quote with NNBSP after
    result = result.replace(/(^|[\s(\[{])"(?=\S)/gm, `$1«${NNBSP}`);
    // Closing quote with NNBSP before
    result = result.replace(/"(?=[\s)\]},;:!?.]|$)/gm, `${NNBSP}»`);
    // Remaining quotes
    result = result.replace(/(^|[\s(\[{])"/gm, `$1«${NNBSP}`);
    result = result.replace(/"/g, `${NNBSP}»`);
    return result;
  },
});

/**
 * French punctuation: narrow non-breaking space before ; : ! ?
 * This is the key French typography rule.
 */
const frPunctuation = defineRule({
  id: 'fr/punctuation/spaces',
  name: { fr: 'Espace insécable avant ; : ! ?', en: 'Non-breaking space before ; : ! ?', ru: 'Неразрывный пробел перед ; : ! ?' },
  locale: 'fr',
  group: 'punctuation',
  enabled: true,
  priority: 40,
  apply(text) {
    let result = text;
    // Add NNBSP before : ; ! ? (replace existing space or add if missing)
    result = result.replace(/\s*([;:!?])/g, `${NNBSP}$1`);
    // But NOT at the start of a line/string
    result = result.replace(new RegExp(`^${NNBSP}([;:!?])`, 'gm'), '$1');
    return result;
  },
});

/** French dashes: en-dash with non-breaking spaces */
const frDashes = defineRule({
  id: 'fr/dashes/endash',
  name: { fr: 'Tiret demi-cadratin', en: 'French dashes', ru: 'Французские тире' },
  locale: 'fr',
  group: 'dashes',
  enabled: true,
  priority: 35,
  apply(text) {
    let result = text;
    // Number ranges
    result = result.replace(/(\d+)\s*-\s*(\d+)/g, '$1\u2013$2');
    // Phrase dashes: " - " → " \u2013 " with NBSP
    result = result.replace(/(?<=\S) - (?=\S)/g, `${NBSP}\u2013 `);
    return result;
  },
});

/** French number formatting: comma as decimal, thin space for thousands */
const frNumbers = defineRule({
  id: 'fr/numbers/format',
  name: { fr: 'Formatage des nombres', en: 'French number formatting', ru: 'Французский формат чисел' },
  locale: 'fr',
  group: 'numbers',
  enabled: true,
  priority: 62,
  apply(text, ctx) {
    let result = text;
    // Thousands separator: thin space
    result = result.replace(/(\d)(?=(?:\d{3})+(?![,.\d]))/g, '$1\u2009');
    // Percentage: space before %
    result = result.replace(/(\d)\s*%/g, `$1${NNBSP}%`);
    return result;
  },
});

/** French currency: € after number */
const frCurrency = defineRule({
  id: 'fr/currency/euro',
  name: { fr: 'Euro (€)', en: 'Euro formatting', ru: 'Евро' },
  locale: 'fr',
  group: 'currency',
  enabled: true,
  priority: 60,
  apply(text) {
    let result = text;
    // EUR → €
    result = result.replace(/(\d)\s*EUR\b/gi, `$1${NBSP}€`);
    // Non-breaking space before €
    result = result.replace(/(\d)\s*(€)/g, `$1${NBSP}$2`);
    return result;
  },
});

/** French oe ligature in specific words */
const frLigatures = defineRule({
  id: 'fr/special/ligatures',
  name: { fr: 'Ligatures œ', en: 'OE ligatures', ru: 'Лигатуры œ' },
  locale: 'fr',
  group: 'special',
  enabled: true,
  priority: 70,
  apply(text) {
    // Common French words with œ
    const words: Record<string, string> = {
      'coeur': 'cœur', 'Coeur': 'Cœur',
      'oeuvre': 'œuvre', 'Oeuvre': 'Œuvre',
      'oeuvres': 'œuvres', 'Oeuvres': 'Œuvres',
      'oeil': 'œil', 'Oeil': 'Œil',
      'voeu': 'vœu', 'Voeu': 'Vœu',
      'voeux': 'vœux', 'Voeux': 'Vœux',
      'noeud': 'nœud', 'Noeud': 'Nœud',
      'soeur': 'sœur', 'Soeur': 'Sœur',
      'boeuf': 'bœuf', 'Boeuf': 'Bœuf',
      'manoeuvre': 'manœuvre', 'Manoeuvre': 'Manœuvre',
    };
    let result = text;
    for (const [from, to] of Object.entries(words)) {
      result = result.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }
    return result;
  },
});

export const frRules: TypographyRule[] = [
  frQuotes,
  frPunctuation,
  frDashes,
  frNumbers,
  frCurrency,
  frLigatures,
];
