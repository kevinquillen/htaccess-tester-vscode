/**
 * Htaccess Parser - Strict, lossless AST parser for .htaccess files.
 * Preserves original line text and line numbers for trace output.
 */

import {
  AstNode,
  HtaccessDocument,
  RewriteEngineDirective,
  RewriteBaseDirective,
  RewriteCondDirective,
  RewriteRuleDirective,
  ParseErrorNode,
  CondFlags,
  RuleFlags,
  defaultCondFlags,
  defaultRuleFlags
} from './ast';

/**
 * Parse htaccess content into an AST
 */
export function parse(content: string): HtaccessDocument {
  const lines = content.split(/\r?\n/);
  const nodes: AstNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = i + 1;
    const node = parseLine(rawLine, lineNo);
    nodes.push(node);
  }

  return { nodes };
}

/**
 * Parse a single line into an AST node
 */
function parseLine(rawLine: string, lineNo: number): AstNode {
  const trimmed = rawLine.trim();

  // Blank line
  if (trimmed === '') {
    return { kind: 'BlankLine', sourceLineNo: lineNo, rawLine };
  }

  // Comment
  if (trimmed.startsWith('#')) {
    return {
      kind: 'Comment',
      sourceLineNo: lineNo,
      rawLine,
      text: trimmed.slice(1).trim()
    };
  }

  // Try to parse as directive
  return parseDirective(rawLine, lineNo, trimmed);
}

/**
 * Parse a directive line
 */
function parseDirective(rawLine: string, lineNo: number, trimmed: string): AstNode {
  // Match directive name and args
  const match = trimmed.match(/^(\S+)\s*(.*)?$/);
  if (!match) {
    return { kind: 'ParseError', sourceLineNo: lineNo, rawLine, message: 'Invalid syntax' };
  }

  const [, directiveName, argsStr] = match;
  const directive = directiveName.toLowerCase();
  const args = argsStr?.trim() ?? '';

  switch (directive) {
    case 'rewriteengine':
      return parseRewriteEngine(rawLine, lineNo, args);
    case 'rewritebase':
      return parseRewriteBase(rawLine, lineNo, args);
    case 'rewritecond':
      return parseRewriteCond(rawLine, lineNo, args);
    case 'rewriterule':
      return parseRewriteRule(rawLine, lineNo, args);
    default:
      return {
        kind: 'Unknown',
        sourceLineNo: lineNo,
        rawLine,
        directive: directiveName,
        args
      };
  }
}

/**
 * Parse RewriteEngine directive
 */
function parseRewriteEngine(rawLine: string, lineNo: number, args: string): RewriteEngineDirective | ParseErrorNode {
  const on = args.toLowerCase() === 'on';
  const off = args.toLowerCase() === 'off';

  if (!on && !off) {
    return {
      kind: 'ParseError',
      sourceLineNo: lineNo,
      rawLine,
      message: `Invalid RewriteEngine value: ${args}`
    };
  }

  return {
    kind: 'RewriteEngine',
    sourceLineNo: lineNo,
    rawLine,
    on
  };
}

/**
 * Parse RewriteBase directive
 */
function parseRewriteBase(rawLine: string, lineNo: number, args: string): RewriteBaseDirective | ParseErrorNode {
  if (!args) {
    return {
      kind: 'ParseError',
      sourceLineNo: lineNo,
      rawLine,
      message: 'RewriteBase requires a path argument'
    };
  }

  return {
    kind: 'RewriteBase',
    sourceLineNo: lineNo,
    rawLine,
    base: args
  };
}

/**
 * Parse RewriteCond directive
 */
function parseRewriteCond(rawLine: string, lineNo: number, args: string): RewriteCondDirective | ParseErrorNode {
  // RewriteCond TestString CondPattern [flags]
  // The pattern might have spaces if quoted, but typically doesn't
  const parts = splitCondArgs(args);

  if (parts.length < 2) {
    return {
      kind: 'ParseError',
      sourceLineNo: lineNo,
      rawLine,
      message: 'RewriteCond requires TestString and CondPattern'
    };
  }

  const testString = parts[0];
  let condPattern = parts[1];
  const flagsStr = parts.length > 2 ? parts[2] : '';

  // Check for negation
  const isNegated = condPattern.startsWith('!');
  if (isNegated) {
    condPattern = condPattern.slice(1);
  }

  const flags = parseCondFlags(flagsStr);

  return {
    kind: 'RewriteCond',
    sourceLineNo: lineNo,
    rawLine,
    testString,
    condPattern,
    flags,
    isNegated
  };
}

