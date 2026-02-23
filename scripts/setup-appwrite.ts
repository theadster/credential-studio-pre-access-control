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
  SCAN_LOGS: 'scan_logs',
  ACCESS_CONTROL: 'access_control',
  APPROVAL_PROFILES: 'approval_profiles',
  CLOUDINARY: 'cloudinary',
  SWITCHBOARD: 'switchboard',
  ONESIMPLEAPI: 'onesimpleapi',
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
    // Add delay between column creations to prevent race conditions
    // Using 1000ms (1 second) to ensure proper propagation
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.USERS,
        name: 'Users',
        permissions: [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Users table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.USERS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.USERS, 'userId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.USERS, key: 'userId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.USERS, 'email', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.USERS, key: 'email', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.USERS, 'name', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.USERS, key: 'name', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.USERS, 'roleId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.USERS, key: 'roleId', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.USERS, 'isInvited', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.USERS, key: 'isInvited', required: false, xdefault: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      // Wait for all columns to be fully available before creating indexes
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.USERS, key: 'email_idx', type: IndexType.Unique, columns: ['email'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating email index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.USERS, key: 'userId_idx', type: IndexType.Key, columns: ['userId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating userId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.USERS, key: 'roleId_idx', type: IndexType.Key, columns: ['roleId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating roleId index:', error.message);
      }
    }

    console.log('✓ Users table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up users table:', error);
    throw error;
  }
}

async function createRolesTable(databaseId: string) {
  try {
    console.log('\nCreating roles table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.ROLES,
        name: 'Roles',
        permissions: [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Roles table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.ROLES });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.ROLES, 'name', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ROLES, key: 'name', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ROLES, 'description', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ROLES, key: 'description', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ROLES, 'permissions', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ROLES, key: 'permissions', size: 10000, required: true }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ROLES, key: 'name_idx', type: IndexType.Unique, columns: ['name'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating name index:', error.message);
      }
    }

    console.log('✓ Roles table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up roles table:', error);
    throw error;
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
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'notes', size: 3000, required: false }),
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
      tablesDB.createMediumtextColumn({ databaseId, tableId: TABLES.ATTENDEES, key: 'customFieldValues', required: false }),
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
      // Wait for all columns to be fully available before creating indexes
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    let tableExists = false;

    try {
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
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Custom fields table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.CUSTOM_FIELDS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'eventSettingsId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'eventSettingsId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'fieldName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'fieldName', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'internalFieldName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'internalFieldName', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'fieldType', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'fieldType', size: 50, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'fieldOptions', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'fieldOptions', size: 5000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'required', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'required', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'order', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'order', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'showOnMainPage', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'showOnMainPage', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'printable', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'printable', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'defaultValue', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'defaultValue', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CUSTOM_FIELDS, 'deletedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'deletedAt', required: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'eventSettingsId_idx', type: IndexType.Key, columns: ['eventSettingsId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating eventSettingsId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'showOnMainPage_idx', type: IndexType.Key, columns: ['showOnMainPage'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating showOnMainPage index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.CUSTOM_FIELDS, key: 'order_idx', type: IndexType.Key, columns: ['order'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating order index:', error.message);
      }
    }

    console.log('✓ Custom fields table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up custom_fields table:', error);
    throw error;
  }
}

async function createEventSettingsTable(databaseId: string) {
  try {
    console.log('\nCreating event_settings table...');
    let tableExists = false;

    try {
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
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Event settings table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.EVENT_SETTINGS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'eventName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'eventName', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'eventDate', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'eventDate', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'eventTime', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'eventTime', size: 50, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'eventLocation', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'eventLocation', size: 500, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'timeZone', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'timeZone', size: 100, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'accessControlTimeMode', existingColumns, () =>
      tablesDB.createEnumColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'accessControlTimeMode', elements: ['date_only', 'date_time'], required: false, xdefault: 'date_only' }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'mobileSettingsPasscode', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'mobileSettingsPasscode', size: 4, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'barcodeType', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'barcodeType', size: 50, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'barcodeLength', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'barcodeLength', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'barcodeUnique', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'barcodeUnique', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'forceFirstNameUppercase', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'forceFirstNameUppercase', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'forceLastNameUppercase', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'forceLastNameUppercase', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'attendeeSortField', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'attendeeSortField', size: 50, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'attendeeSortDirection', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'attendeeSortDirection', size: 10, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'bannerImageUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'bannerImageUrl', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'signInBannerUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'signInBannerUrl', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'accessControlEnabled', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'accessControlEnabled', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'accessControlDefaults', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'accessControlDefaults', size: 5000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.EVENT_SETTINGS, 'customFieldColumns', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.EVENT_SETTINGS, key: 'customFieldColumns', required: false, xdefault: 7 }),
    );

    console.log('✓ Event settings table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up event_settings table:', error);
    throw error;
  }
}

