import * as vscode from 'vscode';

export interface SavedTestCase {
  name: string;
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
}

const STORAGE_KEY = 'htaccessTester.savedTestCases';

export class SavedTestsService {
  constructor(private context: vscode.ExtensionContext) {}

  getSavedTestCases(): SavedTestCase[] {
    return this.context.workspaceState.get<SavedTestCase[]>(STORAGE_KEY, []);
  }

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

  async deleteTestCase(name: string): Promise<void> {
    const cases = this.getSavedTestCases();
    const filtered = cases.filter(c => c.name !== name);
    await this.context.workspaceState.update(STORAGE_KEY, filtered);
  }

  getTestCase(name: string): SavedTestCase | undefined {
    const cases = this.getSavedTestCases();
    return cases.find(c => c.name === name);
  }
}
