/**
 * Htaccess Engine - Offline evaluator for Apache mod_rewrite rules.
 * This module has ZERO VS Code API dependencies.
 */

export * from './ast';
export * from '../shared/types';

import { EngineInput, EngineOutput, EngineConfig, DEFAULT_ENGINE_CONFIG } from '../shared/types';

/**
 * Main entry point for evaluating htaccess rules.
 * This function will be implemented in Stage 4.
 */
export function evaluate(
  input: EngineInput,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): EngineOutput {
  // Placeholder - will be implemented in Stage 4
  return {
    finalUrl: input.url,
    status: 'ok',
    statusCode: null,
    trace: []
  };
}

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
      return evaluate(input, fullConfig);
    }
  };
}
