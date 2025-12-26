import { TestResult, ResultLine } from '../domain/model';
import { TestResponseDto, ResultLineDto } from './dto';

/**
 * Maps API DTOs to domain models
 */
export function mapResponseToResult(dto: TestResponseDto, rawResponse: string): TestResult {
  return {
    outputUrl: dto.output_url ?? '',
    outputStatusCode: dto.output_status_code ?? null,
    lines: (dto.lines ?? []).map(mapResultLine),
    rawResponse
  };
}

/**
 * Maps a single result line DTO to domain model
 */
function mapResultLine(dto: ResultLineDto): ResultLine {
  return {
    line: dto.line ?? '',
    message: dto.message ?? null,
    isMet: dto.met ?? false,
    isValid: dto.valid ?? true,
    wasReached: dto.reached ?? false,
    isSupported: dto.supported ?? true
  };
}
