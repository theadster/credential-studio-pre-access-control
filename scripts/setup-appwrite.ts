#!/usr/bin/env tsx
/**
 * Appwrite Infrastructure Setup Script
 * 
 * This script creates the database and all required collections with proper
 * attributes, indexes, and permissions for the CredentialStudio application.
 * 
 * Prerequisites:
 * - Appwrite project created at https://cloud.appwrite.io
 * - Environment variables configured in .env.local
 * - npm install appwrite node-appwrite
 * 
 * Usage:
 * npx tsx scripts/setup-appwrite.ts
 */

import { Client, Databases, ID, Permission, Role, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Databases instance will be initialized in main() after environment validation
let databases: Databases;

// Database and Collection IDs
const DATABASE_ID = 'credentialstudio';
const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  ATTENDEES: 'attendees',
  CUSTOM_FIELDS: 'custom_fields',
  EVENT_SETTINGS: 'event_settings',
  LOGS: 'logs',
  LOG_SETTINGS: 'log_settings',
};

async function createDatabase() {
  try {
    console.log('Creating database...');
    await databases.create(DATABASE_ID, 'CredentialStudio Database');
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

async function createUsersCollection(databaseId: string) {
  try {
    console.log('\nCreating users collection...');
    const collectionId = await databases.createCollection(
      databaseId,
      COLLECTIONS.USERS,
      'Users',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()), // Only authenticated users can create profiles
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(databaseId, COLLECTIONS.USERS, 'userId', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.USERS, 'email', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.USERS, 'name', 255, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.USERS, 'roleId', 255, false);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.USERS, 'isInvited', false, false);

    // Create indexes
    await databases.createIndex(databaseId, COLLECTIONS.USERS, 'email_idx', IndexType.Unique, ['email']);
    await databases.createIndex(databaseId, COLLECTIONS.USERS, 'userId_idx', IndexType.Key, ['userId']);
    await databases.createIndex(databaseId, COLLECTIONS.USERS, 'roleId_idx', IndexType.Key, ['roleId']);

    console.log('✓ Users collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Users collection already exists');
    } else {
      throw error;
    }
  }
}

async function createRolesCollection(databaseId: string) {
  try {
    console.log('\nCreating roles collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.ROLES,
      'Roles',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(databaseId, COLLECTIONS.ROLES, 'name', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ROLES, 'description', 1000, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ROLES, 'permissions', 10000, true);

    // Create indexes
    await databases.createIndex(databaseId, COLLECTIONS.ROLES, 'name_idx', IndexType.Unique, ['name']);

    console.log('✓ Roles collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Roles collection already exists');
    } else {
      throw error;
    }
  }
}

async function createAttendeesCollection(databaseId: string) {
  try {
    console.log('\nCreating attendees collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.ATTENDEES,
      'Attendees',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'firstName', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'lastName', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'barcodeNumber', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'photoUrl', 1000, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'credentialUrl', 1000, false);
    await databases.createDatetimeAttribute(databaseId, COLLECTIONS.ATTENDEES, 'credentialGeneratedAt', false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'customFieldValues', 10000, false);

    // Create indexes
    await databases.createIndex(databaseId, COLLECTIONS.ATTENDEES, 'barcodeNumber_idx', IndexType.Unique, ['barcodeNumber']);
    await databases.createIndex(databaseId, COLLECTIONS.ATTENDEES, 'lastName_idx', IndexType.Key, ['lastName']);
    await databases.createIndex(databaseId, COLLECTIONS.ATTENDEES, 'firstName_idx', IndexType.Key, ['firstName']);

    console.log('✓ Attendees collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Attendees collection already exists');
    } else {
      throw error;
    }
  }
}

