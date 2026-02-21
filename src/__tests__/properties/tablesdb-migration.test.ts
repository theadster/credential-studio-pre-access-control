/**
 * Property-based tests for the Appwrite TablesDB migration.
 *
 * These tests verify codebase-wide invariants to ensure the migration
 * from the legacy Databases API to TablesDB is complete and consistent.
 *
 * Properties verified:
 *   1. Client factories return tablesDB, not databases
 *   2. No COLLECTION_ID variables in environment files
 *   3. Environment file TABLE_ID consistency
 *   4. No COLLECTION_ID references in source code
 *   5. No Databases class usage for data operations
 *   6. No $collectionId metadata field references in source or types
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../../../');

/** Recursively collect all files under `dir` matching `predicate`. */
function collectFiles(dir: string, predicate: (f: string) => boolean): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

/** Read a file and return its lines. */
function lines(filePath: string): string[] {
  return fs.readFileSync(filePath, 'utf-8').split('\n');
}

/** The absolute path of this test file — excluded from self-referential scans. */
const THIS_FILE = path.resolve(__filename);

/** Return all TypeScript source files under `src/`, excluding archives and this test file. */
function tsSrcFiles(): string[] {
  return collectFiles(path.join(ROOT, 'src'), (f) =>
    (f.endsWith('.ts') || f.endsWith('.tsx')) &&
    !f.includes('/archive/') &&
    f !== THIS_FILE
  );
}

/**
 * Return TypeScript source files in scope for the migration:
 * - All of src/ (excluding archives and this test file)
 * - Only the specific scripts that were in migration scope (task 12)
 */
function tsSourceFiles(): string[] {
  const inScopeScripts = [
    'setup-appwrite.ts',
    'verify-appwrite-setup.ts',
  ].map((name) => path.join(ROOT, 'scripts', name));

  const srcScripts = collectFiles(path.join(ROOT, 'src/scripts'), (f) =>
    (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('/archive/')
  );

  return [...tsSrcFiles(), ...inScopeScripts.filter(fs.existsSync), ...srcScripts];
}

/** Parse KEY=VALUE lines from an env file, returning variable names. */
function envVarNames(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  return lines(filePath)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0].trim());
}

// ---------------------------------------------------------------------------
// Property 1: Client factories return tablesDB, not databases
// Validates: Requirements 1.1, 1.2, 1.3
// ---------------------------------------------------------------------------

describe('Property 1: Client factories return tablesDB, not databases', () => {
  let content: string;

  beforeAll(() => {
    const appwriteLib = path.join(ROOT, 'src/lib/appwrite.ts');
    if (!fs.existsSync(appwriteLib)) {
      throw new Error(`appwrite.ts not found at ${appwriteLib}`);
    }
    content = fs.readFileSync(appwriteLib, 'utf-8');
  });

  it('createBrowserClient returns tablesDB property', () => {
    // Extract the createBrowserClient function body
    const match = content.match(/export const createBrowserClient[\s\S]*?^};/m);
    expect(match, 'createBrowserClient not found').toBeTruthy();
    const body = match![0];
    expect(body).toContain('tablesDB:');
    expect(body).not.toMatch(/\bdatabases\s*:/);
  });

  it('createSessionClient returns tablesDB property', () => {
    const match = content.match(/export const createSessionClient[\s\S]*?^};/m);
    expect(match, 'createSessionClient not found').toBeTruthy();
    const body = match![0];
    expect(body).toContain('tablesDB:');
    expect(body).not.toMatch(/\bdatabases\s*:/);
  });

  it('createAdminClient returns tablesDB property', () => {
    const match = content.match(/export const createAdminClient[\s\S]*?^};/m);
    expect(match, 'createAdminClient not found').toBeTruthy();
    const body = match![0];
    expect(body).toContain('tablesDB:');
    expect(body).not.toMatch(/\bdatabases\s*:/);
  });

  it('no legacy databases default export', () => {
    // The file should not export a `databases` const (only tablesDB)
    expect(content).not.toMatch(/^export const databases\s*=/m);
  });
});

// ---------------------------------------------------------------------------
// Property 2: No COLLECTION_ID variables in environment files
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

