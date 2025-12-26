import { TestResult, ResultLine } from '../domain/model';
import { TestResponseDto, ResultLineDto } from './dto';

export function mapResponseToResult(dto: TestResponseDto, rawResponse: string): TestResult {
  return {
    outputUrl: dto.outputUrl ?? '',
    outputStatusCode: dto.outputStatusCode ?? null,
    lines: (dto.lines ?? []).map(mapResultLine),
    rawResponse
  };
}

function mapResultLine(dto: ResultLineDto): ResultLine {
  return {
    line: dto.line ?? '',
    message: dto.message ?? null,
    isMet: dto.isMet ?? false,
    isValid: dto.isValid ?? true,
    wasReached: dto.wasReached ?? false,
    isSupported: dto.isSupported ?? true
  };
}
