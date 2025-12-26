/**
 * Validation result type
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

/**
 * Validate a URL for htaccess testing
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return { valid: false, message: 'URL is required' };
  }

  const trimmed = url.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, message: 'URL must start with http:// or https://' };
  }

  try {
    new URL(trimmed);
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }
}

/**
 * Validate htaccess rules
 */
export function validateRules(rules: string): ValidationResult {
  if (!rules || rules.trim().length === 0) {
    return { valid: false, message: 'Htaccess rules are required' };
  }

  return { valid: true };
}

/**
 * Validate server variables
 */
export function validateServerVariables(
  variables: Record<string, string>
): ValidationResult {
  for (const [key, value] of Object.entries(variables)) {
    if (!key || key.trim().length === 0) {
      return { valid: false, message: 'Server variable names cannot be empty' };
    }
  }

  return { valid: true };
}

/**
 * Validate a complete test request
 */
export function validateTestRequest(
  url: string,
  rules: string,
  serverVariables: Record<string, string>
): ValidationResult {
  const urlResult = validateUrl(url);
  if (!urlResult.valid) {
    return urlResult;
  }

  const rulesResult = validateRules(rules);
  if (!rulesResult.valid) {
    return rulesResult;
  }

  const varsResult = validateServerVariables(serverVariables);
  if (!varsResult.valid) {
    return varsResult;
  }

  return { valid: true };
}
