import * as vscode from 'vscode';
import { TestRequest, TestResult, ResultLine } from '../model';
import { validateTestRequest } from '../../util/validation';
import { evaluate, TraceLine, EngineConfig, DEFAULT_ENGINE_CONFIG } from '../../engine';

/**
 * Get engine configuration from VS Code settings
 */
function getEngineConfig(): EngineConfig {
  const config = vscode.workspace.getConfiguration('htaccessTester');
  return {
    maxIterations: config.get<number>('engine.maxIterations', DEFAULT_ENGINE_CONFIG.maxIterations),
    maxUrlLength: config.get<number>('engine.maxUrlLength', DEFAULT_ENGINE_CONFIG.maxUrlLength),
    maxRegexSubjectLength: config.get<number>('engine.maxRegexSubjectLength', DEFAULT_ENGINE_CONFIG.maxRegexSubjectLength),
    maxRuleCount: config.get<number>('engine.maxRuleCount', DEFAULT_ENGINE_CONFIG.maxRuleCount)
  };
}

/**
 * Map engine TraceLine to ResultLine for UI display
 */
function mapTraceLine(trace: TraceLine): ResultLine {
  return {
    line: trace.rawLine,
    message: trace.message,
    isMet: trace.met,
    isValid: trace.valid,
    wasReached: trace.reached,
    isSupported: trace.valid // If it's valid, it's supported
  };
}

export class HtaccessTestService {
  /**
   * Test htaccess rules against a URL using the offline engine
   */
  async test(request: TestRequest): Promise<TestResult> {
    const validation = validateTestRequest(
      request.url,
      request.rules,
      request.serverVariables
    );

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Get engine configuration from VS Code settings
    const config = getEngineConfig();

    // Run the offline engine
    const result = evaluate(
      {
        url: request.url,
        rules: request.rules,
        serverVariables: request.serverVariables
      },
      config
    );

    // Map engine output to TestResult format
    return {
      outputUrl: result.finalUrl,
      outputStatusCode: result.statusCode,
      lines: result.trace.map(mapTraceLine),
      rawResponse: JSON.stringify(result, null, 2)
    };
  }
}
