/**
 * Tailwind CSS v4 Migration Verification Tests
 *
 * Feature: tailwind-v4-migration
 * Tests Properties 1–6 from the design document.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const GLOBALS_CSS = fs.readFileSync(path.join(PROJECT_ROOT, 'styles', 'globals.css'), 'utf-8');
const POSTCSS_CONFIG = fs.readFileSync(path.join(PROJECT_ROOT, '..', 'postcss.config.js'), 'utf-8');

/** Recursively collect files matching an extension under a directory */
function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

/** Collect all .tsx files under src/ (absolute paths) */
function allTsxFiles(): string[] {
  return collectFiles(PROJECT_ROOT, '.tsx');
}

/** Collect all .tsx files under src/components/ui/ (absolute paths) */
function uiComponentFiles(): string[] {
  const uiDir = path.join(PROJECT_ROOT, 'components', 'ui');
  return fs.readdirSync(uiDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(uiDir, f));
}

/**
 * Extract CSS variable declarations from a block of text that lives inside
 * a given selector (`:root` or `.dark`) within an `@layer base` context.
 * Returns an array of { name, value } for color-related variables.
 */
function extractColorVarsFromSelector(css: string, selector: ':root' | '.dark'): { name: string; value: string }[] {
  // Find all @layer base blocks
  const layerBaseRegex = /@layer\s+base\s*\{([\s\S]*?)\n\}/g;
  const results: { name: string; value: string }[] = [];

  let layerMatch: RegExpExecArray | null;
  while ((layerMatch = layerBaseRegex.exec(css)) !== null) {
    const layerContent = layerMatch[1];

    // Find the selector block within this @layer base
    const selectorEscaped = selector.replace('.', '\\.');
    const selectorRegex = new RegExp(`${selectorEscaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'g');
    let selectorMatch: RegExpExecArray | null;
    while ((selectorMatch = selectorRegex.exec(layerContent)) !== null) {
      const block = selectorMatch[1];
      // Extract variable declarations
      const varRegex = /--([\w-]+)\s*:\s*(.+?)\s*;/g;
      let varMatch: RegExpExecArray | null;
      while ((varMatch = varRegex.exec(block)) !== null) {
        const name = varMatch[1];
        const value = varMatch[2];
        // Skip non-color variables like --radius, --mode, --z-index-cloudinary
        if (name === 'radius' || name === 'mode' || name.startsWith('z-index')) continue;
        results.push({ name: `--${name}`, value });
      }
    }
  }
  return results;
}

/**
 * Extract the @theme inline block content.
 */
function extractThemeInlineBlock(css: string): string {
  const match = css.match(/@theme\s+inline\s*\{([\s\S]*?)\n\}/);
  return match ? match[1] : '';
}

// ─── 8.1: Unit tests for CSS config correctness ────────────────────────────


describe('Feature: tailwind-v4-migration — CSS Config Correctness', () => {
  /**
   * Validates: Requirements 2.1
   */
  it('globals.css uses @import "tailwindcss" and has no @tailwind directives', () => {
    expect(GLOBALS_CSS).toContain('@import "tailwindcss"');
    expect(GLOBALS_CSS).not.toMatch(/@tailwind\s+(base|components|utilities)/);
  });

  /**
   * Property 1: All color CSS variables have hsl() wrappers
   * Validates: Requirements 3.1, 3.2, 3.4, 3.5
   */
  it('Property 1: all color CSS variables in :root have hsl() wrappers', () => {
    const rootVars = extractColorVarsFromSelector(GLOBALS_CSS, ':root');
    expect(rootVars.length).toBeGreaterThan(0);
    for (const { name, value } of rootVars) {
      expect(value, `${name} should be wrapped in hsl()`).toMatch(/^hsl\(/);
    }
  });

  it('Property 1: all color CSS variables in .dark have hsl() wrappers', () => {
    const darkVars = extractColorVarsFromSelector(GLOBALS_CSS, '.dark');
    expect(darkVars.length).toBeGreaterThan(0);
    for (const { name, value } of darkVars) {
      expect(value, `${name} should be wrapped in hsl()`).toMatch(/^hsl\(/);
    }
  });

  /**
   * Property 2: No double hsl() wrapping in @theme inline
   * Validates: Requirements 3.3
   */
  it('Property 2: @theme inline uses var() without hsl() double-wrapping', () => {
    const themeBlock = extractThemeInlineBlock(GLOBALS_CSS);
    expect(themeBlock.length).toBeGreaterThan(0);
    // Should not contain hsl(var(--...))
    expect(themeBlock).not.toMatch(/hsl\(\s*var\(/);
    // Color tokens should use var(--...) directly
    const colorLines = themeBlock.split('\n').filter(l => l.includes('--color-'));
    expect(colorLines.length).toBeGreaterThan(0);
    for (const line of colorLines) {
      expect(line, `Theme color line should use var() directly: ${line.trim()}`).toMatch(/var\(--[\w-]+\)/);
    }
  });

  /**
   * Property 3: All v3 theme keys migrated to v4 CSS config
   * Validates: Requirements 2.6
   */
  it('Property 3: all expected theme color tokens exist in @theme inline', () => {
    const themeBlock = extractThemeInlineBlock(GLOBALS_CSS);
    const expectedColorTokens = [
      '--color-background', '--color-foreground',
      '--color-card', '--color-card-foreground',
      '--color-popover', '--color-popover-foreground',
      '--color-primary', '--color-primary-foreground',
      '--color-secondary', '--color-secondary-foreground',
      '--color-muted', '--color-muted-foreground',
      '--color-accent', '--color-accent-foreground',
      '--color-destructive', '--color-destructive-foreground',
      '--color-border', '--color-input', '--color-ring',
      '--color-chart-1', '--color-chart-2', '--color-chart-3', '--color-chart-4', '--color-chart-5',
      '--color-success', '--color-success-foreground',
      '--color-info', '--color-info-foreground',
      '--color-warning', '--color-warning-foreground',
      '--color-surface', '--color-surface-variant',
    ];
    for (const token of expectedColorTokens) {
      expect(themeBlock, `Missing theme token: ${token}`).toContain(token);
    }
  });

  it('Property 3: radius, keyframes, and animations exist in @theme inline', () => {
    const themeBlock = extractThemeInlineBlock(GLOBALS_CSS);
    expect(themeBlock).toContain('--radius-lg');
    expect(themeBlock).toContain('--radius-md');
    expect(themeBlock).toContain('--radius-sm');
    expect(themeBlock).toContain('--animate-accordion-down');
    expect(themeBlock).toContain('--animate-accordion-up');
    expect(themeBlock).toContain('@keyframes accordion-down');
    expect(themeBlock).toContain('@keyframes accordion-up');
  });

  it('postcss.config.js references @tailwindcss/postcss', () => {
    expect(POSTCSS_CONFIG).toContain('@tailwindcss/postcss');
    // Should NOT reference old tailwindcss or autoprefixer plugins
    expect(POSTCSS_CONFIG).not.toMatch(/['"]tailwindcss['"]\s*:/);
    expect(POSTCSS_CONFIG).not.toContain('autoprefixer');
  });
});


// ─── 8.2: Property test for deprecated utility class absence ────────────────

describe('Feature: tailwind-v4-migration — Property 4: No deprecated v3 utility class names in source files', () => {
  /**
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
   *
   * Uses fast-check to randomly sample .tsx files and assert none contain
   * deprecated v3 utility class names.
   */
  const tsxFiles = allTsxFiles();

  // Arbitrary that picks a random file from the list
  const fileArb = fc.integer({ min: 0, max: tsxFiles.length - 1 }).map(i => tsxFiles[i]);

  /**
   * Regex patterns for deprecated classes.
   *
   * The v3→v4 renames already happened in earlier tasks.
   * What we check: outline-none should not exist (replaced by outline-hidden).
   * For ring/blur, the bare forms without suffix should not exist
   * as standalone classes.
   */
  const deprecatedPatterns: RegExp[] = [
    // outline-none should be outline-hidden
    /(?:^|[\s"'`{:])outline-none(?:[\s"'`}:;,]|$)/m,
    // bare "ring" without a width suffix (ring-1, ring-2, etc. are fine)
    /(?:^|[\s"'`{:])ring(?:[\s"'`}:;,]|$)/m,
    // bare "blur" without suffix (blur-sm, blur-md etc. are fine)
    /(?:^|[\s"'`{:])blur(?:[\s"'`}:;,]|$)/m,
  ];

  it('Property 4: no deprecated v3 utility class names in randomly sampled .tsx files', () => {
    fc.assert(
      fc.property(fileArb, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of deprecatedPatterns) {
          if (pattern.test(content)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: Math.min(200, tsxFiles.length * 3) },
    );
  });
});

// ─── 8.3: Property test for forwardRef removal ─────────────────────────────

describe('Feature: tailwind-v4-migration — Property 5: No React.forwardRef in shadcn/ui components', () => {
  /**
   * Validates: Requirements 5.1, 5.2
   */
  const uiFiles = uiComponentFiles();

  const fileArb = fc.integer({ min: 0, max: uiFiles.length - 1 }).map(i => uiFiles[i]);

  it('Property 5: no React.forwardRef in randomly sampled ui component files', () => {
    fc.assert(
      fc.property(fileArb, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        return !content.includes('React.forwardRef') && !content.includes('forwardRef(');
      }),
      { numRuns: Math.min(200, uiFiles.length * 5) },
    );
  });
});

// ─── 8.4: Property test for border color safety ────────────────────────────

describe('Feature: tailwind-v4-migration — Property 6: Bare border classes have explicit color', () => {
  /**
   * Validates: Requirements 5.5, 9.1
   *
   * For files using the bare `border` class, checks that an explicit border
   * color class is also present on the same element or in the same className string.
   *
   * We look for className strings containing "border" as a standalone token
   * and verify they also contain a border-color class like border-border,
   * border-{color}, etc.
   */
  const tsxFiles2 = allTsxFiles();
  const fileArb2 = tsxFiles2.length > 0
    ? fc.integer({ min: 0, max: tsxFiles2.length - 1 }).map(i => tsxFiles2[i])
    : fc.constant('');

  /**
   * Checks if a className string that contains bare "border" also has
   * an explicit border color. Returns true if safe, false if violation.
   */
  function checkBorderColorSafety(content: string): boolean {
    // Find all className/class string literals
    const classNameRegex = /className\s*=\s*(?:{[^}]*?(?:`[^`]*`|"[^"]*"|'[^']*')[^}]*}|"[^"]*"|'[^']*'|{`[^`]*`})/g;
    let match: RegExpExecArray | null;

    while ((match = classNameRegex.exec(content)) !== null) {
      const classStr = match[0];

      // Check if this className contains bare "border" (not border-{something})
      // border as a standalone utility: adds 1px border
      const hasBareBorder = /(?:^|[\s"'`{,])border(?:[\s"'`},]|$)/.test(classStr);
      if (!hasBareBorder) continue;

      // Check if there's an explicit border color class
      // Patterns: border-border, border-{color}-{shade}, border-transparent,
      // border-current, border-inherit, border-white, border-black,
      // border-slate-*, border-red-*, etc.
      const hasBorderColor = /border-(?:border|transparent|current|inherit|white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|primary|secondary|destructive|muted|accent|foreground|input|ring|success|info|warning|surface)/.test(classStr);

      if (!hasBorderColor) {
        // Also check for arbitrary border color: border-[...] or border-(...)
        const hasArbitraryBorderColor = /border-[\[(]/.test(classStr);
        if (!hasArbitraryBorderColor) {
          // Violation: bare border without explicit color and no arbitrary color
          return false;
        }
      }
    }
    return true;
  }

  it('Property 6: bare border classes have explicit color or are covered by global rule', () => {
    // Skip test if no .tsx files found
    if (tsxFiles2.length === 0) {
      console.warn('No .tsx files found; skipping Property 6 test');
      return;
    }

    // Check if the global border-border rule exists in globals.css
    const hasGlobalBorderRule = /\*\s*\{[\s\S]*?@apply\s+border-border/.test(GLOBALS_CSS);

    fc.assert(
      fc.property(fileArb2, (filePath) => {
        if (!filePath) return true; // Skip empty placeholder
        const content = fs.readFileSync(filePath, 'utf-8');
        // If global rule exists, all bare borders are safe; otherwise check each file
        return hasGlobalBorderRule || checkBorderColorSafety(content);
      }),
      { numRuns: Math.min(200, tsxFiles2.length * 3) },
    );
  });
});
