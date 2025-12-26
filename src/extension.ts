import * as vscode from 'vscode';
import { openTesterCommand, runFromEditorCommand } from './commands';

/**
 * Empty tree data provider for the welcome view
 */
class EmptyTreeDataProvider implements vscode.TreeDataProvider<never> {
  getTreeItem(): vscode.TreeItem {
    throw new Error('No items');
  }
  getChildren(): never[] {
    return [];
  }
}

/**
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Htaccess Tester extension is now active');

  // Register commands
  context.subscriptions.push(openTesterCommand(context));
  context.subscriptions.push(runFromEditorCommand(context));

  // Register tree data provider for the Activity Bar view (shows welcome content)
  vscode.window.registerTreeDataProvider('htaccessTester.welcome', new EmptyTreeDataProvider());
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Htaccess Tester extension is now deactivated');
}
