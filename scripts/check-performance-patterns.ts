#!/usr/bin/env tsx
/**
 * Performance Pattern Checker
 * 
 * This script checks for common performance anti-patterns in the codebase.
 * Run this before committing to catch potential performance issues early.
 * 
 * Usage:
 * npx tsx scripts/check-performance-patterns.ts
 * 
 * Or add to package.json:
 * "scripts": {
 *   "check:performance": "tsx scripts/check-performance-patterns.ts"
 * }
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
  file: string;
  line: number;
  pattern: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

const issues: Issue[] = [];

// Performance anti-patterns to detect
const patterns = [
  {
    name: 'N+1 Query - Individual Queries in Loop',
    regex: /for\s*\([^)]*\)\s*\{[^}]*await\s+databases\.listDocuments\s*\([^)]*Query\.equal\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\w+\s*\)/gs,
    severity: 'error' as const,
    message: 'Potential N+1 query problem: Individual database queries in a loop',
    suggestion: 'Use batch fetching with Query.equal(field, [array]) instead. See docs/guides/PERFORMANCE_BEST_PRACTICES.md'
  },
  {
    name: 'Sequential Await in Loop',
    regex: /for\s*\([^)]*\)\s*\{[^}]*await\s+(?!Promise\.all)/gs,
    severity: 'warning' as const,
    message: 'Sequential await in loop may cause performance issues',
    suggestion: 'Consider using Promise.all() for parallel execution or batch processing'
  },
  {
    name: 'Fetch in Component Render',
    regex: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*fetch\s*\(/gs,
    severity: 'warning' as const,
    message: 'Fetch call in component body (not in useEffect)',
    suggestion: 'Move fetch calls to useEffect to avoid repeated calls on every render'
  },
  {
    name: 'JSON.parse in Loop',
    regex: /(?:forEach|map|filter)\s*\([^)]*JSON\.parse/gs,
    severity: 'warning' as const,
    message: 'JSON.parse called repeatedly in array iteration',
    suggestion: 'Parse once before the loop and cache the result'
  }
];

function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern.regex);
    
    for (const match of matches) {
      // Find line number
      const matchIndex = match.index || 0;
      const lineNumber = content.substring(0, matchIndex).split('\n').length;
      
      // Get context (3 lines around the match)
      const contextStart = Math.max(0, lineNumber - 2);
      const contextEnd = Math.min(lines.length, lineNumber + 2);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Skip if it's in a comment
      const matchedLine = lines[lineNumber - 1];
      if (matchedLine && matchedLine.trim().startsWith('//')) {
        continue;
      }
      
      issues.push({
        file: filePath,
        line: lineNumber,
        pattern: pattern.name,
        severity: pattern.severity,
        message: pattern.message,
        suggestion: pattern.suggestion
      });
    }
  });
}

function scanDirectory(dir: string, extensions: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .next, .git, etc.
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist', 'build', 'api'].includes(entry.name)) {
        scanDirectory(fullPath, extensions);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        checkFile(fullPath);
      }
    }
  }
}

function main() {
  console.log('🔍 Checking for performance anti-patterns...\n');

  // Scan API routes (most critical)
  const apiDir = path.join(process.cwd(), 'src', 'pages', 'api');
  if (fs.existsSync(apiDir)) {
    console.log('📂 Scanning API routes...');
    scanDirectory(apiDir, ['.ts', '.tsx']);
  }

  // Scan components
  const componentsDir = path.join(process.cwd(), 'src', 'components');
  if (fs.existsSync(componentsDir)) {
    console.log('📂 Scanning components...');
    scanDirectory(componentsDir, ['.ts', '.tsx']);
  }

  // Scan pages
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  if (fs.existsSync(pagesDir)) {
    console.log('📂 Scanning pages...');
    scanDirectory(pagesDir, ['.ts', '.tsx']);
  }

  console.log();

  // Report issues
  if (issues.length === 0) {
    console.log('✅ No performance anti-patterns detected!\n');
    process.exit(0);
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} performance error(s):\n`);
    errors.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Pattern: ${issue.pattern}`);
      console.log(`   Issue: ${issue.message}`);
      console.log(`   Suggestion: ${issue.suggestion}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} performance warning(s):\n`);
    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Pattern: ${issue.pattern}`);
      console.log(`   Issue: ${issue.message}`);
      console.log(`   Suggestion: ${issue.suggestion}\n`);
    });
  }

  console.log('📚 For more information, see: docs/guides/PERFORMANCE_BEST_PRACTICES.md\n');

  // Exit with error code if there are errors
  if (errors.length > 0) {
    console.log('❌ Performance check failed. Please fix the errors above.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Performance check passed with warnings. Consider addressing them.\n');
    process.exit(0);
  }
}

main();
