import { ResultLine } from './ResultLine';

/**
 * Represents the complete result of an htaccess test
 */
export interface TestResult {
  /** The final URL after all rewrites */
  outputUrl: string;
  /** The HTTP status code (if redirect) */
  outputStatusCode: number | null;
  /** Per-rule evaluation results */
  lines: ResultLine[];
  /** The raw JSON response from the API */
  rawResponse: string;
}
