#!/usr/bin/env node

/**
 * Check for broken internal documentation links
 * Validates that all relative links point to existing files
 */

import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');

function walkDir(dir: string, callback: (file: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== '_archive') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file.endsWith('.md')) {
      callback(filePath);
    }
  }
}

function extractLinks(content: string): Array<{ link: string; line: number }> {
  const links: Array<{ link: string; line: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match markdown links: [text](link)
    const matches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);

    for (const match of matches) {
      const link = match[2];
      // Only check relative links (not http/https or other schemes like mailto:, ftp:, tel:, data:)
      if (!link.startsWith('http://') && !link.startsWith('https://') && !link.startsWith('#') && !link.includes('://')) {
        links.push({ link, line: i + 1 });
      }
    }
  }

  return links;
}

function resolveLink(baseDir: string, link: string): string {
  // Remove anchor if present
  const [filePath] = link.split('#');
  return path.resolve(baseDir, filePath);
}

function main(): void {
  const brokenLinks: Array<{ file: string; link: string; line: number }> = [];

  walkDir(DOCS_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const links = extractLinks(content);
    const baseDir = path.dirname(filePath);

    for (const { link, line } of links) {
      const resolvedPath = resolveLink(baseDir, link);

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        brokenLinks.push({
          file: path.relative(DOCS_DIR, filePath),
          link,
          line
        });
      }
    }
  });

  if (brokenLinks.length > 0) {
    console.log('\n🔗 BROKEN DOCUMENTATION LINKS FOUND\n');
    console.log(`Found ${brokenLinks.length} broken link(s):\n`);

    for (const { file, link, line } of brokenLinks) {
      console.log(`  📄 ${file}:${line}`);
      console.log(`     Link: ${link}\n`);
    }

    process.exit(1);
  } else {
    console.log('✅ All documentation links are valid!');
    process.exit(0);
  }
}

main();
