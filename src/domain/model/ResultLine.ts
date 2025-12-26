/**
 * Represents the evaluation result of a single htaccess rule
 */
export interface ResultLine {
  /** The rule text */
  line: string;
  /** Optional message about the rule evaluation */
  message: string | null;
  /** Whether the rule condition was satisfied */
  isMet: boolean;
  /** Whether the rule syntax is valid */
  isValid: boolean;
  /** Whether execution reached this rule */
  wasReached: boolean;
  /** Whether this rule/feature is supported */
  isSupported: boolean;
}
