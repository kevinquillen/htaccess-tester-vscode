# Htaccess Tester API Contract

This document describes the API contract for the htaccess.madewithlove.com service.

## Base URL

```
https://htaccess.madewithlove.com/api
```

## Endpoints

### POST /test

Test htaccess rewrite rules against a URL.

#### Request

```json
{
  "url": "https://example.com/old-page",
  "htaccess": "RewriteEngine On\nRewriteRule ^old-page$ /new-page [R=301,L]",
  "serverVariables": {
    "DOCUMENT_ROOT": "/var/www/html",
    "SERVER_NAME": "example.com"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The URL to test against the rules |
| `htaccess` | string | Yes | The htaccess rules to evaluate |
| `serverVariables` | object | No | Key-value pairs of server variables |

#### Response (Success - 200)

```json
{
  "output_url": "https://example.com/new-page",
  "output_status_code": 301,
  "lines": [
    {
      "line": "RewriteEngine On",
      "message": null,
      "met": true,
      "valid": true,
      "reached": true,
      "supported": true
    },
    {
      "line": "RewriteRule ^old-page$ /new-page [R=301,L]",
      "message": "The new URL is https://example.com/new-page",
      "met": true,
      "valid": true,
      "reached": true,
      "supported": true
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `output_url` | string | The final URL after all rewrites |
| `output_status_code` | number | HTTP status code (null if no redirect) |
| `lines` | array | Per-rule evaluation results |
| `lines[].line` | string | The rule text |
| `lines[].message` | string | Optional feedback message |
| `lines[].met` | boolean | Whether the condition was satisfied |
| `lines[].valid` | boolean | Whether the syntax is valid |
| `lines[].reached` | boolean | Whether execution reached this rule |
| `lines[].supported` | boolean | Whether the feature is supported |

#### Response (Error - 4xx/5xx)

```json
{
  "error": "Invalid URL format",
  "details": "The provided URL must start with http:// or https://"
}
```

## Error Codes

| Status | Description | Retryable |
|--------|-------------|-----------|
| 400 | Bad Request - Invalid input | No |
| 429 | Too Many Requests - Rate limited | No (wait) |
| 500 | Internal Server Error | Yes |
| 502 | Bad Gateway | Yes |
| 503 | Service Unavailable | Yes |
| 504 | Gateway Timeout | Yes |

## Rate Limiting

The API implements rate limiting. If you receive a 429 response, wait before making additional requests.

## Timeouts

- Default request timeout: 10 seconds
- Maximum configurable timeout: 60 seconds

## Retry Strategy

For retryable errors (5xx), use exponential backoff:
- First retry: 1 second
- Second retry: 2 seconds
- Third retry: 4 seconds
- Maximum delay: 10 seconds

## Privacy Notice

All requests are processed remotely. While data is not permanently stored, users should be aware that their htaccess rules and test URLs are transmitted over the internet.
