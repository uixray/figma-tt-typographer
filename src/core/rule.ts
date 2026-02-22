/** Supported locale codes */
export type Locale = 'ru' | 'en' | 'fr' | 'zh' | 'ja' | 'common';

/** Rule group identifiers */
export type RuleGroup =
  | 'quotes'
  | 'dashes'
  | 'spaces'
  | 'numbers'
  | 'currency'
  | 'punctuation'
  | 'case'
  | 'special'
  | 'yo'
  | 'width';

/** Context passed to each rule during execution */
export interface RuleContext {
  /** Active locale for this run */
  locale: Locale;
  /** Ranges in the text that should not be modified (URLs, emails, etc.) */
  protectedRanges: Array<[number, number]>;
}

/** A single typography rule */
export interface TypographyRule {
  /** Unique identifier, e.g. 'ru/quotes/guillemets' */
  id: string;
  /** Human-readable names per locale */
  name: Record<string, string>;
  /** Which locale this rule applies to */
  locale: Locale;
  /** Logical group for UI organization */
  group: RuleGroup;
  /** Whether enabled by default */
  enabled: boolean;
  /** Execution priority — lower runs first */
  priority: number;
  /** Apply the rule and return transformed text */
  apply(text: string, ctx: RuleContext): string;
}

/** Settings that the user can toggle */
export interface TypographySettings {
  locale: Locale | 'auto';
  enabledRules: Record<string, boolean>;
  /** AI mode settings */
  ai?: {
    enabled: boolean;
    provider: 'anthropic' | 'openai';
    apiKey: string;
    mode: 'typography' | 'proofread' | 'style' | 'custom';
    customPrompt?: string;
    model?: string;
  };
}

/** Default settings */
export const DEFAULT_SETTINGS: TypographySettings = {
  locale: 'auto',
  enabledRules: {},
};

/** Helper to create a rule with less boilerplate */
export function defineRule(
  rule: Omit<TypographyRule, 'apply'> & { apply: TypographyRule['apply'] }
): TypographyRule {
  return rule;
}
