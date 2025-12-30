/**
 * Shared types for the htaccess engine and VS Code extension.
 * These types must NOT depend on VS Code APIs.
 */

/**
 * Input to the htaccess evaluator
 */
export interface EngineInput {
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
}

/**
 * A single trace line from evaluation
 */
export interface TraceLine {
  lineNo: number;
  rawLine: string;
  valid: boolean;
  reached: boolean;
  met: boolean;
  message: string | null;
}

/**
 * Engine evaluation status
 */
export type EngineStatus =
  | 'ok'
  | 'redirect'
  | 'error'
  | 'unsupported'
  | 'limit-exceeded';

/**
 * Output from the htaccess evaluator
 */
export interface EngineOutput {
  finalUrl: string;
  status: EngineStatus;
  statusCode: number | null;
  trace: TraceLine[];
}

/**
 * Engine configuration limits
 */
export interface EngineConfig {
  maxIterations: number;
  maxUrlLength: number;
  maxRegexSubjectLength: number;
  maxRuleCount: number;
}

/**
 * Default engine configuration
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  maxIterations: 100,
  maxUrlLength: 8192,
  maxRegexSubjectLength: 2048,
  maxRuleCount: 1000
};
