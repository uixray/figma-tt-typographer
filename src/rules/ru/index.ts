import type { TypographyRule } from '../../core/rule';
import { ruQuotes } from './quotes';
import { ruEnDash, ruEmDash } from './dashes';
import { ruYo } from './yo';
import {
  ruShortWords,
  ruEmDashSpace,
  ruInitials,
  ruAbbreviationPatterns,
  ruDigitsUnits,
  ruDotAbbreviations,
  ruSymbolSpaces,
  ruBracketSpaces,
} from './spaces';
import {
  ruCurrency,
  ruDecimals,
  ruThousands,
  ruPercent,
  ruNumberAbbr,
  ruMultiplication,
  ruTemperature,
} from './numbers';
import { ruFixCase } from './case';
import { ruHanging } from './hanging';

export const ruRules: TypographyRule[] = [
  // Case (priority 5)
  ruFixCase,
  // Yo-fication (priority 25)
  ruYo,
  // Quotes (priority 30)
  ruQuotes,
  // Dashes (priority 35-36)
  ruEnDash,
  ruEmDash,
  // Spaces — brackets first (priority 48)
  ruBracketSpaces,
  // Spaces — short words and others (priority 50-56)
  ruShortWords,
  ruEmDashSpace,
  ruInitials,
  ruAbbreviationPatterns,
  ruDigitsUnits,
  ruDotAbbreviations,
  ruSymbolSpaces,
  // Numbers and currency (priority 60-66)
  ruCurrency,
  ruMultiplication,
  ruDecimals,
  ruThousands,
  ruPercent,
  ruNumberAbbr,
  ruTemperature,
  // Hanging lines (priority 90)
  ruHanging,
];
