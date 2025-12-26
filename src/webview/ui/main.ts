interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

interface ServerVariable {
  key: string;
  value: string;
}

interface TestResult {
  outputUrl: string;
  outputStatusCode: number | null;
  lines: ResultLine[];
  rawResponse: string;
}

interface ResultLine {
  line: string;
  message: string | null;
  isMet: boolean;
  isValid: boolean;
  wasReached: boolean;
  isSupported: boolean;
}

interface SavedTestCase {
  name: string;
  url: string;
  rules: string;
  serverVariables: Record<string, string>;
}

type TraceFilter = 'ALL' | 'FAILED_ONLY' | 'REACHED_ONLY' | 'MET_ONLY';

(function() {
  const vscode = acquireVsCodeApi();

  let serverVariables: ServerVariable[] = [];
  let currentResult: TestResult | null = null;
  let currentFilter: TraceFilter = 'ALL';
  let savedTestCases: SavedTestCase[] = [];

  const urlInput = document.getElementById('url-input') as HTMLInputElement;
  const rulesTextarea = document.getElementById('rules-textarea') as HTMLTextAreaElement;
  const variablesBody = document.getElementById('variables-body') as HTMLTableSectionElement;
  const addVariableBtn = document.getElementById('add-variable-btn') as HTMLButtonElement;
  const testBtn = document.getElementById('test-btn') as HTMLButtonElement;
  const loadEditorBtn = document.getElementById('load-editor-btn') as HTMLButtonElement;
  const saveTestBtn = document.getElementById('save-test-btn') as HTMLButtonElement;
  const savedTestsSelect = document.getElementById('saved-tests-select') as HTMLSelectElement;
  const loadTestBtn = document.getElementById('load-test-btn') as HTMLButtonElement;
  const deleteTestBtn = document.getElementById('delete-test-btn') as HTMLButtonElement;
  const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
  const resultsSection = document.getElementById('results-section') as HTMLDivElement;
  const outputUrl = document.getElementById('output-url') as HTMLSpanElement;
  const outputStatus = document.getElementById('output-status') as HTMLSpanElement;
  const traceBody = document.getElementById('trace-body') as HTMLTableSectionElement;
  const statsTotal = document.getElementById('stats-total') as HTMLSpanElement;
  const statsMet = document.getElementById('stats-met') as HTMLSpanElement;
  const statsNotMet = document.getElementById('stats-not-met') as HTMLSpanElement;
  const statsInvalid = document.getElementById('stats-invalid') as HTMLSpanElement;
  const statsNotReached = document.getElementById('stats-not-reached') as HTMLSpanElement;
  const rawOutputBtn = document.getElementById('raw-output-btn') as HTMLButtonElement;
  const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
  const rawModal = document.getElementById('raw-modal') as HTMLDivElement;
  const rawContent = document.getElementById('raw-content') as HTMLPreElement;
  const closeRawBtn = document.getElementById('close-raw-btn') as HTMLButtonElement;
  const firstRunNotice = document.getElementById('first-run-notice') as HTMLDivElement;
  const acknowledgeBtn = document.getElementById('acknowledge-btn') as HTMLButtonElement;

  function init(): void {
    setupEventListeners();
    renderVariablesTable();
    vscode.postMessage({ type: 'ready' });
    vscode.postMessage({ type: 'getSavedTestCases' });
  }

  function setupEventListeners(): void {
    testBtn.addEventListener('click', runTest);
    loadEditorBtn.addEventListener('click', loadFromEditor);
    addVariableBtn.addEventListener('click', addVariable);
    saveTestBtn.addEventListener('click', saveTest);
    loadTestBtn.addEventListener('click', loadSelectedTest);
    deleteTestBtn.addEventListener('click', deleteSelectedTest);
    filterSelect.addEventListener('change', onFilterChange);
    rawOutputBtn.addEventListener('click', showRawOutput);
    closeRawBtn.addEventListener('click', hideRawModal);
    acknowledgeBtn.addEventListener('click', acknowledgeFirstRun);

    rawModal.addEventListener('click', (e) => {
      if (e.target === rawModal) {
        hideRawModal();
      }
    });

    window.addEventListener('message', handleMessage);
  }

  function handleMessage(event: MessageEvent): void {
    const message = event.data;

    switch (message.type) {
      case 'testResult':
        currentResult = message.payload;
        showResults();
        break;
      case 'testError':
        showError(message.payload.message);
        break;
      case 'loading':
        setLoading(message.payload.isLoading);
        break;
      case 'editorContent':
        rulesTextarea.value = message.payload.rules;
        break;
      case 'savedTestCases':
        savedTestCases = message.payload;
        renderSavedTestsDropdown();
        break;
      case 'showFirstRunNotice':
        if (message.payload.show) {
          firstRunNotice.classList.add('visible');
        }
        break;
      case 'notification':
        break;
    }
  }

  function runTest(): void {
    hideError();
    const url = urlInput.value.trim();
    const rules = rulesTextarea.value.trim();

    if (!url) {
      showError('URL is required');
      return;
    }

    if (!rules) {
      showError('Htaccess rules are required');
      return;
    }

    vscode.postMessage({
      type: 'runTest',
      payload: {
        url,
        rules,
        serverVariables: getServerVariablesMap()
      }
    });
  }

  function loadFromEditor(): void {
    vscode.postMessage({ type: 'loadFromEditor' });
  }

  function addVariable(): void {
    serverVariables.push({ key: '', value: '' });
    renderVariablesTable();
  }

  function removeVariable(index: number): void {
    serverVariables.splice(index, 1);
    renderVariablesTable();
  }

  function updateVariable(index: number, field: 'key' | 'value', value: string): void {
    serverVariables[index][field] = value;
  }

  function getServerVariablesMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const v of serverVariables) {
      if (v.key.trim()) {
        map[v.key.trim()] = v.value;
      }
    }
    return map;
  }

  function renderVariablesTable(): void {
    variablesBody.innerHTML = '';

    if (serverVariables.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground);">No server variables defined</td>';
      variablesBody.appendChild(row);
      return;
    }

    serverVariables.forEach((v, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" value="${escapeHtml(v.key)}" placeholder="Variable name" data-index="${index}" data-field="key" /></td>
        <td><input type="text" value="${escapeHtml(v.value)}" placeholder="Value" data-index="${index}" data-field="value" /></td>
        <td><button class="remove-btn" data-index="${index}">Remove</button></td>
      `;

      const inputs = row.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const idx = parseInt(target.dataset.index!, 10);
          const field = target.dataset.field as 'key' | 'value';
          updateVariable(idx, field, target.value);
        });
      });

      const removeBtn = row.querySelector('.remove-btn') as HTMLButtonElement;
      removeBtn.addEventListener('click', () => {
        removeVariable(index);
      });

      variablesBody.appendChild(row);
    });
  }

  function saveTest(): void {
    vscode.postMessage({
      type: 'promptSaveTestCase',
      payload: {
        url: urlInput.value,
        rules: rulesTextarea.value,
        serverVariables: getServerVariablesMap()
      }
    });
  }

  function loadSelectedTest(): void {
    const name = savedTestsSelect.value;
    if (!name) return;

    const testCase = savedTestCases.find(tc => tc.name === name);
    if (testCase) {
      urlInput.value = testCase.url;
      rulesTextarea.value = testCase.rules;
      serverVariables = Object.entries(testCase.serverVariables).map(([key, value]) => ({ key, value }));
      renderVariablesTable();
    }
  }

  function deleteSelectedTest(): void {
    const name = savedTestsSelect.value;
    if (!name) return;

    if (confirm(`Delete test case "${name}"?`)) {
      vscode.postMessage({
        type: 'deleteTestCase',
        payload: { name }
      });
    }
  }

  function renderSavedTestsDropdown(): void {
    savedTestsSelect.innerHTML = '<option value="">-- Select a saved test --</option>';
    savedTestCases.forEach(tc => {
      const option = document.createElement('option');
      option.value = tc.name;
      option.textContent = tc.name;
      savedTestsSelect.appendChild(option);
    });
  }

  function onFilterChange(): void {
    currentFilter = filterSelect.value as TraceFilter;
    if (currentResult) {
      renderTraceTable();
    }
  }

  function showResults(): void {
    if (!currentResult) return;

    resultsSection.style.display = 'block';
    outputUrl.textContent = currentResult.outputUrl || '(no change)';
    outputStatus.textContent = currentResult.outputStatusCode?.toString() || '-';
    outputStatus.className = currentResult.outputStatusCode ? 'result-value status-code' : 'result-value';

    renderTraceTable();
    updateStats();
  }

  function renderTraceTable(): void {
    if (!currentResult) return;

    const lines = filterLines(currentResult.lines);
    traceBody.innerHTML = '';

    lines.forEach(line => {
      const row = document.createElement('tr');
      const statusIcon = getStatusIcon(line);
      const statusClass = getStatusClass(line);

      row.innerHTML = `
        <td class="status-icon ${statusClass}">${statusIcon}</td>
        <td class="message-cell">${line.message ? escapeHtml(line.message) : ''}</td>
        <td class="${line.isMet ? 'status-met' : 'status-not-met'}">${line.isMet ? 'Yes' : 'No'}</td>
        <td>${line.wasReached ? 'Yes' : 'No'}</td>
      `;

      traceBody.appendChild(row);
    });
  }

  function filterLines(lines: ResultLine[]): ResultLine[] {
    switch (currentFilter) {
      case 'ALL':
        return lines;
      case 'FAILED_ONLY':
        return lines.filter(l => !l.isValid || !l.isSupported);
      case 'REACHED_ONLY':
        return lines.filter(l => l.wasReached);
      case 'MET_ONLY':
        return lines.filter(l => l.isMet);
    }
  }

  function getStatusIcon(line: ResultLine): string {
    if (!line.isValid) return '\u2717'; // X
    if (!line.isSupported) return '\u26A0'; // Warning
    if (line.isMet) return '\u2713'; // Checkmark
    return '\u25CB'; // Circle
  }

  function getStatusClass(line: ResultLine): string {
    if (!line.isValid) return 'status-invalid';
    if (!line.isSupported) return 'status-warning';
    if (line.isMet) return 'status-valid';
    return '';
  }

  function updateStats(): void {
    if (!currentResult) return;

    const lines = currentResult.lines;
    statsTotal.textContent = lines.length.toString();
    statsMet.textContent = lines.filter(l => l.isMet).length.toString();
    statsNotMet.textContent = lines.filter(l => !l.isMet && l.wasReached).length.toString();
    statsInvalid.textContent = lines.filter(l => !l.isValid).length.toString();
    statsNotReached.textContent = lines.filter(l => !l.wasReached).length.toString();
  }

  function showRawOutput(): void {
    if (!currentResult) return;

    try {
      const formatted = JSON.stringify(JSON.parse(currentResult.rawResponse), null, 2);
      rawContent.textContent = formatted;
    } catch {
      rawContent.textContent = currentResult.rawResponse;
    }

    rawModal.classList.add('visible');
  }

  function hideRawModal(): void {
    rawModal.classList.remove('visible');
  }

  function acknowledgeFirstRun(): void {
    firstRunNotice.classList.remove('visible');
    vscode.postMessage({ type: 'acknowledgeFirstRun' });
  }

  function setLoading(isLoading: boolean): void {
    if (isLoading) {
      loadingOverlay.classList.add('active');
      testBtn.disabled = true;
    } else {
      loadingOverlay.classList.remove('active');
      testBtn.disabled = false;
    }
  }

  function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
  }

  function hideError(): void {
    errorMessage.classList.remove('visible');
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  init();
})();
