/**
 * Conformance test runner for htaccess engine.
 * Tests engine output against expected fixture results.
 */

import { describe, it, expect } from 'vitest';
import { loadFixtures, TestFixture, ExpectedTraceLine } from './fixtures';
import { evaluate } from '../index';
import { EngineInput, TraceLine } from '../../shared/types';

describe('Engine Conformance Tests', () => {
  const fixtures = loadFixtures();

  describe.each(fixtures)('$id: $description', (fixture: TestFixture) => {
    it('should produce correct output URL', () => {
      const input: EngineInput = {
        url: fixture.url,
        rules: fixture.rules,
        serverVariables: fixture.serverVariables
      };

      const result = evaluate(input);

      expect(result.finalUrl).toBe(fixture.expected.outputUrl);
    });

    it('should produce correct status code', () => {
      const input: EngineInput = {
        url: fixture.url,
        rules: fixture.rules,
        serverVariables: fixture.serverVariables
      };

      const result = evaluate(input);

      expect(result.statusCode).toBe(fixture.expected.statusCode);
    });

    it('should produce correct trace', () => {
      const input: EngineInput = {
        url: fixture.url,
        rules: fixture.rules,
        serverVariables: fixture.serverVariables
      };

      const result = evaluate(input);

      expect(result.trace.length).toBe(fixture.expected.trace.length);

      result.trace.forEach((traceLine: TraceLine, index: number) => {
        const expected: ExpectedTraceLine = fixture.expected.trace[index];

        // Check that the raw line contains the expected line content
        expect(traceLine.rawLine).toContain(expected.line);

        // Check trace semantics
        expect(traceLine.reached).toBe(expected.reached);
        expect(traceLine.met).toBe(expected.met);
        expect(traceLine.valid).toBe(expected.valid);
      });
    });
  });
});

describe('Property Tests', () => {
  it('if engine off → output equals input', () => {
    const input: EngineInput = {
      url: 'http://example.com/test',
      rules: `RewriteEngine Off
RewriteRule ^test$ /changed [L]`,
      serverVariables: { HTTP_HOST: 'example.com' }
    };

    const result = evaluate(input);

    expect(result.finalUrl).toBe(input.url);
  });

  it('if no rules → output equals input', () => {
    const input: EngineInput = {
      url: 'http://example.com/test',
      rules: '',
      serverVariables: { HTTP_HOST: 'example.com' }
    };

    const result = evaluate(input);

    expect(result.finalUrl).toBe(input.url);
  });

  it('if no rules match → output equals input', () => {
    const input: EngineInput = {
      url: 'http://example.com/test',
      rules: `RewriteEngine On
RewriteRule ^other$ /changed [L]`,
      serverVariables: { HTTP_HOST: 'example.com' }
    };

    const result = evaluate(input);

    expect(result.finalUrl).toBe(input.url);
  });
});
