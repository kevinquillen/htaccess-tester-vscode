/**
 * Tests for regex safety utilities
 */

import { describe, it, expect } from 'vitest';
import {
  checkPatternSafety,
  checkSubjectSafety,
  createSafeRegex,
  checkPcreCompatibility
} from '../regex-safety';
import { DEFAULT_ENGINE_CONFIG } from '../../shared/types';

describe('Regex Safety', () => {
  describe('checkPatternSafety', () => {
    it('should accept normal patterns', () => {
      const result = checkPatternSafety('^foo$');
      expect(result.safe).toBe(true);
    });

    it('should accept complex but safe patterns', () => {
      const result = checkPatternSafety('^([^/]+)/([0-9]+)$');
      expect(result.safe).toBe(true);
    });

    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(3000);
      const result = checkPatternSafety(longPattern);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should detect nested quantifiers', () => {
      const result = checkPatternSafety('(a+)+');
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('nested quantifiers');
    });
  });

  describe('checkSubjectSafety', () => {
    it('should accept normal subjects', () => {
      const result = checkSubjectSafety('/some/path/here');
      expect(result.safe).toBe(true);
    });

    it('should reject subjects that are too long', () => {
      const longSubject = 'a'.repeat(3000);
      const result = checkSubjectSafety(longSubject);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('createSafeRegex', () => {
    it('should create regex for valid patterns', () => {
      const regex = createSafeRegex('^foo$', false);
      expect(regex).not.toBeNull();
      expect(regex!.test('foo')).toBe(true);
    });

    it('should create case-insensitive regex', () => {
      const regex = createSafeRegex('^foo$', true);
      expect(regex).not.toBeNull();
      expect(regex!.test('FOO')).toBe(true);
    });

    it('should return null for invalid patterns', () => {
      const regex = createSafeRegex('[invalid', false);
      expect(regex).toBeNull();
    });

    it('should return null for unsafe patterns', () => {
      const regex = createSafeRegex('(a+)+', false);
      expect(regex).toBeNull();
    });
  });

  describe('checkPcreCompatibility', () => {
    it('should accept JS-compatible patterns', () => {
      const result = checkPcreCompatibility('^([a-z]+)$');
      expect(result.safe).toBe(true);
    });

    it('should detect PCRE recursion', () => {
      const result = checkPcreCompatibility('(?R)');
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('(?R)');
    });

    it('should detect named recursion', () => {
      const result = checkPcreCompatibility('(?P>name)');
      expect(result.safe).toBe(false);
    });
  });
});
