import * as vscode from 'vscode';
import { TestRequest, TestResult } from '../domain/model';
import { TestRequestDto, TestResponseDto, ErrorResponseDto } from './dto';
import { mapResponseToResult } from './mapper';

/**
 * Custom error for API-related failures
 */
export class HtaccessApiError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = false,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'HtaccessApiError';
  }
}

/**
 * Configuration for the HTTP client
 */
interface ClientConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Gets configuration from VS Code settings
 */
function getConfig(): ClientConfig {
  const config = vscode.workspace.getConfiguration('htaccessTester');
  return {
    baseUrl: config.get<string>('apiBaseUrl', 'https://htaccess.madewithlove.com/api'),
    timeoutMs: config.get<number>('requestTimeoutMs', 10000),
    maxRetries: config.get<number>('maxRetryAttempts', 2)
  };
}

/**
 * Sleep for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test htaccess rules against a URL via the remote API
 */
export async function testHtaccess(request: TestRequest): Promise<TestResult> {
  const config = getConfig();

  const requestDto: TestRequestDto = {
    url: request.url,
    htaccess: request.rules,
    serverVariables: request.serverVariables
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await executeRequest(config.baseUrl, requestDto, config.timeoutMs);
      return result;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof HtaccessApiError) {
        if (!error.isRetryable) {
          throw error;
        }

        // Exponential backoff with max 10s delay
        if (attempt < config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(delay);
        }
      } else {
        throw error;
      }
    }
  }

  throw lastError ?? new HtaccessApiError('Unknown error occurred');
}

/**
 * Execute a single API request
 */
async function executeRequest(
  baseUrl: string,
  requestDto: TestRequestDto,
  timeoutMs: number
): Promise<TestResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestDto),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const rawResponse = await response.text();

    if (!response.ok) {
      handleErrorResponse(response.status, rawResponse);
    }

    const dto: TestResponseDto = JSON.parse(rawResponse);
    return mapResponseToResult(dto, rawResponse);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof HtaccessApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new HtaccessApiError('Request timed out', true);
      }
      if (error.message.includes('fetch')) {
        throw new HtaccessApiError(`Network error: ${error.message}`, true);
      }
    }

    throw new HtaccessApiError(`Unexpected error: ${error}`);
  }
}

/**
 * Handle non-200 responses
 */
function handleErrorResponse(status: number, rawResponse: string): never {
  // Rate limiting
  if (status === 429) {
    throw new HtaccessApiError(
      'Rate limit exceeded. Please wait before making more requests.',
      false,
      status
    );
  }

  // Server errors (retryable)
  if (status >= 500 && status < 600) {
    throw new HtaccessApiError(
      `Server error (${status}). Retrying...`,
      true,
      status
    );
  }

  // Client errors
  try {
    const errorDto: ErrorResponseDto = JSON.parse(rawResponse);
    throw new HtaccessApiError(
      errorDto.error ?? errorDto.details ?? `Request failed with status ${status}`,
      false,
      status
    );
  } catch (e) {
    if (e instanceof HtaccessApiError) {
      throw e;
    }
    throw new HtaccessApiError(`Request failed with status ${status}`, false, status);
  }
}
