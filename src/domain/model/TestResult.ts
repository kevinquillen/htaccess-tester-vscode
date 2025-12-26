import { ResultLine } from './ResultLine';

export interface TestResult {
  outputUrl: string;
  outputStatusCode: number | null;
  lines: ResultLine[];
  rawResponse: string;
}
