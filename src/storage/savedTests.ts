import * as vscode from 'vscode';

/**
 * A saved test case
 */
export interface SavedTestCase {
  name: string;
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
}

const STORAGE_KEY = 'htaccessTester.savedTestCases';

/**
 * Service for managing saved test cases
 */
export class SavedTestsService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get all saved test cases for the current workspace
   */
  getSavedTestCases(): SavedTestCase[] {
    return this.context.workspaceState.get<SavedTestCase[]>(STORAGE_KEY, []);
  }

  /**
   * Save a test case
   */
  async saveTestCase(testCase: SavedTestCase): Promise<void> {
    const cases = this.getSavedTestCases();
    const existingIndex = cases.findIndex(c => c.name === testCase.name);

    if (existingIndex >= 0) {
      cases[existingIndex] = testCase;
    } else {
      cases.push(testCase);
    }

    await this.context.workspaceState.update(STORAGE_KEY, cases);
  }

  /**
   * Delete a test case by name
   */
  async deleteTestCase(name: string): Promise<void> {
    const cases = this.getSavedTestCases();
    const filtered = cases.filter(c => c.name !== name);
    await this.context.workspaceState.update(STORAGE_KEY, filtered);
  }

  /**
   * Get a specific test case by name
   */
  getTestCase(name: string): SavedTestCase | undefined {
    const cases = this.getSavedTestCases();
    return cases.find(c => c.name === name);
  }
}
