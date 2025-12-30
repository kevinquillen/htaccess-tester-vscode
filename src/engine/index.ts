/**
 * Htaccess Engine - Offline evaluator for Apache mod_rewrite rules.
 * This module has ZERO VS Code API dependencies.
 */

export * from './ast';
export * from './parser';
export * from '../shared/types';

// Re-export evaluate from evaluator
export { evaluate } from './evaluator';

import { evaluate as evaluateImpl } from './evaluator';
import { EngineInput, EngineOutput, EngineConfig, DEFAULT_ENGINE_CONFIG } from '../shared/types';

/**
 * HtaccessEngine class interface (for consumers who prefer OOP style)
 */
export interface HtaccessEngine {
  evaluate(input: EngineInput): EngineOutput;
}

/**
 * Create an engine instance with the given configuration
 */
export function createEngine(config: Partial<EngineConfig> = {}): HtaccessEngine {
  const fullConfig: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };

  return {
    evaluate(input: EngineInput): EngineOutput {
      return evaluateImpl(input, fullConfig);
    }
  };
}
