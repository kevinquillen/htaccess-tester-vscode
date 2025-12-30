import { TestRequest, TestResult } from '../domain/model';
import { SavedTestCase } from '../storage';

export type WebviewToExtensionMessage =
  | { type: 'runTest'; payload: TestRequest }
  | { type: 'loadFromEditor' }
  | { type: 'promptSaveTestCase'; payload: TestRequest }
  | { type: 'loadTestCase'; payload: { name: string } }
  | { type: 'deleteTestCase'; payload: { name: string } }
  | { type: 'getSavedTestCases' }
  | { type: 'ready' };

export type ExtensionToWebviewMessage =
  | { type: 'testResult'; payload: TestResult }
  | { type: 'testError'; payload: { message: string } }
  | { type: 'loading'; payload: { isLoading: boolean } }
  | { type: 'editorContent'; payload: { rules: string; filePath: string } }
  | { type: 'savedTestCases'; payload: SavedTestCase[] }
  | { type: 'notification'; payload: { message: string; type: 'info' | 'error' | 'success' } };

export function isValidWebviewMessage(message: unknown): message is WebviewToExtensionMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message as { type?: string };

  const validTypes = [
    'runTest',
    'loadFromEditor',
    'promptSaveTestCase',
    'loadTestCase',
    'deleteTestCase',
    'getSavedTestCases',
    'ready'
  ];

  return typeof msg.type === 'string' && validTypes.includes(msg.type);
}
