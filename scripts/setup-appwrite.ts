#!/usr/bin/env tsx
/**
 * Appwrite Infrastructure Setup Script
 *
 * This script creates the database and all required tables with proper
 * columns, indexes, and permissions for the CredentialStudio application.
 *
 * Prerequisites:
 * - Appwrite project created at https://cloud.appwrite.io
 * - Environment variables configured in .env.local
 * - npm install appwrite node-appwrite
 *
 * Usage:
 * npx tsx scripts/setup-appwrite.ts
 */

import { Client, TablesDB, Permission, Role, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// TablesDB instance will be initialized in main() after environment validation
let tablesDB: TablesDB;

// Database and Table IDs
const DATABASE_ID = 'credentialstudio';
const TABLES = {
  USERS: 'users',
  ROLES: 'roles',
  ATTENDEES: 'attendees',
  CUSTOM_FIELDS: 'custom_fields',
  EVENT_SETTINGS: 'event_settings',
  LOGS: 'logs',
  LOG_SETTINGS: 'log_settings',
  REPORTS: 'reports',
  PDF_JOBS: 'pdf_jobs',
};

/**
 * Wait for a column to be available (polling mechanism)
 * Appwrite creates columns asynchronously, so we need to wait for them to be ready
 */
async function waitForColumn(
  databaseId: string,
  tableId: string,
  columnKey: string,
  maxAttempts: number = 30,
  delayMs: number = 1000,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await tablesDB.getColumn({ databaseId, tableId, key: columnKey });
      console.log(`  ✓ Column '${columnKey}' is ready`);
      return;
    } catch (error: any) {
      if (attempt === maxAttempts) {
        throw new Error(`Timeout waiting for column '${columnKey}' to be ready`);
      }
      // Column not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Create a column if it doesn't already exist
 * Handles 409 conflicts (column already exists) gracefully
 */
async function createColumnIfMissing(
  databaseId: string,
  tableId: string,
  key: string,
  existingColumns: string[],
  createFn: () => Promise<any>,
): Promise<void> {
  if (existingColumns.includes(key)) {
    console.log(`  ✓ Column '${key}' already exists`);
    return;
  }

  try {
    console.log(`  Creating column '${key}'...`);
    await createFn();
    await waitForColumn(databaseId, tableId, key);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ✓ Column '${key}' already exists`);
    } else {
      console.error(`  ✗ Error creating column '${key}':`, error.message);
    }
  }
}

async function createDatabase() {
  try {
    console.log('Creating database...');
    await tablesDB.create({ databaseId: DATABASE_ID, name: 'CredentialStudio Database' });
    console.log('✓ Database created successfully');
    return DATABASE_ID;
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Database already exists');
      return DATABASE_ID;
    }
    throw error;
  }
}

async function createUsersTable(databaseId: string) {
  try {
    console.log('\nCreating users table...');
    const permissions = [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ];

    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.USERS,
      name: 'Users',
      permissions,
      columns: [
        { key: 'userId', type: 'varchar', size: 255, required: true },
        { key: 'email', type: 'varchar', size: 255, required: true },
        { key: 'name', type: 'varchar', size: 255, required: false },
        { key: 'roleId', type: 'varchar', size: 255, required: false },
        { key: 'isInvited', type: 'boolean', required: false },
      ],
      indexes: [
        { key: 'email_idx', type: 'unique', attributes: ['email'] },
        { key: 'userId_idx', type: 'key', attributes: ['userId'] },
        { key: 'roleId_idx', type: 'key', attributes: ['roleId'] },
      ],
    });

    console.log('✓ Users table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Users table already exists');
    } else {
      throw error;
    }
  }
}

async function createRolesTable(databaseId: string) {
  try {
    console.log('\nCreating roles table...');
    const permissions = [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ];

    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.ROLES,
      name: 'Roles',
      permissions,
      columns: [
        { key: 'name', type: 'varchar', size: 255, required: true },
        { key: 'description', type: 'varchar', size: 1000, required: false },
        { key: 'permissions', type: 'varchar', size: 10000, required: true },
      ],
      indexes: [
        { key: 'name_idx', type: 'unique', attributes: ['name'] },
      ],
    });

    console.log('✓ Roles table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Roles table already exists');
    } else {
      throw error;
    }
  }
}

async function createAttendeesTable(databaseId: string) {
  try {
    console.log('\nCreating attendees table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.ATTENDEES,
        name: 'Attendees',
        permissions: [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Attendees table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.ATTENDEES });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'firstName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'firstName', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'lastName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'lastName', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'barcodeNumber', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'barcodeNumber', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'notes', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'notes', size: 5000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'photoUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'photoUrl', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'credentialUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'credentialUrl', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'credentialGeneratedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'credentialGeneratedAt', required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'customFieldValues', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'customFieldValues', size: 10000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'lastSignificantUpdate', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'lastSignificantUpdate', required: false }),
    );

    // Operator-managed columns for atomic operations
    console.log('  Checking operator-managed columns...');
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'credentialCount', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'credentialCount', required: false, xdefault: 0 }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'photoUploadCount', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'photoUploadCount', required: false, xdefault: 0 }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'viewCount', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'viewCount', required: false, xdefault: 0 }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'lastCredentialGenerated', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'lastCredentialGenerated', required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ATTENDEES, 'lastPhotoUploaded', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'lastPhotoUploaded', required: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ATTENDEES, key: 'barcodeNumber_idx', type: IndexType.Unique, columns: ['barcodeNumber'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating barcodeNumber index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ATTENDEES, key: 'lastName_idx', type: IndexType.Key, columns: ['lastName'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating lastName index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ATTENDEES, key: 'firstName_idx', type: IndexType.Key, columns: ['firstName'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating firstName index:', error.message);
      }
    }

    console.log('✓ Attendees table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up attendees table:', error);
    throw error;
  }
}

async function createCustomFieldsTable(databaseId: string) {
  try {
    console.log('\nCreating custom_fields table...');
    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.CUSTOM_FIELDS,
      name: 'Custom Fields',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      columns: [
        { key: 'eventSettingsId', type: 'varchar', size: 255, required: true },
        { key: 'fieldName', type: 'varchar', size: 255, required: true },
        { key: 'internalFieldName', type: 'varchar', size: 255, required: false },
        { key: 'fieldType', type: 'varchar', size: 50, required: true },
        { key: 'fieldOptions', type: 'varchar', size: 5000, required: false },
        { key: 'required', type: 'boolean', required: false },
        { key: 'fieldOrder', type: 'integer', required: true },
        { key: 'showOnMainPage', type: 'boolean', required: false, xdefault: true },
        { key: 'printable', type: 'boolean', required: false },
      ],
      indexes: [
        { key: 'eventSettingsId_idx', type: 'key', attributes: ['eventSettingsId'] },
        { key: 'fieldOrder_idx', type: 'key', attributes: ['fieldOrder'] },
        { key: 'showOnMainPage_idx', type: 'key', attributes: ['showOnMainPage'] },
      ],
    });

    console.log('✓ Custom fields table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Custom fields table already exists');
    } else {
      throw error;
    }
  }
}

async function createEventSettingsTable(databaseId: string) {
  try {
    console.log('\nCreating event_settings table...');
    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.EVENT_SETTINGS,
      name: 'Event Settings',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      columns: [
        { key: 'eventName', type: 'varchar', size: 255, required: false },
        { key: 'eventLogo', type: 'varchar', size: 1000, required: false },
        { key: 'barcodeType', type: 'varchar', size: 50, required: false },
        { key: 'barcodeLength', type: 'integer', required: false },
        { key: 'enableSwitchboard', type: 'boolean', required: false },
        { key: 'switchboardApiKey', type: 'varchar', size: 500, required: false },
        { key: 'switchboardTemplateId', type: 'varchar', size: 255, required: false },
        { key: 'switchboardFieldMappings', type: 'varchar', size: 10000, required: false },
        { key: 'customFieldColumns', type: 'integer', required: false, xdefault: 7, min: 0, max: 10 },
      ],
    });

    console.log('✓ Event settings table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Event settings table already exists');
    } else {
      throw error;
    }
  }
}

async function createLogsTable(databaseId: string) {
  try {
    console.log('\nCreating logs table...');
    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.LOGS,
      name: 'Logs',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      columns: [
        { key: 'userId', type: 'varchar', size: 255, required: true },
        { key: 'attendeeId', type: 'varchar', size: 255, required: false },
        { key: 'action', type: 'varchar', size: 255, required: true },
        { key: 'details', type: 'varchar', size: 10000, required: false },
        { key: 'timestamp', type: 'datetime', required: false },
      ],
      indexes: [
        { key: 'userId_idx', type: 'key', attributes: ['userId'] },
        { key: 'attendeeId_idx', type: 'key', attributes: ['attendeeId'] },
        { key: 'timestamp_idx', type: 'key', attributes: ['timestamp'] },
      ],
    });

    console.log('✓ Logs table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Logs table already exists');
    } else {
      throw error;
    }
  }
}

async function createLogSettingsTable(databaseId: string) {
  try {
    console.log('\nCreating log_settings table...');
    await tablesDB.createTable({
      databaseId,
      tableId: TABLES.LOG_SETTINGS,
      name: 'Log Settings',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      columns: [
        { key: 'logUserLogin', type: 'boolean', required: false, xdefault: true },
        { key: 'logUserLogout', type: 'boolean', required: false, xdefault: true },
        { key: 'logAttendeeCreate', type: 'boolean', required: false, xdefault: true },
        { key: 'logAttendeeUpdate', type: 'boolean', required: false, xdefault: true },
        { key: 'logAttendeeDelete', type: 'boolean', required: false, xdefault: true },
        { key: 'logCredentialGenerate', type: 'boolean', required: false, xdefault: true },
      ],
    });

    console.log('✓ Log settings table created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Log settings table already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Create reports table for saved filter configurations
 *
 * Stores user-saved report configurations including:
 * - Report name and description
 * - User association (userId)
 * - Serialized filter configuration (JSON)
 * - Timestamps for creation, update, and last access
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
async function createReportsTable(databaseId: string) {
  try {
    console.log('\nCreating reports table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.REPORTS,
        name: 'Reports',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Reports table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.REPORTS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'name', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.REPORTS, key: 'name', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'description', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.REPORTS, key: 'description', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'userId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.REPORTS, key: 'userId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'filterConfiguration', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.REPORTS, key: 'filterConfiguration', size: 16381, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'createdAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.REPORTS, key: 'createdAt', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'updatedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.REPORTS, key: 'updatedAt', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.REPORTS, 'lastAccessedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.REPORTS, key: 'lastAccessedAt', required: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.REPORTS, key: 'userId_idx', type: IndexType.Key, columns: ['userId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating userId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.REPORTS, key: 'name_idx', type: IndexType.Key, columns: ['name'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating name index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.REPORTS, key: 'createdAt_idx', type: IndexType.Key, columns: ['createdAt'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating createdAt index:', error.message);
      }
    }

    console.log('✓ Reports table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up reports table:', error);
    throw error;
  }
}


/**
 * Create pdf_jobs table for tracking async PDF generation jobs
 *
 * Requirements: 1.1
 */
async function createPdfJobsTable(databaseId: string) {
  try {
    console.log('\nCreating pdf_jobs table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.PDF_JOBS,
        name: 'PDF Jobs',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          // Update and delete are server-side only (worker uses API key)
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ PDF jobs table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.PDF_JOBS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'status', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'status', size: 20, required: true, xdefault: 'pending' }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'pdfUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'pdfUrl', size: 2048, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'error', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'error', size: 2048, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'attendeeIds', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'attendeeIds', size: 65535, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'attendeeCount', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'attendeeCount', required: true, xdefault: 0 }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'requestedBy', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'requestedBy', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'eventSettingsId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'eventSettingsId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.PDF_JOBS, 'attendeeNames', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.PDF_JOBS, key: 'attendeeNames', size: 4096, required: false }),
    );

    console.log('✓ PDF jobs table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up pdf_jobs table:', error);
    throw error;
  }
}

async function printEnvironmentVariables(databaseId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('SETUP COMPLETE! Add these environment variables to your .env.local:');
  console.log('='.repeat(80));
  console.log(`
# Appwrite Database IDs
NEXT_PUBLIC_APPWRITE_DATABASE_ID=${databaseId}
NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID=${TABLES.USERS}
NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID=${TABLES.ROLES}
NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID=${TABLES.ATTENDEES}
NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID=${TABLES.CUSTOM_FIELDS}
NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID=${TABLES.EVENT_SETTINGS}
NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID=${TABLES.LOGS}
NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID=${TABLES.LOG_SETTINGS}
NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID=${TABLES.REPORTS}
NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID=${TABLES.PDF_JOBS}
  `);
  console.log('='.repeat(80));
}

async function main() {
  try {
    console.log('Starting Appwrite infrastructure setup...\n');

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
      throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is not set');
    }
    if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set');
    }
    if (!process.env.APPWRITE_API_KEY) {
      throw new Error('APPWRITE_API_KEY is not set');
    }

    // Initialize client after validation
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    tablesDB = new TablesDB(client);

    // Create database
    const databaseId = await createDatabase();

    // Create all tables
    await createUsersTable(databaseId);
    await createRolesTable(databaseId);
    await createAttendeesTable(databaseId);
    await createCustomFieldsTable(databaseId);
    await createEventSettingsTable(databaseId);
    await createLogsTable(databaseId);
    await createLogSettingsTable(databaseId);
    await createReportsTable(databaseId);
    await createPdfJobsTable(databaseId);

    // Print environment variables
    await printEnvironmentVariables(databaseId);

    console.log('\n✓ All tables created successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy the environment variables above to your .env.local file');
    console.log('2. Configure OAuth providers in Appwrite Console (if using Google login)');
    console.log('3. Review table permissions in Appwrite Console');
    console.log('4. Run the data migration script when ready');

  } catch (error) {
    console.error('\n✗ Error during setup:', error);
    process.exit(1);
  }
}

main();
