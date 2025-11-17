#!/usr/bin/env tsx
/**
 * Sync Package Versions to Documentation
 * 
 * This script reads the actual installed package versions and updates
 * all documentation files to reflect the current versions.
 * 
 * Run manually: npm run sync:versions
 * Auto-runs: Via Kiro hook when package.json changes
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PackageVersions {
  next: string;
  react: string;
  reactDom: string;
  typescript: string;
  tailwindcss: string;
  node: string;
}

interface DocFile {
  path: string;
  replacements: Array<{
    search: RegExp;
    replace: (versions: PackageVersions) => string;
  }>;
}

// Get installed package versions
function getInstalledVersions(): PackageVersions {
  try {
    const output = execSync('npm list next react react-dom typescript tailwindcss --depth=0 2>/dev/null', {
      encoding: 'utf-8'
    });

    const versions: Partial<PackageVersions> = {};
    
    const nextMatch = output.match(/next@([\d.]+)/);
    const reactMatch = output.match(/react@([\d.]+)/);
    const reactDomMatch = output.match(/react-dom@([\d.]+)/);
    const tsMatch = output.match(/typescript@([\d.]+)/);
    const tailwindMatch = output.match(/tailwindcss@([\d.]+)/);

    if (!nextMatch || !reactMatch || !reactDomMatch || !tsMatch || !tailwindMatch) {
      throw new Error('Could not parse all package versions');
    }

    versions.next = nextMatch[1];
    versions.react = reactMatch[1];
    versions.reactDom = reactDomMatch[1];
    versions.typescript = tsMatch[1];
    versions.tailwindcss = tailwindMatch[1];

    // Get Node.js version from package.json engines
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    versions.node = packageJson.engines?.node || '>=20.x';

    return versions as PackageVersions;
  } catch (error) {
    console.error('Error getting package versions:', error);
    process.exit(1);
  }
}

// Documentation files to update
const docFiles: DocFile[] = [
  {
    path: '.kiro/steering/tech.md',
    replacements: [
      {
        search: /## Core Framework & Runtime\n- \*\*Next\.js [\d.]+\*\* with Pages Router \(not App Router\)\n- \*\*React [\d.]+\*\* with TypeScript [\d.]+\n- \*\*Node\.js [^\n]+\*\* \(specified in engines\)/,
        replace: (v) => `## Core Framework & Runtime\n- **Next.js ${v.next}** with Pages Router (not App Router)\n- **React ${v.react}** with TypeScript ${v.typescript}\n- **Node.js ${v.node}** (specified in engines)`
      },
      {
        search: /## Styling & UI\n- \*\*Tailwind CSS [\d.]+\*\* for styling/,
        replace: (v) => `## Styling & UI\n- **Tailwind CSS ${v.tailwindcss}** for styling`
      }
    ]
  },
  {
    path: '.kiro/steering/product.md',
    replacements: [
      {
        search: /## Technology Stack\n\n- \*\*Frontend\*\*: Next\.js [\d.]+ with React [\d.]+ and TypeScript [\d.]+\n- \*\*Backend\*\*: Appwrite \(Authentication, Database, Realtime, Storage\)\n- \*\*Styling\*\*: Tailwind CSS [\d.]+ with shadcn\/ui component library/,
        replace: (v) => `## Technology Stack\n\n- **Frontend**: Next.js ${v.next} with React ${v.react} and TypeScript ${v.typescript}\n- **Backend**: Appwrite (Authentication, Database, Realtime, Storage)\n- **Styling**: Tailwind CSS ${v.tailwindcss} with shadcn/ui component library`
      }
    ]
  },
  {
    path: 'README.md',
    replacements: [
      {
        search: /## Technology Stack\n\n- \*\*Frontend\*\*: Next\.js [\d.]+, React [\d.]+, TypeScript [\d.]+/,
        replace: (v) => `## Technology Stack\n\n- **Frontend**: Next.js ${v.next}, React ${v.react}, TypeScript ${v.typescript}`
      }
    ]
  }
];

// Update a single file
function updateFile(file: DocFile, versions: PackageVersions): boolean {
  try {
    const filePath = join(process.cwd(), file.path);
    let content = readFileSync(filePath, 'utf-8');
    let updated = false;

    for (const replacement of file.replacements) {
      const newContent = content.replace(replacement.search, replacement.replace(versions));
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    }

    if (updated) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated ${file.path}`);
      return true;
    } else {
      console.log(`- No changes needed in ${file.path}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error updating ${file.path}:`, error);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔄 Syncing package versions to documentation...\n');

  const versions = getInstalledVersions();
  
  console.log('📦 Current versions:');
  console.log(`   Next.js: ${versions.next}`);
  console.log(`   React: ${versions.react}`);
  console.log(`   React-DOM: ${versions.reactDom}`);
  console.log(`   TypeScript: ${versions.typescript}`);
  console.log(`   Tailwind CSS: ${versions.tailwindcss}`);
  console.log(`   Node.js: ${versions.node}\n`);

  let updatedCount = 0;
  for (const file of docFiles) {
    if (updateFile(file, versions)) {
      updatedCount++;
    }
  }

  console.log(`\n✨ Done! Updated ${updatedCount} file(s).`);
}

main();
