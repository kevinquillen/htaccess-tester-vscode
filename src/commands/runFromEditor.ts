import * as vscode from 'vscode';
import * as path from 'path';
import { HtaccessTesterPanel } from '../webview';

/**
 * Command to run htaccess test from the current editor
 */
export function runFromEditorCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('htaccessTester.runFromEditor', () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const document = editor.document;
    const fileName = path.basename(document.fileName);

    if (fileName !== '.htaccess') {
      vscode.window.showWarningMessage('Active file is not an .htaccess file');
      return;
    }

    // Get or create the panel
    const panel = HtaccessTesterPanel.createOrShow(context.extensionUri, context);

    // Load the file content
    const content = document.getText();
    panel.loadFromFile(content, document.fileName);
  });
}
