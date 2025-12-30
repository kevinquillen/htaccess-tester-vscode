/**
 * Regex safety utilities to prevent catastrophic backtracking
 * and ensure JS regex compatibility.
 */

import { EngineConfig, DEFAULT_ENGINE_CONFIG } from '../shared/types';

/**
 * Result of regex safety check
 */
export interface RegexSafetyResult {
  safe: boolean;
  reason?: string;
}

/**
 * Check if a regex pattern is safe to execute
 */
export function checkPatternSafety(
  pattern: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): RegexSafetyResult {
  // Check pattern length
  if (pattern.length > config.maxRegexSubjectLength) {
    return {
      safe: false,
      reason: `Pattern too long (${pattern.length} > ${config.maxRegexSubjectLength})`
    };
  }

  // Check for potentially dangerous patterns (nested quantifiers)
  // Patterns like (a+)+ or (a*)*a can cause exponential backtracking
  const nestedQuantifiers = /\([^)]*[+*][^)]*\)[+*]/.test(pattern);
  if (nestedQuantifiers) {
    return {
      safe: false,
      reason: 'Potentially dangerous nested quantifiers detected'
    };
  }

  // Check for overlapping alternatives
  // Patterns like (a|a)+ can cause excessive backtracking
  const overlappingAlternatives = /\([^)]*\|[^)]*\)[+*]{2,}/.test(pattern);
  if (overlappingAlternatives) {
    return {
      safe: false,
      reason: 'Potentially dangerous overlapping alternatives detected'
    };
  }

  return { safe: true };
}

/**
 * Check if a subject string is safe to match against
 */
export function checkSubjectSafety(
  subject: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): RegexSafetyResult {
  if (subject.length > config.maxRegexSubjectLength) {
    return {
      safe: false,
      reason: `Subject too long (${subject.length} > ${config.maxRegexSubjectLength})`
    };
  }

  return { safe: true };
}

/**
 * Create a safe regex with optional case-insensitivity
 * Returns null if the pattern is invalid
 */
export function createSafeRegex(
  pattern: string,
  nocase: boolean,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): RegExp | null {
  // Check pattern safety
  const patternCheck = checkPatternSafety(pattern, config);
  if (!patternCheck.safe) {
    return null;
  }

  try {
    const flags = nocase ? 'i' : '';
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Safely match a pattern against a subject
 * Returns null if matching would be unsafe
 */
export function safeMatch(
  pattern: RegExp,
  subject: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): RegExpMatchArray | null {
  // Check subject safety
  const subjectCheck = checkSubjectSafety(subject, config);
  if (!subjectCheck.safe) {
    return null;
  }

  return subject.match(pattern);
}

/**
 * List of PCRE features not supported in JavaScript regex
 */
export const UNSUPPORTED_PCRE_FEATURES = [
  '(?R)',       // Recursion
  '(?P>',       // Named recursion
  '(?(DEFINE)', // Define blocks
  '(?&',        // Subroutine calls
  '(*',         // Backtracking verbs
  '\\K',        // Reset match start
  '(?|',        // Branch reset groups
];

/**
 * Check if pattern uses unsupported PCRE features
 */
export function checkPcreCompatibility(pattern: string): RegexSafetyResult {
  for (const feature of UNSUPPORTED_PCRE_FEATURES) {
    if (pattern.includes(feature)) {
      return {
        safe: false,
        reason: `Unsupported PCRE feature: ${feature}`
      };
    }
  }

  return { safe: true };
}
