import * as vscode from 'vscode';
import { openTesterCommand, runFromEditorCommand } from './commands';

/**
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Htaccess Tester extension is now active');

  // Register commands
  context.subscriptions.push(openTesterCommand(context));
  context.subscriptions.push(runFromEditorCommand(context));
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Htaccess Tester extension is now deactivated');
}
