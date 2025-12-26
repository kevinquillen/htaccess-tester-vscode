/**
 * Represents a request to test htaccess rewrite rules
 */
export interface TestRequest {
  /** The URL to test against the rules */
  url: string;
  /** The htaccess rules to evaluate */
  rules: string;
  /** Optional server variables to include in the test */
  serverVariables: Record<string, string>;
}
