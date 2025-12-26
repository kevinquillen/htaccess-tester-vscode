/**
 * Request payload for the htaccess API
 */
export interface TestRequestDto {
  url: string;
  htaccess: string;
  serverVariables: Record<string, string>;
}

/**
 * Individual line result from the API
 */
export interface ResultLineDto {
  line?: string | null;
  message?: string | null;
  isMet?: boolean | null;
  isValid?: boolean | null;
  wasReached?: boolean | null;
  isSupported?: boolean | null;
}

/**
 * Response payload from the htaccess API
 */
export interface TestResponseDto {
  outputUrl?: string;
  outputStatusCode?: number | null;
  lines?: ResultLineDto[];
}

/**
 * Error response from the API
 */
export interface ErrorResponseDto {
  error?: string;
  details?: string;
}
