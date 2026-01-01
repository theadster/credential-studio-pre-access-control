#!/usr/bin/env node

/**
 * Generate documentation indexes
 * Creates INDEX_BY_TOPIC.md and SEARCH_INDEX.md for easy navigation
 */

import fs from 'fs';
import path from 'path';

interface DocMetadata {
  file: string;
  title: string;
  type: string;
  status: string;
  category: string;
  relatedCode: string[];
}

const DOCS_DIR = path.join(process.cwd(), 'docs');

function parseFrontMatter(content: string): Record<string, any> {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontMatter: Record<string, any> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('title:')) {
      frontMatter.title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
    } else if (line.startsWith('type:')) {
      frontMatter.type = line.replace('type:', '').trim();
    } else if (line.startsWith('status:')) {
      frontMatter.status = line.replace('status:', '').trim();
    } else if (line.startsWith('related_code:')) {
      const arrayStr = line.replace('related_code:', '').trim();
      try {
        frontMatter.related_code = JSON.parse(arrayStr);
      } catch {
        frontMatter.related_code = [];
      }
    }
  }

  return frontMatter;
}

function walkDir(dir: string, callback: (file: string, category: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== '_archive') {
      walkDir(filePath, (f, cat) => callback(f, file));
    } else if (stat.isFile() && file.endsWith('.md') && file !== 'README.md') {
      callback(filePath, path.basename(dir));
    }
  }
}

function extractKeywords(title: string, content: string): string[] {
  const keywords = new Set<string>();

  // Add title words (3+ chars)
  title.split(/[\s\-_]+/).forEach(word => {
    if (word.length >= 3) keywords.add(word.toLowerCase());
  });

  // Extract headings from content
  const headings = content.match(/^#+\s+(.+)$/gm) || [];
  headings.forEach(heading => {
    const text = heading.replace(/^#+\s+/, '').replace(/\s*#+\s*$/, '').trim();
    text.split(/[\s\-_]+/).forEach(word => {
      if (word.length >= 3) keywords.add(word.toLowerCase());
    });
  });

  return Array.from(keywords).sort();
}

function main(): void {
  const docs: DocMetadata[] = [];
  const docsByType: Record<string, DocMetadata[]> = {
    canonical: [],
    adr: [],
    worklog: [],
    runbook: []
  };
  const docsByCategory: Record<string, DocMetadata[]> = {};

  walkDir(DOCS_DIR, (filePath, category) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontMatter = parseFrontMatter(content);

    if (frontMatter.status === 'active') {
      const relPath = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
      const doc: DocMetadata = {
        file: relPath,
        title: frontMatter.title || 'Unknown',
        type: frontMatter.type || 'canonical',
        status: frontMatter.status || 'active',
        category,
        relatedCode: frontMatter.related_code || []
      };

      docs.push(doc);

      if (docsByType[doc.type]) {
        docsByType[doc.type].push(doc);
      }

      if (!docsByCategory[category]) {
        docsByCategory[category] = [];
      }
      docsByCategory[category].push(doc);
    }
  });

  // Generate INDEX_BY_TOPIC.md
  let indexByTopic = '# Documentation Index by Topic\n\n';
  indexByTopic += '> Auto-generated index of active documentation files\n\n';
  indexByTopic += `**Last Updated:** ${new Date().toISOString().split('T')[0]}\n\n`;
  indexByTopic += `**Total Active Documents:** ${docs.length}\n\n`;

  // By Category
  indexByTopic += '## By Category\n\n';
  const sortedCategories = Object.keys(docsByCategory).sort();
  for (const category of sortedCategories) {
    const categoryDocs = docsByCategory[category].sort((a, b) => a.title.localeCompare(b.title));
    indexByTopic += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryDocs.length})\n\n`;

    for (const doc of categoryDocs) {
      indexByTopic += `- [${doc.title}](./${doc.file})\n`;
    }
    indexByTopic += '\n';
  }

  // By Type
  indexByTopic += '## By Document Type\n\n';
  for (const type of Object.keys(docsByType).sort()) {
    const typeDocs = docsByType[type].sort((a, b) => a.title.localeCompare(b.title));
    if (typeDocs.length > 0) {
      indexByTopic += `### ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeDocs.length})\n\n`;
      indexByTopic += `*${getTypeDescription(type)}*\n\n`;

      for (const doc of typeDocs) {
        indexByTopic += `- [${doc.title}](./${doc.file}) - ${doc.category}\n`;
      }
      indexByTopic += '\n';
    }
  }

  fs.writeFileSync(path.join(DOCS_DIR, 'INDEX_BY_TOPIC.md'), indexByTopic);

  // Generate SEARCH_INDEX.md
  let searchIndex = '# Documentation Search Index\n\n';
  searchIndex += '> Searchable index of all active documentation\n\n';
  searchIndex += `**Last Updated:** ${new Date().toISOString().split('T')[0]}\n\n`;

  const sortedDocs = docs.sort((a, b) => a.title.localeCompare(b.title));

  for (const doc of sortedDocs) {
    const content = fs.readFileSync(path.join(DOCS_DIR, doc.file), 'utf-8');
    const keywords = extractKeywords(doc.title, content);

    searchIndex += `## ${doc.title}\n\n`;
    searchIndex += `- **File:** \`${doc.file}\`\n`;
    searchIndex += `- **Type:** ${doc.type}\n`;
    searchIndex += `- **Category:** ${doc.category}\n`;

    if (doc.relatedCode.length > 0) {
      searchIndex += `- **Related Code:**\n`;
      doc.relatedCode.forEach(code => {
        searchIndex += `  - \`${code}\`\n`;
      });
    }

    if (keywords.length > 0) {
      searchIndex += `- **Keywords:** ${keywords.join(', ')}\n`;
    }

    searchIndex += `\n[View Document](./${doc.file})\n\n`;
  }

  fs.writeFileSync(path.join(DOCS_DIR, 'SEARCH_INDEX.md'), searchIndex);

  console.log('✅ Documentation indexes generated successfully!\n');
  console.log(`📊 Statistics:`);
  console.log(`   Total Active Documents: ${docs.length}`);
  console.log(`   Categories: ${Object.keys(docsByCategory).length}`);
  console.log(`   By Type:`);
  for (const type of Object.keys(docsByType).sort()) {
    if (docsByType[type].length > 0) {
      console.log(`     - ${type}: ${docsByType[type].length}`);
    }
  }
  console.log(`\n📁 Generated Files:`);
  console.log(`   - docs/INDEX_BY_TOPIC.md`);
  console.log(`   - docs/SEARCH_INDEX.md`);
}

function getTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    canonical: 'Reference documentation, guides, and best practices',
    adr: 'Architecture Decision Records documenting design choices',
    worklog: 'Work logs and progress tracking (high-churn, frequent updates)',
    runbook: 'Operational runbooks and procedures'
  };
  return descriptions[type] || 'Documentation';
}

main();
