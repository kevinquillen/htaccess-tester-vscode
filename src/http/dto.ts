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
  met?: boolean | null;
  valid?: boolean | null;
  reached?: boolean | null;
  supported?: boolean | null;
}

/**
 * Response payload from the htaccess API
 */
export interface TestResponseDto {
  output_url?: string;
  output_status_code?: number | null;
  lines?: ResultLineDto[];
}

/**
 * Error response from the API
 */
export interface ErrorResponseDto {
  error?: string;
  details?: string;
}