async function createCustomFieldsCollection(databaseId: string) {
  try {
    console.log('\nCreating custom_fields collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.CUSTOM_FIELDS,
      'Custom Fields',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'eventSettingsId', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'fieldName', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'internalFieldName', 255, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'fieldType', 50, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'fieldOptions', 5000, false);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'required', false, false);
    await databases.createIntegerAttribute(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'fieldOrder', true);

    // Create indexes
    await databases.createIndex(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'eventSettingsId_idx', IndexType.Key, ['eventSettingsId']);
    await databases.createIndex(databaseId, COLLECTIONS.CUSTOM_FIELDS, 'fieldOrder_idx', IndexType.Key, ['fieldOrder']);

    console.log('✓ Custom fields collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Custom fields collection already exists');
    } else {
      throw error;
    }
  }
}

async function createEventSettingsCollection(databaseId: string) {
  try {
    console.log('\nCreating event_settings collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.EVENT_SETTINGS,
      'Event Settings',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes based on Prisma schema
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'eventName', 255, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'eventLogo', 1000, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'barcodeType', 50, false);
    await databases.createIntegerAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'barcodeLength', false);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'enableSwitchboard', false, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'switchboardApiKey', 500, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'switchboardTemplateId', 255, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.EVENT_SETTINGS, 'switchboardFieldMappings', 10000, false);

    console.log('✓ Event settings collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Event settings collection already exists');
    } else {
      throw error;
    }
  }
}

async function createLogsCollection(databaseId: string) {
  try {
    console.log('\nCreating logs collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.LOGS,
      'Logs',
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'userId', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'attendeeId', 255, false);
    await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'action', 255, true);
    await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'details', 10000, false);

    // Create indexes
    await databases.createIndex(databaseId, COLLECTIONS.LOGS, 'userId_idx', IndexType.Key, ['userId']);
    await databases.createIndex(databaseId, COLLECTIONS.LOGS, 'attendeeId_idx', IndexType.Key, ['attendeeId']);

    console.log('✓ Logs collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Logs collection already exists');
    } else {
      throw error;
    }
  }
}

async function createLogSettingsCollection(databaseId: string) {
  try {
    console.log('\nCreating log_settings collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.LOG_SETTINGS,
      'Log Settings',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add boolean attributes for log settings
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logUserLogin', false, true);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logUserLogout', false, true);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logAttendeeCreate', false, true);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logAttendeeUpdate', false, true);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logAttendeeDelete', false, true);
    await databases.createBooleanAttribute(databaseId, COLLECTIONS.LOG_SETTINGS, 'logCredentialGenerate', false, true);

    console.log('✓ Log settings collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Log settings collection already exists');
    } else {
      throw error;
    }
  }
}



async function printEnvironmentVariables(databaseId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('SETUP COMPLETE! Add these environment variables to your .env.local:');
  console.log('='.repeat(80));
  console.log(`
# Appwrite Database IDs
NEXT_PUBLIC_APPWRITE_DATABASE_ID=${databaseId}
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=${COLLECTIONS.USERS}
NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=${COLLECTIONS.ROLES}
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=${COLLECTIONS.ATTENDEES}
NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID=${COLLECTIONS.CUSTOM_FIELDS}
NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID=${COLLECTIONS.EVENT_SETTINGS}
NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID=${COLLECTIONS.LOGS}
NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID=${COLLECTIONS.LOG_SETTINGS}
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

    databases = new Databases(client);

    // Create database
    const databaseId = await createDatabase();

    // Create all collections
    await createUsersCollection(databaseId);
    await createRolesCollection(databaseId);
    await createAttendeesCollection(databaseId);
    await createCustomFieldsCollection(databaseId);
    await createEventSettingsCollection(databaseId);
    await createLogsCollection(databaseId);
    await createLogSettingsCollection(databaseId);

    // Print environment variables
    await printEnvironmentVariables(databaseId);

    console.log('\n✓ All collections created successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy the environment variables above to your .env.local file');
    console.log('2. Configure OAuth providers in Appwrite Console (if using Google login)');
    console.log('3. Review collection permissions in Appwrite Console');
    console.log('4. Run the data migration script when ready');

  } catch (error) {
    console.error('\n✗ Error during setup:', error);
    process.exit(1);
  }
}

main();