/**
 * Split RewriteCond arguments, respecting quoted strings
 */
function splitCondArgs(args: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
    } else if (!inQuote && /\s/.test(char)) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * Parse RewriteCond flags
 */
function parseCondFlags(flagsStr: string): CondFlags {
  const flags = defaultCondFlags();

  if (!flagsStr) return flags;

  // Remove brackets if present
  const cleaned = flagsStr.replace(/^\[|\]$/g, '');
  if (!cleaned) return flags;

  const parts = cleaned.split(',');

  for (const part of parts) {
    const flag = part.trim().toUpperCase();
    switch (flag) {
      case 'NC':
      case 'NOCASE':
        flags.nocase = true;
        break;
      case 'OR':
      case 'ORNEXT':
        flags.ornext = true;
        break;
    }
  }

  return flags;
}

/**
 * Parse RewriteRule directive
 */
function parseRewriteRule(rawLine: string, lineNo: number, args: string): RewriteRuleDirective | ParseErrorNode {
  // RewriteRule Pattern Substitution [flags]
  const parts = splitRuleArgs(args);

  if (parts.length < 2) {
    return {
      kind: 'ParseError',
      sourceLineNo: lineNo,
      rawLine,
      message: 'RewriteRule requires Pattern and Substitution'
    };
  }

  const pattern = parts[0];
  const substitution = parts[1];
  const flagsStr = parts.length > 2 ? parts[2] : '';

  const flags = parseRuleFlags(flagsStr);

  return {
    kind: 'RewriteRule',
    sourceLineNo: lineNo,
    rawLine,
    pattern,
    substitution,
    flags
  };
}

/**
 * Split RewriteRule arguments, respecting quoted strings
 */
function splitRuleArgs(args: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
    } else if (!inQuote && /\s/.test(char)) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * Parse RewriteRule flags
 */
function parseRuleFlags(flagsStr: string): RuleFlags {
  const flags = defaultRuleFlags();

  if (!flagsStr) return flags;

  // Remove brackets if present
  const cleaned = flagsStr.replace(/^\[|\]$/g, '');
  if (!cleaned) return flags;

  const parts = cleaned.split(',');

  for (const part of parts) {
    const flag = part.trim();
    const upperFlag = flag.toUpperCase();

    // Handle flags with values (R=301, S=2, T=type, etc.)
    if (flag.includes('=')) {
      const [name, value] = flag.split('=', 2);
      const upperName = name.toUpperCase();

      switch (upperName) {
        case 'R':
        case 'REDIRECT':
          flags.redirect = parseInt(value, 10) || 302;
          break;
        case 'S':
        case 'SKIP':
          flags.skip = parseInt(value, 10) || 1;
          break;
        case 'T':
        case 'TYPE':
          flags.type = value;
          break;
        case 'E':
        case 'ENV':
          flags.env.push(value);
          break;
        case 'CO':
        case 'COOKIE':
          flags.cookie.push(value);
          break;
      }
    } else {
      // Simple flags
      switch (upperFlag) {
        case 'L':
        case 'LAST':
          flags.last = true;
          break;
        case 'R':
        case 'REDIRECT':
          flags.redirect = 302; // Default redirect code
          break;
        case 'NC':
        case 'NOCASE':
          flags.nocase = true;
          break;
        case 'QSA':
        case 'QSAPPEND':
          flags.qsappend = true;
          break;
        case 'QSD':
        case 'QSDISCARD':
          flags.qsdiscard = true;
          break;
        case 'NE':
        case 'NOESCAPE':
          flags.noescape = true;
          break;
        case 'N':
        case 'NEXT':
          flags.next = true;
          break;
        case 'END':
          flags.end = true;
          break;
        case 'F':
        case 'FORBIDDEN':
          flags.forbidden = true;
          break;
        case 'G':
        case 'GONE':
          flags.gone = true;
          break;
        case 'C':
        case 'CHAIN':
          flags.chain = true;
          break;
        case 'PT':
        case 'PASSTHROUGH':
          flags.passthrough = true;
          break;
        case 'P':
        case 'PROXY':
          flags.proxy = true;
          break;
      }
    }
  }

  return flags;
}
