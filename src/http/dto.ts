export interface TestRequestDto {
  url: string;
  htaccess: string;
  serverVariables: Record<string, string>;
}

export interface ResultLineDto {
  line?: string | null;
  message?: string | null;
  isMet?: boolean | null;
  isValid?: boolean | null;
  wasReached?: boolean | null;
  isSupported?: boolean | null;
}

export interface TestResponseDto {
  outputUrl?: string;
  outputStatusCode?: number | null;
  lines?: ResultLineDto[];
}

export interface ErrorResponseDto {
  error?: string;
  details?: string;
}
