/**
 * Unit tests for htaccess parser
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import {
  RewriteEngineDirective,
  RewriteBaseDirective,
  RewriteCondDirective,
  RewriteRuleDirective,
  BlankLineNode,
  CommentNode,
  UnknownDirective,
  ParseErrorNode
} from '../ast';

describe('Parser', () => {
  describe('blank lines', () => {
    it('should parse empty content', () => {
      const doc = parse('');
      expect(doc.nodes.length).toBe(1);
      expect(doc.nodes[0].kind).toBe('BlankLine');
    });

    it('should parse blank lines', () => {
      const doc = parse('  \n\t\n');
      expect(doc.nodes.length).toBe(3);
      doc.nodes.forEach(node => {
        expect(node.kind).toBe('BlankLine');
      });
    });
  });

  describe('comments', () => {
    it('should parse comment lines', () => {
      const doc = parse('# This is a comment');
      expect(doc.nodes.length).toBe(1);
      const node = doc.nodes[0] as CommentNode;
      expect(node.kind).toBe('Comment');
      expect(node.text).toBe('This is a comment');
    });

    it('should preserve line numbers', () => {
      const doc = parse('# First\n# Second');
      expect((doc.nodes[0] as CommentNode).sourceLineNo).toBe(1);
      expect((doc.nodes[1] as CommentNode).sourceLineNo).toBe(2);
    });
  });

  describe('RewriteEngine', () => {
    it('should parse RewriteEngine On', () => {
      const doc = parse('RewriteEngine On');
      const node = doc.nodes[0] as RewriteEngineDirective;
      expect(node.kind).toBe('RewriteEngine');
      expect(node.on).toBe(true);
    });

    it('should parse RewriteEngine Off', () => {
      const doc = parse('RewriteEngine Off');
      const node = doc.nodes[0] as RewriteEngineDirective;
      expect(node.kind).toBe('RewriteEngine');
      expect(node.on).toBe(false);
    });

    it('should be case insensitive', () => {
      const doc = parse('rewriteengine ON');
      const node = doc.nodes[0] as RewriteEngineDirective;
      expect(node.kind).toBe('RewriteEngine');
      expect(node.on).toBe(true);
    });

    it('should error on invalid value', () => {
      const doc = parse('RewriteEngine Maybe');
      const node = doc.nodes[0] as ParseErrorNode;
      expect(node.kind).toBe('ParseError');
    });
  });

  describe('RewriteBase', () => {
    it('should parse RewriteBase', () => {
      const doc = parse('RewriteBase /app/');
      const node = doc.nodes[0] as RewriteBaseDirective;
      expect(node.kind).toBe('RewriteBase');
      expect(node.base).toBe('/app/');
    });

    it('should error on missing path', () => {
      const doc = parse('RewriteBase');
      const node = doc.nodes[0] as ParseErrorNode;
      expect(node.kind).toBe('ParseError');
    });
  });

  describe('RewriteCond', () => {
    it('should parse basic RewriteCond', () => {
      const doc = parse('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$');
      const node = doc.nodes[0] as RewriteCondDirective;
      expect(node.kind).toBe('RewriteCond');
      expect(node.testString).toBe('%{HTTP_HOST}');
      expect(node.condPattern).toBe('^www\\.example\\.com$');
      expect(node.isNegated).toBe(false);
    });

    it('should parse negated condition', () => {
      const doc = parse('RewriteCond %{HTTP_HOST} !^www\\.');
      const node = doc.nodes[0] as RewriteCondDirective;
      expect(node.isNegated).toBe(true);
      expect(node.condPattern).toBe('^www\\.');
    });

    it('should parse NC flag', () => {
      const doc = parse('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$ [NC]');
      const node = doc.nodes[0] as RewriteCondDirective;
      expect(node.flags.nocase).toBe(true);
    });

    it('should parse OR flag', () => {
      const doc = parse('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$ [OR]');
      const node = doc.nodes[0] as RewriteCondDirective;
      expect(node.flags.ornext).toBe(true);
    });

    it('should parse multiple flags', () => {
      const doc = parse('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$ [NC,OR]');
      const node = doc.nodes[0] as RewriteCondDirective;
      expect(node.flags.nocase).toBe(true);
      expect(node.flags.ornext).toBe(true);
    });
  });

  describe('RewriteRule', () => {
    it('should parse basic RewriteRule', () => {
      const doc = parse('RewriteRule ^foo$ /bar');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.kind).toBe('RewriteRule');
      expect(node.pattern).toBe('^foo$');
      expect(node.substitution).toBe('/bar');
    });

    it('should parse L flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [L]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.last).toBe(true);
    });

    it('should parse R flag (default 302)', () => {
      const doc = parse('RewriteRule ^foo$ /bar [R]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.redirect).toBe(302);
    });

    it('should parse R=301 flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [R=301]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.redirect).toBe(301);
    });

    it('should parse NC flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [NC]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.nocase).toBe(true);
    });

    it('should parse QSA flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [QSA]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.qsappend).toBe(true);
    });

    it('should parse QSD flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [QSD]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.qsdiscard).toBe(true);
    });

    it('should parse NE flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [NE]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.noescape).toBe(true);
    });

    it('should parse N flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [N]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.next).toBe(true);
    });

    it('should parse END flag', () => {
      const doc = parse('RewriteRule ^foo$ /bar [END]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.end).toBe(true);
    });

    it('should parse F flag', () => {
      const doc = parse('RewriteRule ^foo$ - [F]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.forbidden).toBe(true);
    });

    it('should parse G flag', () => {
      const doc = parse('RewriteRule ^foo$ - [G]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.gone).toBe(true);
    });

    it('should parse multiple flags', () => {
      const doc = parse('RewriteRule ^foo$ /bar [R=301,L,NC,QSA]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.flags.redirect).toBe(301);
      expect(node.flags.last).toBe(true);
      expect(node.flags.nocase).toBe(true);
      expect(node.flags.qsappend).toBe(true);
    });

    it('should parse hyphen substitution', () => {
      const doc = parse('RewriteRule ^foo$ - [L]');
      const node = doc.nodes[0] as RewriteRuleDirective;
      expect(node.substitution).toBe('-');
    });
  });

  describe('unknown directives', () => {
    it('should parse unknown directives', () => {
      const doc = parse('ErrorDocument 404 /404.html');
      const node = doc.nodes[0] as UnknownDirective;
      expect(node.kind).toBe('Unknown');
      expect(node.directive).toBe('ErrorDocument');
      expect(node.args).toBe('404 /404.html');
    });
  });

  describe('preserves source info', () => {
    it('should preserve raw line text', () => {
      const line = '  RewriteEngine On  ';
      const doc = parse(line);
      expect(doc.nodes[0].rawLine).toBe(line);
    });

    it('should preserve line numbers in multi-line content', () => {
      const content = `# Comment
RewriteEngine On

RewriteRule ^foo$ /bar [L]`;
      const doc = parse(content);
      expect(doc.nodes[0].sourceLineNo).toBe(1);
      expect(doc.nodes[1].sourceLineNo).toBe(2);
      expect(doc.nodes[2].sourceLineNo).toBe(3);
      expect(doc.nodes[3].sourceLineNo).toBe(4);
    });
  });

  describe('full document parsing', () => {
    it('should parse a complete htaccess file', () => {
      const content = `# Redirect www to non-www
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
RewriteRule ^(.*)$ http://%1/$1 [R=301,L]`;

      const doc = parse(content);
      expect(doc.nodes.length).toBe(4);
      expect(doc.nodes[0].kind).toBe('Comment');
      expect(doc.nodes[1].kind).toBe('RewriteEngine');
      expect(doc.nodes[2].kind).toBe('RewriteCond');
      expect(doc.nodes[3].kind).toBe('RewriteRule');
    });
  });
});