describe('Property 2: No COLLECTION_ID variables in environment files', () => {
  const envFiles = [
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env.example'),
    path.join(ROOT, 'sites/credential.studio/.env.local'),
  ];

  for (const envFile of envFiles) {
    const label = path.relative(ROOT, envFile);
    it(`${label} has no COLLECTION_ID variable names`, () => {
      if (!fs.existsSync(envFile)) return; // file may not exist in all environments
      const names = envVarNames(envFile);
      const offenders = names.filter((n) => n.includes('COLLECTION_ID'));
      expect(offenders, `Found COLLECTION_ID vars: ${offenders.join(', ')}`).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Property 3: Environment file TABLE_ID consistency
// Validates: Requirements 4.2, 4.3
// ---------------------------------------------------------------------------

describe('Property 3: Environment file TABLE_ID consistency', () => {
  const primary = path.join(ROOT, '.env.local');
  const mirrors = [
    path.join(ROOT, '.env.example'),
    path.join(ROOT, 'sites/credential.studio/.env.local'),
  ];

  it('every TABLE_ID variable in .env.local also exists in .env.example', () => {
    if (!fs.existsSync(primary)) return;
    const primaryNames = envVarNames(primary).filter((n) => n.includes('TABLE_ID'));
    const mirrorPath = mirrors[0];
    if (!fs.existsSync(mirrorPath)) return;
    const mirrorNames = new Set(envVarNames(mirrorPath));
    const missing = primaryNames.filter((n) => !mirrorNames.has(n));
    expect(missing, `Missing in .env.example: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('every TABLE_ID variable in .env.local also exists in sites/credential.studio/.env.local', () => {
    if (!fs.existsSync(primary)) return;
    const primaryNames = envVarNames(primary).filter((n) => n.includes('TABLE_ID'));
    const mirrorPath = mirrors[1];
    if (!fs.existsSync(mirrorPath)) return;
    const mirrorNames = new Set(envVarNames(mirrorPath));
    const missing = primaryNames.filter((n) => !mirrorNames.has(n));
    expect(missing, `Missing in sites/credential.studio/.env.local: ${missing.join(', ')}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 4: No COLLECTION_ID references in source code
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe('Property 4: No COLLECTION_ID references in source code', () => {
  it('no process.env.*_COLLECTION_ID references in src/ TypeScript files', () => {
    const srcFiles = tsSrcFiles();

    const offenders: string[] = [];
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/process\.env\.NEXT_PUBLIC_APPWRITE_\w+_COLLECTION_ID/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    expect(
      offenders,
      `Files still referencing *_COLLECTION_ID env vars:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: No Databases class usage for data operations
// Validates: Requirements 9.4
// ---------------------------------------------------------------------------

describe('Property 5: No Databases class usage for data operations', () => {
  const files = tsSourceFiles();

  it('no import of Databases from appwrite or node-appwrite (excluding archive)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Match: import { ..., Databases, ... } from 'appwrite' or 'node-appwrite'
      if (/import\s+\{[^}]*\bDatabases\b[^}]*\}\s+from\s+['"](?:appwrite|node-appwrite)['"]/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(
      offenders,
      `Files still importing Databases class:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });

  it('no databases.listDocuments calls in source files', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\bdatabases\.listDocuments\s*\(/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders, `Files with databases.listDocuments:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('no databases.getDocument calls in source files', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\bdatabases\.getDocument\s*\(/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders, `Files with databases.getDocument:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('no databases.createDocument calls in source files', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\bdatabases\.createDocument\s*\(/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders, `Files with databases.createDocument:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('no databases.updateDocument calls in source files', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\bdatabases\.updateDocument\s*\(/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders, `Files with databases.updateDocument:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('no databases.deleteDocument calls in source files', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\bdatabases\.deleteDocument\s*\(/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders, `Files with databases.deleteDocument:\n${offenders.join('\n')}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 6: No $collectionId metadata field references in source or types
// Validates: Requirements 5.5, 5.6
// ---------------------------------------------------------------------------

describe('Property 6: No $collectionId metadata field references in source or types', () => {
  const files = tsSrcFiles();

  it('no $collectionId in type definitions or interfaces', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Match property declarations like: $collectionId: string
      if (/\$collectionId\s*[?:]/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(
      offenders,
      `Files with $collectionId type definitions:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });

  it('no $collectionId in destructuring patterns', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Match destructuring: { $collectionId, ... } or { ..., $collectionId }
      if (/\{\s*[^}]*\$collectionId[^}]*\}/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(
      offenders,
      `Files with $collectionId destructuring:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });

  it('no $collectionId in mock data objects', () => {
    const testFiles = collectFiles(path.join(ROOT, 'src/__tests__'), (f) =>
      (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== THIS_FILE
    );
    const libTestFiles = collectFiles(path.join(ROOT, 'src/lib/__tests__'), (f) =>
      f.endsWith('.ts') || f.endsWith('.tsx')
    );
    const allTestFiles = [...testFiles, ...libTestFiles];

    const offenders: string[] = [];
    for (const file of allTestFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/\$collectionId/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(
      offenders,
      `Test files with $collectionId in mock data:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });
});
