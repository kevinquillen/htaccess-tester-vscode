import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { HtaccessTestService } from '../domain/service';
import { SavedTestsService } from '../storage';
import { ExtensionToWebviewMessage, isValidWebviewMessage } from './bridge';

const FIRST_RUN_KEY = 'htaccessTester.firstRunAcknowledged';

export class HtaccessTesterPanel {
  public static currentPanel: HtaccessTesterPanel | undefined;
  public static readonly viewType = 'htaccessTester';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly testService: HtaccessTestService;
  private readonly savedTestsService: SavedTestsService;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];
  private pendingEditorContent: { rules: string; filePath: string } | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.context = context;
    this.testService = new HtaccessTestService();
    this.savedTestsService = new SavedTestsService(context);

    this.panel.webview.html = this.getHtmlForWebview();
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ): HtaccessTesterPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (HtaccessTesterPanel.currentPanel) {
      HtaccessTesterPanel.currentPanel.panel.reveal(column);
      return HtaccessTesterPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      HtaccessTesterPanel.viewType,
      'Htaccess Tester',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'ui'),
          vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'ui')
        ]
      }
    );

    HtaccessTesterPanel.currentPanel = new HtaccessTesterPanel(panel, extensionUri, context);
    return HtaccessTesterPanel.currentPanel;
  }

  public loadFromFile(content: string, filePath: string): void {
    this.pendingEditorContent = { rules: content, filePath };
    this.postMessage({
      type: 'editorContent',
      payload: { rules: content, filePath }
    });
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isValidWebviewMessage(message)) {
      return;
    }

    switch (message.type) {
      case 'ready':
        await this.onWebviewReady();
        break;
      case 'runTest':
        await this.runTest(message.payload);
        break;
      case 'loadFromEditor':
        this.loadFromActiveEditor();
        break;
      case 'promptSaveTestCase':
        await this.promptAndSaveTestCase(message.payload);
        break;
      case 'loadTestCase':
        this.loadTestCase(message.payload.name);
        break;
      case 'deleteTestCase':
        await this.deleteTestCase(message.payload.name);
        break;
      case 'getSavedTestCases':
        this.sendSavedTestCases();
        break;
      case 'acknowledgeFirstRun':
        await this.context.globalState.update(FIRST_RUN_KEY, true);
        break;
    }
  }

  private async onWebviewReady(): Promise<void> {
    const acknowledged = this.context.globalState.get<boolean>(FIRST_RUN_KEY, false);
    if (!acknowledged) {
      this.postMessage({ type: 'showFirstRunNotice', payload: { show: true } });
    }

    this.sendSavedTestCases();

    if (this.pendingEditorContent) {
      this.postMessage({
        type: 'editorContent',
        payload: this.pendingEditorContent
      });
      this.pendingEditorContent = null;
    }
  }

  private async runTest(payload: { url: string; rules: string; serverVariables: Record<string, string> }): Promise<void> {
    this.postMessage({ type: 'loading', payload: { isLoading: true } });

    try {
      const result = await this.testService.test({
        url: payload.url,
        rules: payload.rules,
        serverVariables: payload.serverVariables
      });
      this.postMessage({ type: 'testResult', payload: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.postMessage({ type: 'testError', payload: { message } });
    } finally {
      this.postMessage({ type: 'loading', payload: { isLoading: false } });
    }
  }

  private loadFromActiveEditor(): void {
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

    this.postMessage({
      type: 'editorContent',
      payload: { rules: document.getText(), filePath: document.fileName }
    });
  }

  private async promptAndSaveTestCase(payload: { url: string; rules: string; serverVariables: Record<string, string> }): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter a name for this test case',
      placeHolder: 'Test case name'
    });

    if (!name) {
      return;
    }

    await this.savedTestsService.saveTestCase({
      name,
      url: payload.url,
      rules: payload.rules,
      serverVariables: payload.serverVariables
    });

    this.sendSavedTestCases();
    vscode.window.showInformationMessage(`Test case "${name}" saved`);
  }

  private loadTestCase(name: string): void {
    const testCase = this.savedTestsService.getTestCase(name);
    if (testCase) {
      this.postMessage({
        type: 'editorContent',
        payload: { rules: testCase.rules, filePath: '' }
      });
    }
  }

  private async deleteTestCase(name: string): Promise<void> {
    await this.savedTestsService.deleteTestCase(name);
    this.sendSavedTestCases();
    vscode.window.showInformationMessage(`Test case "${name}" deleted`);
  }

  private sendSavedTestCases(): void {
    const cases = this.savedTestsService.getSavedTestCases();
    this.postMessage({ type: 'savedTestCases', payload: cases });
  }

  private postMessage(message: ExtensionToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  private getHtmlForWebview(): string {
    const webview = this.panel.webview;

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'ui', 'styles.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'ui', 'main.js')
    );
    const nonce = this.getNonce();

    const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'ui', 'index.html');
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/\{\{nonce\}\}/g, nonce);
    html = html.replace(/\{\{stylesUri\}\}/g, stylesUri.toString());
    html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());

    return html;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    HtaccessTesterPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
