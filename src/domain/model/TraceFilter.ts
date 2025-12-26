import { ResultLine } from './ResultLine';

export interface TraceStats {
  total: number;
  met: number;
  notMet: number;
  invalid: number;
  notReached: number;
}

export enum TraceFilter {
  ALL = 'ALL',
  FAILED_ONLY = 'FAILED_ONLY',
  REACHED_ONLY = 'REACHED_ONLY',
  MET_ONLY = 'MET_ONLY'
}

export function filterLines(lines: ResultLine[], filter: TraceFilter): ResultLine[] {
  switch (filter) {
    case TraceFilter.ALL:
      return lines;
    case TraceFilter.FAILED_ONLY:
      return lines.filter(line => !line.isValid || !line.isSupported);
    case TraceFilter.REACHED_ONLY:
      return lines.filter(line => line.wasReached);
    case TraceFilter.MET_ONLY:
      return lines.filter(line => line.isMet);
  }
}

export function calculateStats(lines: ResultLine[]): TraceStats {
  return {
    total: lines.length,
    met: lines.filter(line => line.isMet).length,
    notMet: lines.filter(line => !line.isMet && line.wasReached).length,
    invalid: lines.filter(line => !line.isValid).length,
    notReached: lines.filter(line => !line.wasReached).length
  };
}
