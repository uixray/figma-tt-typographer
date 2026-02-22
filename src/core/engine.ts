import type { TypographyRule, TypographySettings, Locale, RuleContext } from './rule';
import { detectLocale } from './detector';

// Import all rule sets
import { commonRules } from '../rules/common/index';
import { ruRules } from '../rules/ru/index';
import { enRules } from '../rules/en/index';
import { frRules } from '../rules/fr/index';
import { zhRules } from '../rules/zh/index';
import { jaRules } from '../rules/ja/index';

/** All registered rules */
const ALL_RULES: TypographyRule[] = [
  ...commonRules,
  ...ruRules,
  ...enRules,
  ...frRules,
  ...zhRules,
  ...jaRules,
];

/** Pattern to detect protected ranges (URLs, emails, IP addresses, version numbers, hex codes) */
const PROTECTED_PATTERNS = [
  /https?:\/\/[^\s<>\"'«»„"]+/g,                    // URLs
  /[\w.+-]+@[\w.-]+\.\w{2,}/g,                       // Emails
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,       // IP addresses
  /\bv?\d+\.\d+\.\d+(?:\.\d+)?\b/g,                 // Version numbers (1.2.3, v1.2.3.4)
  /\b0x[0-9a-fA-F]+\b/g,                             // Hex codes
];

/** Find all ranges in text that should not be transformed */
function findProtectedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pattern of PROTECTED_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  // Sort by start position
  return ranges.sort((a, b) => a[0] - b[0]);
}

/** Check if a position falls within a protected range */
export function isProtected(pos: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => pos >= start && pos < end);
}

/** Get rules applicable for a given locale, sorted by priority */
export function getRulesForLocale(locale: Locale): TypographyRule[] {
  return ALL_RULES
    .filter(r => r.locale === locale || r.locale === 'common')
    .sort((a, b) => a.priority - b.priority);
}

/** Get all registered rules */
export function getAllRules(): TypographyRule[] {
  return [...ALL_RULES];
}

/** Get unique rule groups for a locale */
export function getRuleGroupsForLocale(locale: Locale): string[] {
  const rules = getRulesForLocale(locale);
  return [...new Set(rules.map(r => r.group))];
}

/**
 * Apply typography rules to a text string.
 * This is the main entry point for text processing.
 */
export function applyTypography(text: string, settings: TypographySettings): string {
  if (!text || text.trim().length === 0) return text;

  // Determine locale
  const locale: Locale = settings.locale === 'auto'
    ? detectLocale(text)
    : settings.locale;

  // Get applicable rules
  const rules = getRulesForLocale(locale);

  // Find protected ranges
  const protectedRanges = findProtectedRanges(text);

  // Build context
  const ctx: RuleContext = { locale, protectedRanges };

  // Apply each enabled rule
  let result = text;
  for (const rule of rules) {
    // Check if rule is enabled (use rule default if not explicitly set)
    const isEnabled = settings.enabledRules[rule.id] ?? rule.enabled;
    if (!isEnabled) continue;

    // Recompute protected ranges after each transformation
    // (positions may shift due to character insertions/deletions)
    ctx.protectedRanges = findProtectedRanges(result);

    result = rule.apply(result, ctx);
  }

  return result;
}
