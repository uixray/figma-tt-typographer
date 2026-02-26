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
  | 'width'
  | 'layout';

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
  /** AI mode settings (V2.1 — provider groups) */
  ai?: {
    enabled: boolean;
    activeModelId: string;
    mode: 'typography' | 'proofread' | 'style' | 'custom';
    customPrompt?: string;
    styleVariant?: string;
  };
  /** Text balancing settings (text-wrap: balance emulation) */
  balance?: {
    enabled: boolean;
    /** container = resize width; nbsp = insert non-breaking spaces */
    method: 'container' | 'nbsp';
    /** balance = equalize all lines; pretty = prevent orphans only */
    strategy: 'balance' | 'pretty';
  };
  /** Automatically pad chat message text with NBSP to avoid time overlap */
  chatTimePadding?: {
    enabled: boolean;
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
