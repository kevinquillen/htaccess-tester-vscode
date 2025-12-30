/**
 * Fixture types and loader for conformance tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

export interface ExpectedTraceLine {
  line: string;
  reached: boolean;
  met: boolean;
  valid: boolean;
  message?: string;
}

export interface ExpectedResult {
  outputUrl: string;
  statusCode: number | null;
  trace: ExpectedTraceLine[];
}

export interface TestFixture {
  id: string;
  description: string;
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
  expected: ExpectedResult;
}

const FIXTURES_DIR = path.join(__dirname, '../../../fixtures/cases');

export function loadFixtures(): TestFixture[] {
  const files = fs.readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.yaml'))
    .sort();

  return files.map(file => {
    const content = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8');
    const parsed = parse(content) as TestFixture;
    return parsed;
  });
}

export function loadFixture(id: string): TestFixture | undefined {
  const fixtures = loadFixtures();
  return fixtures.find(f => f.id === id);
}
