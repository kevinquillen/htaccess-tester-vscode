/**
 * AST types for parsed .htaccess directives.
 * Uses TypeScript discriminated unions for type safety.
 */

/**
 * Base interface for all AST nodes
 */
interface BaseNode {
  sourceLineNo: number;
  rawLine: string;
}

/**
 * RewriteEngine On/Off directive
 */
export interface RewriteEngineDirective extends BaseNode {
  kind: 'RewriteEngine';
  on: boolean;
}

/**
 * RewriteBase directive
 */
export interface RewriteBaseDirective extends BaseNode {
  kind: 'RewriteBase';
  base: string;
}

/**
 * Flags for RewriteCond
 */
export interface CondFlags {
  nocase: boolean; // [NC]
  ornext: boolean; // [OR]
}

/**
 * RewriteCond directive
 */
export interface RewriteCondDirective extends BaseNode {
  kind: 'RewriteCond';
  testString: string;
  condPattern: string;
  flags: CondFlags;
  isNegated: boolean;
}

/**
 * Flags for RewriteRule
 */
export interface RuleFlags {
  last: boolean;          // [L]
  redirect: number | null; // [R] or [R=301], null if not redirect
  nocase: boolean;        // [NC]
  qsappend: boolean;      // [QSA]
  qsdiscard: boolean;     // [QSD]
  noescape: boolean;      // [NE]
  next: boolean;          // [N]
  end: boolean;           // [END]
  forbidden: boolean;     // [F]
  gone: boolean;          // [G]
  chain: boolean;         // [C]
  skip: number | null;    // [S=n]
  passthrough: boolean;   // [PT]
  proxy: boolean;         // [P]
  type: string | null;    // [T=type]
  env: string[];          // [E=var:val]
  cookie: string[];       // [CO=...]
}

/**
 * RewriteRule directive
 */
export interface RewriteRuleDirective extends BaseNode {
  kind: 'RewriteRule';
  pattern: string;
  substitution: string;
  flags: RuleFlags;
}

/**
 * A blank line
 */
export interface BlankLineNode extends BaseNode {
  kind: 'BlankLine';
}

/**
 * A comment line
 */
export interface CommentNode extends BaseNode {
  kind: 'Comment';
  text: string;
}

/**
 * An unknown or unsupported directive
 */
export interface UnknownDirective extends BaseNode {
  kind: 'Unknown';
  directive: string;
  args: string;
}

/**
 * A parse error (invalid syntax)
 */
export interface ParseErrorNode extends BaseNode {
  kind: 'ParseError';
  message: string;
}

/**
 * Union of all AST node types
 */
export type AstNode =
  | RewriteEngineDirective
  | RewriteBaseDirective
  | RewriteCondDirective
  | RewriteRuleDirective
  | BlankLineNode
  | CommentNode
  | UnknownDirective
  | ParseErrorNode;

/**
 * Parsed htaccess document
 */
export interface HtaccessDocument {
  nodes: AstNode[];
}

/**
 * Default CondFlags
 */
export function defaultCondFlags(): CondFlags {
  return {
    nocase: false,
    ornext: false
  };
}

/**
 * Default RuleFlags
 */
export function defaultRuleFlags(): RuleFlags {
  return {
    last: false,
    redirect: null,
    nocase: false,
    qsappend: false,
    qsdiscard: false,
    noescape: false,
    next: false,
    end: false,
    forbidden: false,
    gone: false,
    chain: false,
    skip: null,
    passthrough: false,
    proxy: false,
    type: null,
    env: [],
    cookie: []
  };
}
