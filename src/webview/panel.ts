import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { HtaccessTestService } from '../domain/service';
import { SavedTestsService } from '../storage';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage, isValidWebviewMessage } from './bridge';

const FIRST_RUN_KEY = 'htaccessTester.firstRunAcknowledged';

/**
 * Manages the Htaccess Tester webview panel
 */
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

    // Set the webview's HTML content
    this.panel.webview.html = this.getHtmlForWebview();

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Create or show the panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ): HtaccessTesterPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, show it
    if (HtaccessTesterPanel.currentPanel) {
      HtaccessTesterPanel.currentPanel.panel.reveal(column);
      return HtaccessTesterPanel.currentPanel;
    }

    // Create new panel
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

  /**
   * Load content from an .htaccess file
   */
  public loadFromFile(content: string, filePath: string): void {
    // Store for when webview is ready
    this.pendingEditorContent = { rules: content, filePath };

    this.postMessage({
      type: 'editorContent',
      payload: { rules: content, filePath }
    });
  }

  /**
   * Handle messages from the webview
   */
  private async handleMessage(message: unknown): Promise<void> {
    if (!isValidWebviewMessage(message)) {
      console.warn('Invalid message from webview:', message);
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

      case 'saveTestCase':
        await this.saveTestCase(message.payload);
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

      case 'shareTest':
        await this.shareTest(message.payload);
        break;

      case 'copyToClipboard':
        await vscode.env.clipboard.writeText(message.payload.text);
        vscode.window.showInformationMessage('Copied to clipboard!');
        break;

      case 'acknowledgeFirstRun':
        await this.context.globalState.update(FIRST_RUN_KEY, true);
        break;
    }
  }

  /**
   * Called when webview is ready
   */
  private async onWebviewReady(): Promise<void> {
    // Check if first run
    const acknowledged = this.context.globalState.get<boolean>(FIRST_RUN_KEY, false);
    if (!acknowledged) {
      this.postMessage({ type: 'showFirstRunNotice', payload: { show: true } });
    }

    // Send saved test cases
    this.sendSavedTestCases();

    // Send pending editor content if any
    if (this.pendingEditorContent) {
      this.postMessage({
        type: 'editorContent',
        payload: this.pendingEditorContent
      });
      this.pendingEditorContent = null;
    }
  }

  /**
   * Run a test
   */
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

  /**
   * Load content from the active editor
   */
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

    const content = document.getText();
    this.postMessage({
      type: 'editorContent',
      payload: { rules: content, filePath: document.fileName }
    });
  }

  /**
   * Save a test case
   */
  private async saveTestCase(payload: { name: string; url: string; rules: string; serverVariables: Record<string, string> }): Promise<void> {
    await this.savedTestsService.saveTestCase({
      name: payload.name,
      url: payload.url,
      rules: payload.rules,
      serverVariables: payload.serverVariables
    });

    this.sendSavedTestCases();
    vscode.window.showInformationMessage(`Test case "${payload.name}" saved`);
  }

  /**
   * Load a saved test case
   */
  private loadTestCase(name: string): void {
    const testCase = this.savedTestsService.getTestCase(name);
    if (testCase) {
      this.postMessage({
        type: 'editorContent',
        payload: { rules: testCase.rules, filePath: '' }
      });
    }
  }

  /**
   * Delete a saved test case
   */
  private async deleteTestCase(name: string): Promise<void> {
    await this.savedTestsService.deleteTestCase(name);
    this.sendSavedTestCases();
    vscode.window.showInformationMessage(`Test case "${name}" deleted`);
  }

  /**
   * Send saved test cases to webview
   */
  private sendSavedTestCases(): void {
    const cases = this.savedTestsService.getSavedTestCases();
    this.postMessage({ type: 'savedTestCases', payload: cases });
  }

  /**
   * Share a test (generate link)
   */
  private async shareTest(payload: { url: string; rules: string; serverVariables: Record<string, string> }): Promise<void> {
    try {
      // Create a shareable URL using the htaccess.madewithlove.com format
      const params = new URLSearchParams();
      params.set('url', payload.url);
      params.set('htaccess', payload.rules);

      // Add server variables
      for (const [key, value] of Object.entries(payload.serverVariables)) {
        params.set(`serverVariables[${key}]`, value);
      }

      const shareUrl = `https://htaccess.madewithlove.com/?${params.toString()}`;

      await vscode.env.clipboard.writeText(shareUrl);
      vscode.window.showInformationMessage('Share link copied to clipboard!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to generate share link');
    }
  }

  /**
   * Post a message to the webview
   */
  private postMessage(message: ExtensionToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  /**
   * Generate HTML for the webview
   */
  private getHtmlForWebview(): string {
    const webview = this.panel.webview;

    // Get URIs for resources
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'ui', 'styles.css')
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'ui', 'main.js')
    );

    // Generate nonce for CSP
    const nonce = this.getNonce();

    // Read HTML template
    const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'ui', 'index.html');
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Replace placeholders
    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/\{\{nonce\}\}/g, nonce);
    html = html.replace(/\{\{stylesUri\}\}/g, stylesUri.toString());
    html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());

    return html;
  }

  /**
   * Generate a nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose of the panel
   */
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
