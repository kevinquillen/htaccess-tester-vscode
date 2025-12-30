# Htaccess Tester for VS Code

Test Apache .htaccess rewrite rules directly in VS Code with a fully offline engine. No internet connection required.

## Features

- Test rewrite rules against any URL
- Define custom server variables
- View per-rule evaluation traces
- Filter results (all, failed, reached, met)
- Save and load test cases per workspace
- Load rules directly from open .htaccess files
- **Offline evaluation** - no network required

## Supported Directives

- `RewriteEngine On/Off`
- `RewriteBase`
- `RewriteCond` with:
  - Variable expansion (`%{HTTP_HOST}`, `%{REQUEST_URI}`, etc.)
  - Pattern matching with regex
  - Negation (`!`)
  - Flags: `[NC]`, `[OR]`
- `RewriteRule` with:
  - Pattern matching with backreferences (`$1`, `$2`, etc.)
  - Condition backreferences (`%1`, `%2`, etc.)
  - Flags: `[L]`, `[R]`, `[R=301]`, `[NC]`, `[QSA]`, `[QSD]`, `[NE]`, `[END]`, `[F]`, `[G]`

## Limitations

Some Apache features are not supported in offline mode:

- Filesystem tests (`-f`, `-d`, `-s`)
- Proxy pass-through (`[P]`)
- Environment variable setting (`[E=]`)
- Cookie setting (`[CO=]`)
- Some PCRE regex features not available in JavaScript

## Usage

### Open the Tester

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Htaccess Tester: Open"

### Test from an .htaccess File

1. Open a `.htaccess` file
2. Right-click in the editor
3. Select "Htaccess Tester: Test Current File"

Or use the Command Palette: "Htaccess Tester: Test Current File"

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `htaccessTester.engine.maxIterations` | `100` | Maximum rule iterations (prevents infinite loops) |
| `htaccessTester.engine.maxUrlLength` | `8192` | Maximum URL length in characters |
| `htaccessTester.engine.maxRegexSubjectLength` | `2048` | Maximum length for regex matching |
| `htaccessTester.engine.maxRuleCount` | `1000` | Maximum number of rules |

## Requirements

- VS Code 1.85.0 or higher

## License

MIT
