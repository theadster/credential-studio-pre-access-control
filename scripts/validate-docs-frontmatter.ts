#!/usr/bin/env node

/**
 * Validate documentation frontmatter
 * Ensures all active docs have required frontmatter fields
 */

import fs from 'fs';
import path from 'path';

interface FrontMatter {
  title?: string;
  type?: string;
  status?: string;
  owner?: string;
  last_verified?: string;
  review_interval_days?: number;
  related_code?: string[];
}

const DOCS_DIR = path.join(process.cwd(), 'docs');
const REQUIRED_FIELDS = ['title', 'type', 'status', 'owner', 'last_verified', 'review_interval_days'];
const VALID_TYPES = ['canonical', 'adr', 'worklog', 'runbook'];
const VALID_STATUSES = ['active', 'superseded', 'archived'];

function parseFrontMatter(content: string): FrontMatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontMatter: FrontMatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('title:')) {
      frontMatter.title = trimmedLine.replace('title:', '').trim().replace(/^["']|["']$/g, '');
    } else if (trimmedLine.startsWith('type:')) {
      frontMatter.type = trimmedLine.replace('type:', '').trim();
    } else if (trimmedLine.startsWith('status:')) {
      frontMatter.status = trimmedLine.replace('status:', '').trim();
    } else if (trimmedLine.startsWith('owner:')) {
      frontMatter.owner = trimmedLine.replace('owner:', '').trim();
    } else if (trimmedLine.startsWith('last_verified:')) {
      frontMatter.last_verified = trimmedLine.replace('last_verified:', '').trim();
    } else if (trimmedLine.startsWith('review_interval_days:')) {
      frontMatter.review_interval_days = parseInt(trimmedLine.replace('review_interval_days:', '').trim());
    } else if (trimmedLine.startsWith('related_code:')) {
      const arrayStr = trimmedLine.replace('related_code:', '').trim();
      try {
        frontMatter.related_code = JSON.parse(arrayStr);
      } catch {
        frontMatter.related_code = [];
      }
    }
  }

  return frontMatter;
}

function walkDir(dir: string, callback: (file: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== '_archive') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file.endsWith('.md') && file !== 'README.md') {
      // Skip auto-generated index files (they're always regenerated with correct frontmatter)
      if (file === 'INDEX_BY_TOPIC.md' || file === 'SEARCH_INDEX.md') {
        continue;
      }
      callback(filePath);
    }
  }
}

function main(): void {
  const errors: string[] = [];

  walkDir(DOCS_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontMatter = parseFrontMatter(content);
    const relPath = path.relative(DOCS_DIR, filePath);

    if (!frontMatter) {
      errors.push(`${relPath}: Missing frontmatter`);
      return;
    }

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (frontMatter[field as keyof FrontMatter] === undefined || frontMatter[field as keyof FrontMatter] === null) {
        errors.push(`${relPath}: Missing required field '${field}'`);
      }
    }

    // Validate type
    if (frontMatter.type && !VALID_TYPES.includes(frontMatter.type)) {
      errors.push(`${relPath}: Invalid type '${frontMatter.type}'. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // Validate status
    if (frontMatter.status && !VALID_STATUSES.includes(frontMatter.status)) {
      errors.push(`${relPath}: Invalid status '${frontMatter.status}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // Validate date format
    if (frontMatter.last_verified) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(frontMatter.last_verified)) {
        errors.push(`${relPath}: Invalid date format for 'last_verified'. Expected YYYY-MM-DD, got '${frontMatter.last_verified}'`);
      }
    }

    // Validate review_interval_days
    if (frontMatter.review_interval_days && frontMatter.review_interval_days <= 0) {
      errors.push(`${relPath}: Invalid 'review_interval_days'. Must be greater than 0`);
    }
  });

  if (errors.length > 0) {
    console.log('\n❌ FRONTMATTER VALIDATION FAILED\n');
    console.log(`Found ${errors.length} error(s):\n`);

    for (const error of errors) {
      console.log(`  ❌ ${error}`);
    }

    console.log();
    process.exit(1);
  } else {
    console.log('✅ All documentation frontmatter is valid!');
    process.exit(0);
  }
}

main();
