import * as vscode from 'vscode';
import { openTesterCommand, runFromEditorCommand } from './commands';

class EmptyTreeDataProvider implements vscode.TreeDataProvider<never> {
  getTreeItem(): vscode.TreeItem {
    throw new Error('No items');
  }
  getChildren(): never[] {
    return [];
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(openTesterCommand(context));
  context.subscriptions.push(runFromEditorCommand(context));
  vscode.window.registerTreeDataProvider('htaccessTester.welcome', new EmptyTreeDataProvider());
}

export function deactivate(): void {}
