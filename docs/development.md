# Development Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- VS Code

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kevinquillen/htaccess-tester-vscode.git
   cd htaccess-tester-vscode
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

## Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new window, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. Run "Htaccess Tester: Open"

## Project Structure

```
htaccess-tester-vscode/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── commands/             # Command handlers
│   ├── webview/              # Webview panel and UI
│   ├── domain/               # Business logic
│   │   ├── model/            # Domain models
│   │   └── service/          # Domain services
│   ├── http/                 # HTTP client
│   ├── storage/              # Persistence
│   └── util/                 # Utilities
├── test/                     # Unit tests
├── docs/                     # Documentation
└── out/                      # Compiled output
```

## Development Workflow

### Watch Mode

Run the TypeScript compiler in watch mode:
```bash
npm run watch
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Architecture

### Domain Layer

Pure TypeScript with no VS Code dependencies. Contains:
- Models: `TestRequest`, `TestResult`, `ResultLine`
- Services: `HtaccessTestService`

### HTTP Layer

Handles API communication:
- DTOs for API contracts
- Mapper for DTO to domain conversion
- Client with retry logic and error handling

### Webview Layer

VS Code webview implementation:
- `panel.ts`: Panel management and message handling
- `bridge.ts`: Message type definitions
- `ui/`: HTML, CSS, and client-side JavaScript

### Commands

VS Code command handlers that connect the UI to services.

## Adding Features

1. Define domain models if needed
2. Implement business logic in services
3. Add message types to the bridge
4. Update webview UI
5. Connect via panel message handlers

## Debugging

1. Set breakpoints in VS Code
2. Press F5 to start debugging
3. Use the Debug Console for logs
4. Webview console: Developer Tools in Extension Host window
