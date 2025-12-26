export interface TestRequest {
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
}
