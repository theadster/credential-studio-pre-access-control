#!/usr/bin/env node

/**
 * Check for stale documentation files
 * Files are considered stale if they haven't been verified within their review_interval_days
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface FrontMatter {
  title?: string;
  last_verified?: string;
  review_interval_days?: number;
}

const DOCS_DIR = path.join(process.cwd(), 'docs');
const ARCHIVE_DIR = path.join(DOCS_DIR, '_archive');

function parseFrontMatter(content: string): FrontMatter {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontMatter: FrontMatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('title:')) {
      frontMatter.title = trimmedLine.replace('title:', '').trim().replace(/^["']|["']$/g, '');
    } else if (trimmedLine.startsWith('last_verified:')) {
      frontMatter.last_verified = trimmedLine.replace('last_verified:', '').trim();
    } else if (trimmedLine.startsWith('review_interval_days:')) {
      frontMatter.review_interval_days = parseInt(trimmedLine.replace('review_interval_days:', '').trim());
    }
  }

  return frontMatter;
}

function isStale(lastVerified: string, reviewIntervalDays: number): boolean {
  const lastVerifiedDate = new Date(lastVerified);
  const today = new Date();
  const daysSinceVerified = Math.floor((today.getTime() - lastVerifiedDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceVerified > reviewIntervalDays;
}

function walkDir(dir: string, callback: (file: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== '_archive') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file.endsWith('.md') && file !== 'README.md') {
      callback(filePath);
    }
  }
}

function main(): void {
  const staleFiles: Array<{ file: string; title: string; daysOverdue: number }> = [];

  walkDir(DOCS_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontMatter = parseFrontMatter(content);

    if (frontMatter.last_verified && typeof frontMatter.review_interval_days === 'number' && !isNaN(frontMatter.review_interval_days)) {
      if (isStale(frontMatter.last_verified, frontMatter.review_interval_days)) {
        const lastVerifiedDate = new Date(frontMatter.last_verified);
        const today = new Date();
        const daysOverdue = Math.floor((today.getTime() - lastVerifiedDate.getTime()) / (1000 * 60 * 60 * 24)) - frontMatter.review_interval_days;

        staleFiles.push({
          file: path.relative(DOCS_DIR, filePath),
          title: frontMatter.title || 'Unknown',
          daysOverdue
        });
      }
    }
  });

  if (staleFiles.length > 0) {
    console.log('\n⚠️  STALE DOCUMENTATION FOUND\n');
    console.log(`Found ${staleFiles.length} stale documentation file(s):\n`);

    staleFiles.sort((a, b) => b.daysOverdue - a.daysOverdue);

    for (const file of staleFiles) {
      console.log(`  📄 ${file.file}`);
      console.log(`     Title: ${file.title}`);
      console.log(`     Days Overdue: ${file.daysOverdue}\n`);
    }

    process.exit(1);
  } else {
    console.log('✅ All documentation is current!');
    process.exit(0);
  }
}

main();
