# Htaccess Tester for VS Code

Test Apache .htaccess rewrite rules directly in VS Code using the [htaccess.madewithlove.com](https://htaccess.madewithlove.com) API.

## Features

- Test rewrite rules against any URL
- Define custom server variables
- View per-rule evaluation traces
- Filter results (all, failed, reached, met)
- Save and load test cases per workspace
- Load rules directly from open .htaccess files
- Share test cases via URL

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
| `htaccessTester.requestTimeoutMs` | `10000` | Request timeout in milliseconds |
| `htaccessTester.maxRetryAttempts` | `2` | Maximum retry attempts for failed requests |

## Privacy Notice

This extension sends your htaccess rules and test URLs to the htaccess.madewithlove.com API for evaluation. No data is permanently stored, but be aware that your test data is transmitted over the internet.

## Requirements

- VS Code 1.85.0 or higher
- Internet connection

## License

MIT