async function createLogsTable(databaseId: string) {
  try {
    console.log('\nCreating logs table...');
    let tableExists = false;

    try {
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
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Logs table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.LOGS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.LOGS, 'userId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.LOGS, key: 'userId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOGS, 'attendeeId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.LOGS, key: 'attendeeId', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOGS, 'action', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.LOGS, key: 'action', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOGS, 'details', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.LOGS, key: 'details', size: 10000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOGS, 'timestamp', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.LOGS, key: 'timestamp', required: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      // Wait for all columns to be fully available before creating indexes
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.LOGS, key: 'userId_idx', type: IndexType.Key, columns: ['userId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating userId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.LOGS, key: 'attendeeId_idx', type: IndexType.Key, columns: ['attendeeId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating attendeeId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.LOGS, key: 'timestamp_idx', type: IndexType.Key, columns: ['timestamp'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating timestamp index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.LOGS, key: 'action_idx', type: IndexType.Key, columns: ['action'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating action index:', error.message);
      }
    }

    console.log('✓ Logs table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up logs table:', error);
    throw error;
  }
}

async function createLogSettingsTable(databaseId: string) {
  try {
    console.log('\nCreating log_settings table...');
    let tableExists = false;

    try {
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
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Log settings table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.LOG_SETTINGS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns (matching DEFAULT_LOG_SETTINGS from API)
    // All columns default to true for comprehensive logging
    // Attendee events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeCreate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeCreate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeUpdate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeUpdate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeView', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeView', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeBulkDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeBulkDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeImport', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeImport', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'attendeeExport', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'attendeeExport', required: false, xdefault: true }),
    );

    // Credential events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'credentialGenerate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'credentialGenerate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'credentialClear', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'credentialClear', required: false, xdefault: true }),
    );

    // User events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'userCreate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'userCreate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'userUpdate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'userUpdate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'userDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'userDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'userView', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'userView', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'userInvite', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'userInvite', required: false, xdefault: true }),
    );

    // Role events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'roleCreate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'roleCreate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'roleUpdate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'roleUpdate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'roleDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'roleDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'roleView', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'roleView', required: false, xdefault: true }),
    );

    // Event settings
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'eventSettingsUpdate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'eventSettingsUpdate', required: false, xdefault: true }),
    );

    // Custom field events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'customFieldCreate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'customFieldCreate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'customFieldUpdate', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'customFieldUpdate', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'customFieldDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'customFieldDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'customFieldReorder', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'customFieldReorder', required: false, xdefault: true }),
    );

    // Auth events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'authLogin', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'authLogin', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'authLogout', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'authLogout', required: false, xdefault: true }),
    );

    // Logs events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'logsDelete', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'logsDelete', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'logsExport', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'logsExport', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'logsView', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'logsView', required: false, xdefault: true }),
    );

    // System view events
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'systemViewEventSettings', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'systemViewEventSettings', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'systemViewAttendeeList', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'systemViewAttendeeList', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'systemViewRolesList', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'systemViewRolesList', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.LOG_SETTINGS, 'systemViewUsersList', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.LOG_SETTINGS, key: 'systemViewUsersList', required: false, xdefault: true }),
    );

    console.log('✓ Log settings table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up log_settings table:', error);
    throw error;
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
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.REPORTS, key: 'filterConfiguration', size: 12000, required: true }),
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
 * Create scan_logs table for mobile app scan logging
 *
 * Stores scan events from mobile devices including barcode scans,
 * approval/denial results, and attendee snapshots at time of scan.
 */
