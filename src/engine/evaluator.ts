/**
 * Htaccess Evaluator - Core evaluation logic for mod_rewrite rules.
 */

import {
  AstNode,
  HtaccessDocument,
  RewriteEngineDirective,
  RewriteBaseDirective,
  RewriteCondDirective,
  RewriteRuleDirective,
  RuleFlags
} from './ast';
import { parse } from './parser';
import {
  EngineInput,
  EngineOutput,
  EngineConfig,
  EngineStatus,
  TraceLine,
  DEFAULT_ENGINE_CONFIG
} from '../shared/types';

/**
 * Internal evaluation state
 */
interface EvalState {
  inputUrl: string;
  currentPath: string;
  queryString: string;
  scheme: string;
  host: string;
  env: Record<string, string>;
  ruleCaptures: string[];  // $1-$9
  condCaptures: string[];  // %1-%9
  stopped: boolean;
  hardStop: boolean;       // END flag
  redirect: number | null;
  iterations: number;
  rewriteBase: string;
  engineEnabled: boolean;
}

/**
 * Parse a URL into components
 */
function parseUrl(url: string): { scheme: string; host: string; path: string; query: string } {
  try {
    const parsed = new URL(url);
    return {
      scheme: parsed.protocol.replace(':', ''),
      host: parsed.host,
      path: parsed.pathname.replace(/^\//, ''), // Remove leading slash for pattern matching
      query: parsed.search.replace(/^\?/, '')
    };
  } catch {
    // Fallback for malformed URLs
    const match = url.match(/^(https?):\/\/([^\/]+)(\/[^?]*)?(\?.*)?$/);
    if (match) {
      return {
        scheme: match[1],
        host: match[2],
        path: (match[3] || '/').replace(/^\//, ''),
        query: (match[4] || '').replace(/^\?/, '')
      };
    }
    return { scheme: 'http', host: '', path: url, query: '' };
  }
}

/**
 * Build URL from components
 */
function buildUrl(scheme: string, host: string, path: string, query: string): string {
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const queryPart = query ? '?' + query : '';
  return `${scheme}://${host}${normalizedPath}${queryPart}`;
}

/**
 * Initialize evaluation state from input
 */
function initState(input: EngineInput): EvalState {
  const { scheme, host, path, query } = parseUrl(input.url);

  // Build environment with server variables
  const env: Record<string, string> = {
    ...input.serverVariables,
    REQUEST_URI: '/' + path + (query ? '?' + query : ''),
    QUERY_STRING: query
  };

  return {
    inputUrl: input.url,
    currentPath: path,
    queryString: query,
    scheme,
    host,
    env,
    ruleCaptures: [],
    condCaptures: [],
    stopped: false,
    hardStop: false,
    redirect: null,
    iterations: 0,
    rewriteBase: '/',
    engineEnabled: false
  };
}

/**
 * Resolve variable references in a string
 */
function resolveVariables(
  template: string,
  state: EvalState
): string {
  let result = template;

  // Resolve %{VAR} server variables
  result = result.replace(/%\{([^}]+)\}/g, (_, varName) => {
    return state.env[varName] ?? '';
  });

  // Resolve $N rule backreferences (1-9)
  result = result.replace(/\$([1-9])/g, (_, num) => {
    const index = parseInt(num, 10) - 1;
    return state.ruleCaptures[index] ?? '';
  });

  // Resolve %N condition backreferences (1-9)
  result = result.replace(/%([1-9])/g, (_, num) => {
    const index = parseInt(num, 10) - 1;
    return state.condCaptures[index] ?? '';
  });

  return result;
}

/**
 * Create a regex from a pattern with optional case-insensitivity
 */
function createRegex(pattern: string, nocase: boolean): RegExp | null {
  try {
    const flags = nocase ? 'i' : '';
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Evaluate a RewriteCond directive
 */
function evaluateCond(
  cond: RewriteCondDirective,
  state: EvalState
): { met: boolean; captures: string[] } {
  const testString = resolveVariables(cond.testString, state);
  const regex = createRegex(cond.condPattern, cond.flags.nocase);

  if (!regex) {
    return { met: false, captures: [] };
  }

  const match = testString.match(regex);
  let met = match !== null;

  if (cond.isNegated) {
    met = !met;
  }

  const captures = match ? match.slice(1) : [];

  return { met, captures };
}

/**
 * Evaluate a group of conditions (AND/OR logic)
 *
 * Conditions are evaluated with these rules:
 * - Conditions are ANDed together by default
 * - OR flag means "OR with the next condition"
 * - Example: A [OR], B, C means (A OR B) AND C
 */
function evaluateConditionGroup(
  conditions: RewriteCondDirective[],
  state: EvalState
): { met: boolean; captures: string[] } {
  if (conditions.length === 0) {
    return { met: true, captures: [] };
  }

  let lastCaptures: string[] = [];

  // Group conditions by OR chains, then AND the groups
  let groupResult = true; // AND accumulator for groups
  let orResult = false;   // OR accumulator within a group
  let inOrChain = false;

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];

    // Short-circuit: if in OR chain and already true, skip evaluation
    if (inOrChain && orResult) {
      // Already have a true in this OR chain, skip this condition
      if (!cond.flags.ornext) {
        // End of OR chain - AND with group result
        groupResult = groupResult && orResult;
        orResult = false;
        inOrChain = false;
      }
      continue;
    }

    const result = evaluateCond(cond, state);

    if (result.met && result.captures.length > 0) {
      lastCaptures = result.captures;
    }

    if (cond.flags.ornext) {
      // This is part of an OR chain
      orResult = orResult || result.met;
      inOrChain = true;
    } else if (inOrChain) {
      // End of OR chain - this condition is the last in the OR group
      orResult = orResult || result.met;
      groupResult = groupResult && orResult;
      orResult = false;
      inOrChain = false;
    } else {
      // Simple AND condition
      groupResult = groupResult && result.met;
    }
  }

  // Handle trailing OR chain (if conditions end with [OR] flag)
  if (inOrChain) {
    groupResult = groupResult && orResult;
  }

  return { met: groupResult, captures: lastCaptures };
}

/**
 * Apply a RewriteRule substitution
 */
function applySubstitution(
  rule: RewriteRuleDirective,
  state: EvalState,
  match: RegExpMatchArray
): { newPath: string; newQuery: string } {
  // Store captures
  state.ruleCaptures = match.slice(1);

  // Handle "-" (no substitution)
  if (rule.substitution === '-') {
    return { newPath: state.currentPath, newQuery: state.queryString };
  }

  // Resolve variables in substitution
  let substitution = resolveVariables(rule.substitution, state);

  // Replace backreferences
  substitution = substitution.replace(/\$([0-9])/g, (_, num) => {
    const index = parseInt(num, 10);
    if (index === 0) return match[0];
    return match[index] ?? '';
  });

  // Check if it's an absolute URL
  if (/^https?:\/\//i.test(substitution)) {
    const { scheme, host, path, query } = parseUrl(substitution);
    state.scheme = scheme;
    state.host = host;

    // Handle query string
    let finalQuery = query;
    if (rule.flags.qsappend && state.queryString) {
      finalQuery = query ? `${query}&${state.queryString}` : state.queryString;
    }
    if (rule.flags.qsdiscard) {
      finalQuery = query; // Only keep new query
    }

    return { newPath: path, newQuery: finalQuery };
  }

  // Parse substitution for query string
  let newPath = substitution;
  let newQuery = '';

  const queryIndex = substitution.indexOf('?');
  if (queryIndex !== -1) {
    newPath = substitution.slice(0, queryIndex);
    newQuery = substitution.slice(queryIndex + 1);
  }

  // Handle RewriteBase
  if (!newPath.startsWith('/') && state.rewriteBase !== '/') {
    newPath = state.rewriteBase + newPath;
  }

  // Handle query string flags
  if (rule.flags.qsdiscard) {
    // QSD: Only use new query string
  } else if (rule.flags.qsappend && state.queryString) {
    // QSA: Append original query string
    newQuery = newQuery ? `${newQuery}&${state.queryString}` : state.queryString;
  } else if (!newQuery && !rule.flags.qsdiscard) {
    // Default: preserve original query if no new query
    newQuery = state.queryString;
  }

  return { newPath, newQuery };
}

/**
 * Create a trace line for a node
 */
function createTraceLine(
  node: AstNode,
  reached: boolean,
  met: boolean,
  valid: boolean,
  message: string | null = null
): TraceLine {
  return {
    lineNo: node.sourceLineNo,
    rawLine: node.rawLine.trim(),
    valid,
    reached,
    met,
    message
  };
}

/**
 * Main evaluation function
 */
export function evaluate(
  input: EngineInput,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): EngineOutput {
  const state = initState(input);
  const doc = parse(input.rules);
  const trace: TraceLine[] = [];

  // Collect conditions that apply to the next rule
  let pendingConditions: RewriteCondDirective[] = [];

  for (let i = 0; i < doc.nodes.length; i++) {
    const node = doc.nodes[i];

    // Check iteration limit
    if (state.iterations > config.maxIterations) {
      return {
        finalUrl: buildUrl(state.scheme, state.host, state.currentPath, state.queryString),
        status: 'limit-exceeded',
        statusCode: state.redirect,
        trace
      };
    }

    // Process based on node type
    switch (node.kind) {
      case 'BlankLine':
        // Skip blank lines, don't add to trace
        break;

      case 'Comment':
        // Comments are reached but don't affect evaluation
        trace.push(createTraceLine(node, true, true, true));
        break;

      case 'RewriteEngine':
        state.engineEnabled = node.on;
        trace.push(createTraceLine(node, true, true, true));
        break;

      case 'RewriteBase':
        trace.push(createTraceLine(node, state.engineEnabled, true, true));
        if (state.engineEnabled) {
          state.rewriteBase = node.base.endsWith('/') ? node.base : node.base + '/';
        }
        break;

      case 'RewriteCond':
        if (!state.engineEnabled) {
          // Engine off: condition not reached
          trace.push(createTraceLine(node, false, false, true));
        } else if (state.stopped || state.hardStop) {
          // Stopped: condition not reached
          trace.push(createTraceLine(node, false, false, true));
        } else {
          // Collect condition for next rule
          pendingConditions.push(node);
          // We'll add trace for conditions when processing the rule
        }
        break;

      case 'RewriteRule':
        if (!state.engineEnabled) {
          // Engine off: rule not reached
          // Also add trace for any pending conditions
          for (const cond of pendingConditions) {
            trace.push(createTraceLine(cond, false, false, true));
          }
          trace.push(createTraceLine(node, false, false, true));
          pendingConditions = [];
        } else if (state.stopped || state.hardStop) {
          // Stopped: rule not reached
          for (const cond of pendingConditions) {
            trace.push(createTraceLine(cond, false, false, true));
          }
          trace.push(createTraceLine(node, false, false, true));
          pendingConditions = [];
        } else {
          // Process conditions and rule
          state.iterations++;

          // Evaluate conditions
          const condResult = evaluateConditionGroup(pendingConditions, state);

          // Add condition traces with proper OR short-circuit handling
          let orShortCircuited = false;
          for (let j = 0; j < pendingConditions.length; j++) {
            const cond = pendingConditions[j];

            if (orShortCircuited) {
              // This condition was skipped due to OR short-circuit
              trace.push(createTraceLine(cond, false, false, true));
              // If this condition also has OR, continue short-circuiting
              if (!cond.flags.ornext) {
                orShortCircuited = false;
              }
              continue;
            }

            const condEval = evaluateCond(cond, state);
            trace.push(createTraceLine(cond, true, condEval.met, true));

            // If this condition has OR flag and matched, next condition is short-circuited
            if (cond.flags.ornext && condEval.met) {
              orShortCircuited = true;
            }
          }

          // Store condition captures
          if (condResult.met && condResult.captures.length > 0) {
            state.condCaptures = condResult.captures;
          }

          if (!condResult.met) {
            // Conditions not met: rule not reached
            trace.push(createTraceLine(node, false, false, true));
          } else {
            // Try to match the rule pattern
            const regex = createRegex(node.pattern, node.flags.nocase);

            if (!regex) {
              // Invalid pattern
              trace.push(createTraceLine(node, true, false, false, 'Invalid regex pattern'));
            } else {
              // Get the path to match against (strip RewriteBase prefix if present)
              let matchPath = state.currentPath;
              const basePrefix = state.rewriteBase.replace(/^\//, '').replace(/\/$/, '');
              if (basePrefix && matchPath.startsWith(basePrefix + '/')) {
                matchPath = matchPath.slice(basePrefix.length + 1);
              } else if (basePrefix && matchPath === basePrefix) {
                matchPath = '';
              }

              const match = matchPath.match(regex);

              if (!match) {
                // Pattern didn't match
                trace.push(createTraceLine(node, true, false, true));
              } else {
                // Pattern matched - apply substitution
                trace.push(createTraceLine(node, true, true, true));

                const { newPath, newQuery } = applySubstitution(node, state, match);
                state.currentPath = newPath;
                state.queryString = newQuery;

                // Apply flags
                applyRuleFlags(node.flags, state);
              }
            }
          }

          pendingConditions = [];
        }
        break;

      case 'Unknown':
        // Unknown directives are valid but unsupported
        trace.push(createTraceLine(node, state.engineEnabled, false, true,
          `Unsupported directive: ${node.directive}`));
        break;

      case 'ParseError':
        // Parse errors are invalid
        trace.push(createTraceLine(node, true, false, false, node.message));
        break;
    }
  }

  // Determine final status
  let status: EngineStatus = 'ok';
  if (state.redirect !== null) {
    status = 'redirect';
  }

  return {
    finalUrl: buildUrl(state.scheme, state.host, state.currentPath, state.queryString),
    status,
    statusCode: state.redirect,
    trace
  };
}

/**
 * Apply rule flags to state
 */
function applyRuleFlags(flags: RuleFlags, state: EvalState): void {
  // R flag: redirect
  if (flags.redirect !== null) {
    state.redirect = flags.redirect;
    state.stopped = true;
  }

  // F flag: forbidden (403)
  if (flags.forbidden) {
    state.redirect = 403;
    state.stopped = true;
  }

  // G flag: gone (410)
  if (flags.gone) {
    state.redirect = 410;
    state.stopped = true;
  }

  // L flag: last rule
  if (flags.last) {
    state.stopped = true;
  }

  // END flag: hard stop
  if (flags.end) {
    state.hardStop = true;
    state.stopped = true;
  }
}