async function createScanLogsTable(databaseId: string) {
  try {
    console.log('\nCreating scan_logs table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.SCAN_LOGS,
        name: 'Scan Logs',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Scan logs table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.SCAN_LOGS });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'localId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'localId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'deviceId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'deviceId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'attendeeId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'attendeeId', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'barcodeScanned', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'barcodeScanned', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'result', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'result', size: 50, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'denialReason', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'denialReason', size: 500, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'profileId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'profileId', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'profileVersion', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'profileVersion', required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'operatorId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'operatorId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'scannedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'scannedAt', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'uploadedAt', existingColumns, () =>
      tablesDB.createDatetimeColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'uploadedAt', required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'attendeeFirstName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'attendeeFirstName', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'attendeeLastName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'attendeeLastName', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SCAN_LOGS, 'attendeePhotoUrl', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'attendeePhotoUrl', size: 2048, required: false }),
    );

    if (!tableExists) {
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'device_local_idx', type: IndexType.Unique, columns: ['deviceId', 'localId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating device_local index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'deviceId_idx', type: IndexType.Key, columns: ['deviceId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating deviceId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'operatorId_idx', type: IndexType.Key, columns: ['operatorId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating operatorId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'attendeeId_idx', type: IndexType.Key, columns: ['attendeeId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating attendeeId index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'scannedAt_idx', type: IndexType.Key, columns: ['scannedAt'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating scannedAt index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'result_idx', type: IndexType.Key, columns: ['result'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating result index:', error.message);
      }
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SCAN_LOGS, key: 'profileId_idx', type: IndexType.Key, columns: ['profileId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating profileId index:', error.message);
      }
    }

    console.log('✓ Scan logs table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up scan_logs table:', error);
    throw error;
  }
}

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

async function createAccessControlTable(databaseId: string) {
  try {
    console.log('\nCreating access_control table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.ACCESS_CONTROL,
        name: 'Access Control',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Access control table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.ACCESS_CONTROL });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.ACCESS_CONTROL, 'attendeeId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ACCESS_CONTROL, key: 'attendeeId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ACCESS_CONTROL, 'accessEnabled', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.ACCESS_CONTROL, key: 'accessEnabled', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ACCESS_CONTROL, 'validFrom', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ACCESS_CONTROL, key: 'validFrom', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ACCESS_CONTROL, 'validUntil', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ACCESS_CONTROL, key: 'validUntil', size: 255, required: false }),
    );

    if (!tableExists) {
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ACCESS_CONTROL, key: 'attendeeId_idx', type: IndexType.Unique, columns: ['attendeeId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating attendeeId index:', error.message);
      }
    }

    console.log('✓ Access control table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up access_control table:', error);
    throw error;
  }
}

async function createApprovalProfilesTable(databaseId: string) {
  try {
    console.log('\nCreating approval_profiles table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.APPROVAL_PROFILES,
        name: 'Approval Profiles',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Approval profiles table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    // Get existing columns if table exists
    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.APPROVAL_PROFILES });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    // Add all required columns
    await createColumnIfMissing(databaseId, TABLES.APPROVAL_PROFILES, 'name', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'name', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.APPROVAL_PROFILES, 'description', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'description', size: 1000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.APPROVAL_PROFILES, 'version', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'version', required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.APPROVAL_PROFILES, 'rules', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'rules', size: 10000, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.APPROVAL_PROFILES, 'isDeleted', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'isDeleted', required: false, xdefault: false }),
    );

    // Create indexes if table was just created
    if (!tableExists) {
      console.log('  Creating indexes...');
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.APPROVAL_PROFILES, key: 'name_idx', type: IndexType.Unique, columns: ['name'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating name index:', error.message);
      }
    }

    console.log('✓ Approval profiles table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up approval profiles table:', error);
    throw error;
  }
}

async function createCloudinaryTable(databaseId: string) {
  try {
    console.log('\nCreating cloudinary table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.CLOUDINARY,
        name: 'Cloudinary',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Cloudinary table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.CLOUDINARY });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'eventSettingsId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'eventSettingsId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'version', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'version', required: false, xdefault: 1 }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'enabled', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'enabled', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'cloudName', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'cloudName', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'uploadPreset', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'uploadPreset', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'autoOptimize', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'autoOptimize', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'generateThumbnails', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'generateThumbnails', required: false, xdefault: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'disableSkipCrop', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'disableSkipCrop', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.CLOUDINARY, 'cropAspectRatio', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.CLOUDINARY, key: 'cropAspectRatio', size: 50, required: false }),
    );

    if (!tableExists) {
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.CLOUDINARY, key: 'eventSettingsId_idx', type: IndexType.Unique, columns: ['eventSettingsId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating eventSettingsId index:', error.message);
      }
    }

    console.log('✓ Cloudinary table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up cloudinary table:', error);
    throw error;
  }
}

async function createSwitchboardTable(databaseId: string) {
  try {
    console.log('\nCreating switchboard table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.SWITCHBOARD,
        name: 'Switchboard',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Switchboard table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.SWITCHBOARD });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'eventSettingsId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'eventSettingsId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'version', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'version', required: false, xdefault: 1 }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'enabled', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'enabled', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'apiEndpoint', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'apiEndpoint', size: 500, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'authHeaderType', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'authHeaderType', size: 50, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'requestBody', existingColumns, () =>
      tablesDB.createMediumtextColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'requestBody', required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'templateId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'templateId', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.SWITCHBOARD, 'fieldMappings', existingColumns, () =>
      tablesDB.createMediumtextColumn({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'fieldMappings', required: false }),
    );

    if (!tableExists) {
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.SWITCHBOARD, key: 'eventSettingsId_idx', type: IndexType.Unique, columns: ['eventSettingsId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating eventSettingsId index:', error.message);
      }
    }

    console.log('✓ Switchboard table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up switchboard table:', error);
    throw error;
  }
}

async function createOneSimpleApiTable(databaseId: string) {
  try {
    console.log('\nCreating onesimpleapi table...');
    let tableExists = false;

    try {
      await tablesDB.createTable({
        databaseId,
        tableId: TABLES.ONESIMPLEAPI,
        name: 'OneSimpleAPI',
        permissions: [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
      });
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ OneSimpleAPI table already exists');
        tableExists = true;
      } else {
        throw error;
      }
    }

    let existingColumns: string[] = [];
    if (tableExists) {
      try {
        const table = await tablesDB.getTable({ databaseId, tableId: TABLES.ONESIMPLEAPI });
        existingColumns = (table as any).columns?.map((col: any) => col.key) ?? [];
        console.log(`  Found ${existingColumns.length} existing columns`);
      } catch (error) {
        console.log('  Could not fetch existing columns, will attempt to create all');
      }
    }

    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'eventSettingsId', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'eventSettingsId', size: 255, required: true }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'version', existingColumns, () =>
      tablesDB.createIntegerColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'version', required: false, xdefault: 1 }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'enabled', existingColumns, () =>
      tablesDB.createBooleanColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'enabled', required: false, xdefault: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'url', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'url', size: 500, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'formDataKey', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'formDataKey', size: 255, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'formDataValue', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'formDataValue', size: 5000, required: false }),
    );
    await createColumnIfMissing(databaseId, TABLES.ONESIMPLEAPI, 'recordTemplate', existingColumns, () =>
      tablesDB.createVarcharColumn({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'recordTemplate', size: 3000, required: false }),
    );

    if (!tableExists) {
      try {
        await tablesDB.createIndex({ databaseId, tableId: TABLES.ONESIMPLEAPI, key: 'eventSettingsId_idx', type: IndexType.Unique, columns: ['eventSettingsId'] });
      } catch (error: any) {
        if (error.code !== 409) console.error('  ✗ Error creating eventSettingsId index:', error.message);
      }
    }

    console.log('✓ OneSimpleAPI table setup complete');
  } catch (error: any) {
    console.error('✗ Error setting up onesimpleapi table:', error);
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
NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID=${TABLES.SCAN_LOGS}
NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID=${TABLES.ACCESS_CONTROL}
NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_TABLE_ID=${TABLES.APPROVAL_PROFILES}
NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID=${TABLES.CLOUDINARY}
NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID=${TABLES.SWITCHBOARD}
NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID=${TABLES.ONESIMPLEAPI}
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
    await createScanLogsTable(databaseId);
    await createAccessControlTable(databaseId);
    await createApprovalProfilesTable(databaseId);
    await createCloudinaryTable(databaseId);
    await createSwitchboardTable(databaseId);
    await createOneSimpleApiTable(databaseId);

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
