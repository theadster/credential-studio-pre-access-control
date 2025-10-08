/**
 * Data Migration Script: Supabase to Appwrite
 * 
 * This script migrates all data from Supabase/Prisma to Appwrite.
 * It handles:
 * - Supabase Auth users -> Appwrite Auth
 * - All database tables -> Appwrite collections
 * - Data transformation (JSON fields, relationships, denormalization)
 * 
 * Usage: npx tsx src/scripts/migrate-to-appwrite.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Client, Databases, Users, ID, Query } from 'node-appwrite';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteDatabases = new Databases(appwriteClient);
const appwriteUsers = new Users(appwriteClient);

// Collection IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTIONS = {
  users: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
  roles: process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
  attendees: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  customFields: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!,
  eventSettings: process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!,
  logs: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
  logSettings: process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!,
  invitations: process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
};

// Migration statistics
interface MigrationStats {
  authUsers: { success: number; failed: number; errors: string[] };
  users: { success: number; failed: number; errors: string[] };
  roles: { success: number; failed: number; errors: string[] };
  eventSettings: { success: number; failed: number; errors: string[] };
  customFields: { success: number; failed: number; errors: string[] };
  attendees: { success: number; failed: number; errors: string[] };
  logs: { success: number; failed: number; errors: string[] };
  logSettings: { success: number; failed: number; errors: string[] };
  invitations: { success: number; failed: number; errors: string[] };
}

const stats: MigrationStats = {
  authUsers: { success: 0, failed: 0, errors: [] },
  users: { success: 0, failed: 0, errors: [] },
  roles: { success: 0, failed: 0, errors: [] },
  eventSettings: { success: 0, failed: 0, errors: [] },
  customFields: { success: 0, failed: 0, errors: [] },
  attendees: { success: 0, failed: 0, errors: [] },
  logs: { success: 0, failed: 0, errors: [] },
  logSettings: { success: 0, failed: 0, errors: [] },
  invitations: { success: 0, failed: 0, errors: [] },
};

// Helper function to log progress
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Helper function to handle errors
function handleError(category: keyof MigrationStats, error: any, context: string) {
  const errorMessage = `${context}: ${error.message || error}`;
  stats[category].failed++;
  stats[category].errors.push(errorMessage);
  log(errorMessage, 'error');
}

/**
 * Step 1: Migrate Supabase Auth users to Appwrite Auth
 */
async function migrateAuthUsers() {
  log('Starting Auth users migration...', 'info');
  
  try {
    // Fetch all users from Supabase Auth
    const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Failed to fetch Supabase users: ${error.message}`);
    }
    
    log(`Found ${supabaseUsers.users.length} auth users to migrate`, 'info');
    
    for (const supabaseUser of supabaseUsers.users) {
      try {
        // Check if user already exists in Appwrite
        try {
          await appwriteUsers.get(supabaseUser.id);
          log(`User ${supabaseUser.email} already exists in Appwrite, skipping`, 'warn');
          stats.authUsers.success++;
          continue;
        } catch (e: any) {
          if (e.code !== 404) {
            throw e;
          }
          // User doesn't exist, proceed with creation
        }
        
        // Create user in Appwrite Auth
        await appwriteUsers.create(
          supabaseUser.id, // Use same ID
          supabaseUser.email || undefined,
          undefined, // phone
          undefined, // password (will need to be reset)
          supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User'
        );
        
        // Update email verification status if verified
        if (supabaseUser.email_confirmed_at) {
          await appwriteUsers.updateEmailVerification(supabaseUser.id, true);
        }
        
        stats.authUsers.success++;
        log(`Migrated auth user: ${supabaseUser.email}`, 'success');
      } catch (error: any) {
        handleError('authUsers', error, `Auth user ${supabaseUser.email}`);
      }
    }
    
    log(`Auth users migration completed: ${stats.authUsers.success} success, ${stats.authUsers.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in auth users migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 2: Migrate Roles
 */
async function migrateRoles() {
  log('Starting Roles migration...', 'info');
  
  try {
    const roles = await prisma.role.findMany();
    log(`Found ${roles.length} roles to migrate`, 'info');
    
    for (const role of roles) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.roles,
          role.id,
          {
            name: role.name,
            description: role.description || '',
            permissions: JSON.stringify(role.permissions),
          }
        );
        
        stats.roles.success++;
        log(`Migrated role: ${role.name}`, 'success');
      } catch (error: any) {
        handleError('roles', error, `Role ${role.name}`);
      }
    }
    
    log(`Roles migration completed: ${stats.roles.success} success, ${stats.roles.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in roles migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 3: Migrate Users (database profiles)
 */
async function migrateUsers() {
  log('Starting Users migration...', 'info');
  
  try {
    const users = await prisma.user.findMany();
    log(`Found ${users.length} user profiles to migrate`, 'info');
    
    for (const user of users) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.users,
          ID.unique(),
          {
            userId: user.id,
            email: user.email,
            name: user.name || '',
            roleId: user.roleId || '',
            isInvited: user.isInvited,
          }
        );
        
        stats.users.success++;
        log(`Migrated user profile: ${user.email}`, 'success');
      } catch (error: any) {
        handleError('users', error, `User ${user.email}`);
      }
    }
    
    log(`Users migration completed: ${stats.users.success} success, ${stats.users.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in users migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 4: Migrate Event Settings
 */
async function migrateEventSettings() {
  log('Starting Event Settings migration...', 'info');
  
  try {
    const eventSettings = await prisma.eventSettings.findMany();
    log(`Found ${eventSettings.length} event settings to migrate`, 'info');
    
    for (const settings of eventSettings) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.eventSettings,
          settings.id,
          {
            eventName: settings.eventName,
            eventDate: settings.eventDate.toISOString(),
            eventTime: settings.eventTime || '',
            eventLocation: settings.eventLocation,
            timeZone: settings.timeZone,
            barcodeType: settings.barcodeType,
            barcodeLength: settings.barcodeLength,
            barcodeUnique: settings.barcodeUnique,
            forceFirstNameUppercase: settings.forceFirstNameUppercase || false,
            forceLastNameUppercase: settings.forceLastNameUppercase || false,
            attendeeSortField: settings.attendeeSortField || 'lastName',
            attendeeSortDirection: settings.attendeeSortDirection || 'asc',
            cloudinaryEnabled: settings.cloudinaryEnabled || false,
            cloudinaryCloudName: settings.cloudinaryCloudName || '',
            cloudinaryApiKey: settings.cloudinaryApiKey || '',
            cloudinaryApiSecret: settings.cloudinaryApiSecret || '',
            cloudinaryUploadPreset: settings.cloudinaryUploadPreset || '',
            cloudinaryAutoOptimize: settings.cloudinaryAutoOptimize || false,
            cloudinaryGenerateThumbnails: settings.cloudinaryGenerateThumbnails || false,
            cloudinaryDisableSkipCrop: settings.cloudinaryDisableSkipCrop || false,
            cloudinaryCropAspectRatio: settings.cloudinaryCropAspectRatio || '1',
            switchboardEnabled: settings.switchboardEnabled || false,
            switchboardApiEndpoint: settings.switchboardApiEndpoint || '',
            switchboardAuthHeaderType: settings.switchboardAuthHeaderType || 'Bearer',
            switchboardApiKey: settings.switchboardApiKey || '',
            switchboardRequestBody: settings.switchboardRequestBody || '',
            switchboardTemplateId: settings.switchboardTemplateId || '',
            switchboardFieldMappings: settings.switchboardFieldMappings ? JSON.stringify(settings.switchboardFieldMappings) : '{}',
            oneSimpleApiEnabled: settings.oneSimpleApiEnabled || false,
            oneSimpleApiUrl: settings.oneSimpleApiUrl || '',
            oneSimpleApiFormDataKey: settings.oneSimpleApiFormDataKey || '',
            oneSimpleApiFormDataValue: settings.oneSimpleApiFormDataValue || '',
            oneSimpleApiRecordTemplate: settings.oneSimpleApiRecordTemplate || '',
            bannerImageUrl: settings.bannerImageUrl || '',
            signInBannerUrl: settings.signInBannerUrl || '',
          }
        );
        
        stats.eventSettings.success++;
        log(`Migrated event settings: ${settings.eventName}`, 'success');
      } catch (error: any) {
        handleError('eventSettings', error, `Event settings ${settings.eventName}`);
      }
    }
    
    log(`Event Settings migration completed: ${stats.eventSettings.success} success, ${stats.eventSettings.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in event settings migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 5: Migrate Custom Fields
 */
async function migrateCustomFields() {
  log('Starting Custom Fields migration...', 'info');
  
  try {
    const customFields = await prisma.customField.findMany();
    log(`Found ${customFields.length} custom fields to migrate`, 'info');
    
    for (const field of customFields) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.customFields,
          field.id,
          {
            eventSettingsId: field.eventSettingsId,
            fieldName: field.fieldName,
            internalFieldName: field.internalFieldName || '',
            fieldType: field.fieldType,
            fieldOptions: field.fieldOptions ? JSON.stringify(field.fieldOptions) : '[]',
            required: field.required,
            order: field.order,
          }
        );
        
        stats.customFields.success++;
        log(`Migrated custom field: ${field.fieldName}`, 'success');
      } catch (error: any) {
        handleError('customFields', error, `Custom field ${field.fieldName}`);
      }
    }
    
    log(`Custom Fields migration completed: ${stats.customFields.success} success, ${stats.customFields.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in custom fields migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 6: Migrate Attendees with denormalized custom field values
 */
async function migrateAttendees() {
  log('Starting Attendees migration...', 'info');
  
  try {
    const attendees = await prisma.attendee.findMany({
      include: {
        customFieldValues: true,
      },
    });
    log(`Found ${attendees.length} attendees to migrate`, 'info');
    
    for (const attendee of attendees) {
      try {
        // Denormalize custom field values into a JSON object
        const customFieldValues: Record<string, string> = {};
        for (const cfv of attendee.customFieldValues) {
          customFieldValues[cfv.customFieldId] = cfv.value;
        }
        
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.attendees,
          attendee.id,
          {
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            barcodeNumber: attendee.barcodeNumber,
            photoUrl: attendee.photoUrl || '',
            credentialUrl: attendee.credentialUrl || '',
            credentialGeneratedAt: attendee.credentialGeneratedAt?.toISOString() || '',
            customFieldValues: JSON.stringify(customFieldValues),
          }
        );
        
        stats.attendees.success++;
        log(`Migrated attendee: ${attendee.firstName} ${attendee.lastName}`, 'success');
      } catch (error: any) {
        handleError('attendees', error, `Attendee ${attendee.firstName} ${attendee.lastName}`);
      }
    }
    
    log(`Attendees migration completed: ${stats.attendees.success} success, ${stats.attendees.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in attendees migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 7: Migrate Logs
 */
async function migrateLogs() {
  log('Starting Logs migration...', 'info');
  
  try {
    const logs = await prisma.log.findMany();
    log(`Found ${logs.length} logs to migrate`, 'info');
    
    for (const logEntry of logs) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.logs,
          logEntry.id,
          {
            userId: logEntry.userId,
            attendeeId: logEntry.attendeeId || '',
            action: logEntry.action,
            details: logEntry.details ? JSON.stringify(logEntry.details) : '{}',
          }
        );
        
        stats.logs.success++;
        if (stats.logs.success % 100 === 0) {
          log(`Migrated ${stats.logs.success} logs...`, 'info');
        }
      } catch (error: any) {
        handleError('logs', error, `Log ${logEntry.id}`);
      }
    }
    
    log(`Logs migration completed: ${stats.logs.success} success, ${stats.logs.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in logs migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 8: Migrate Log Settings
 */
async function migrateLogSettings() {
  log('Starting Log Settings migration...', 'info');
  
  try {
    const logSettings = await prisma.logSettings.findMany();
    log(`Found ${logSettings.length} log settings to migrate`, 'info');
    
    for (const settings of logSettings) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.logSettings,
          settings.id,
          {
            attendeeCreate: settings.attendeeCreate,
            attendeeUpdate: settings.attendeeUpdate,
            attendeeDelete: settings.attendeeDelete,
            attendeeView: settings.attendeeView,
            attendeeBulkDelete: settings.attendeeBulkDelete,
            attendeeImport: settings.attendeeImport,
            attendeeExport: settings.attendeeExport,
            credentialGenerate: settings.credentialGenerate,
            credentialClear: settings.credentialClear,
            userCreate: settings.userCreate,
            userUpdate: settings.userUpdate,
            userDelete: settings.userDelete,
            userView: settings.userView,
            userInvite: settings.userInvite,
            roleCreate: settings.roleCreate,
            roleUpdate: settings.roleUpdate,
            roleDelete: settings.roleDelete,
            roleView: settings.roleView,
            eventSettingsUpdate: settings.eventSettingsUpdate,
            customFieldCreate: settings.customFieldCreate,
            customFieldUpdate: settings.customFieldUpdate,
            customFieldDelete: settings.customFieldDelete,
            customFieldReorder: settings.customFieldReorder,
            authLogin: settings.authLogin,
            authLogout: settings.authLogout,
            logsDelete: settings.logsDelete,
            logsExport: settings.logsExport,
            logsView: settings.logsView,
            systemViewEventSettings: settings.systemViewEventSettings,
            systemViewAttendeeList: settings.systemViewAttendeeList,
            systemViewRolesList: settings.systemViewRolesList,
            systemViewUsersList: settings.systemViewUsersList,
          }
        );
        
        stats.logSettings.success++;
        log(`Migrated log settings`, 'success');
      } catch (error: any) {
        handleError('logSettings', error, `Log settings ${settings.id}`);
      }
    }
    
    log(`Log Settings migration completed: ${stats.logSettings.success} success, ${stats.logSettings.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in log settings migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 9: Migrate Invitations
 */
async function migrateInvitations() {
  log('Starting Invitations migration...', 'info');
  
  try {
    const invitations = await prisma.invitation.findMany();
    log(`Found ${invitations.length} invitations to migrate`, 'info');
    
    for (const invitation of invitations) {
      try {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.invitations,
          invitation.id,
          {
            userId: invitation.userId,
            token: invitation.token,
            expiresAt: invitation.expiresAt.toISOString(),
            usedAt: invitation.usedAt?.toISOString() || '',
            createdBy: invitation.createdBy,
          }
        );
        
        stats.invitations.success++;
        log(`Migrated invitation for user ${invitation.userId}`, 'success');
      } catch (error: any) {
        handleError('invitations', error, `Invitation ${invitation.id}`);
      }
    }
    
    log(`Invitations migration completed: ${stats.invitations.success} success, ${stats.invitations.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in invitations migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Generate migration summary report
 */
function generateReport() {
  log('\n========================================', 'info');
  log('MIGRATION SUMMARY REPORT', 'info');
  log('========================================\n', 'info');
  
  const categories: Array<keyof MigrationStats> = [
    'authUsers',
    'users',
    'roles',
    'eventSettings',
    'customFields',
    'attendees',
    'logs',
    'logSettings',
    'invitations',
  ];
  
  const categoryLabels: Record<keyof MigrationStats, string> = {
    authUsers: 'Auth Users',
    users: 'User Profiles',
    roles: 'Roles',
    eventSettings: 'Event Settings',
    customFields: 'Custom Fields',
    attendees: 'Attendees',
    logs: 'Logs',
    logSettings: 'Log Settings',
    invitations: 'Invitations',
  };
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const category of categories) {
    const stat = stats[category];
    totalSuccess += stat.success;
    totalFailed += stat.failed;
    
    const status = stat.failed === 0 ? '✅' : stat.success > 0 ? '⚠️' : '❌';
    log(`${status} ${categoryLabels[category]}: ${stat.success} success, ${stat.failed} failed`, 'info');
    
    if (stat.errors.length > 0 && stat.errors.length <= 5) {
      stat.errors.forEach(error => log(`   - ${error}`, 'error'));
    } else if (stat.errors.length > 5) {
      stat.errors.slice(0, 5).forEach(error => log(`   - ${error}`, 'error'));
      log(`   ... and ${stat.errors.length - 5} more errors`, 'error');
    }
  }
  
  log('\n========================================', 'info');
  log(`TOTAL: ${totalSuccess} success, ${totalFailed} failed`, totalFailed === 0 ? 'success' : 'warn');
  log('========================================\n', 'info');
  
  if (totalFailed === 0) {
    log('🎉 Migration completed successfully!', 'success');
  } else {
    log('⚠️  Migration completed with some errors. Please review the errors above.', 'warn');
  }
}

/**
 * Verify environment variables and connections
 */
async function verifySetup() {
  log('Verifying setup...', 'info');
  
  // Check required environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`, 'error');
    throw new Error('Missing required environment variables');
  }
  
  // Test Supabase connection
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    log('✅ Supabase connection verified', 'success');
  } catch (error: any) {
    log(`Failed to connect to Supabase: ${error.message}`, 'error');
    throw error;
  }
  
  // Test Appwrite connection
  try {
    await appwriteDatabases.list();
    log('✅ Appwrite connection verified', 'success');
  } catch (error: any) {
    log(`Failed to connect to Appwrite: ${error.message}`, 'error');
    throw error;
  }
  
  // Test Prisma connection
  try {
    await prisma.$connect();
    log('✅ Prisma connection verified', 'success');
  } catch (error: any) {
    log(`Failed to connect to Prisma: ${error.message}`, 'error');
    throw error;
  }
  
  log('All connections verified successfully!\n', 'success');
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation() {
  log('⚠️  WARNING: This will migrate all data from Supabase to Appwrite.', 'warn');
  log('⚠️  Make sure you have backed up your Supabase data before proceeding.', 'warn');
  log('⚠️  Users will need to reset their passwords after migration.\n', 'warn');
  
  // In a real scenario, you might want to add readline for interactive confirmation
  // For now, we'll proceed automatically
  log('Proceeding with migration...\n', 'info');
}

/**
 * Main migration function
 */
async function main() {
  log('🚀 Starting Supabase to Appwrite migration...', 'info');
  log('========================================\n', 'info');
  
  try {
    // Verify setup
    await verifySetup();
    
    // Prompt for confirmation
    await promptConfirmation();
    
    // Run migrations in order
    await migrateAuthUsers();
    await migrateRoles();
    await migrateUsers();
    await migrateEventSettings();
    await migrateCustomFields();
    await migrateAttendees();
    await migrateLogs();
    await migrateLogSettings();
    await migrateInvitations();
    
    // Generate report
    generateReport();
    
    log('\n📝 Next Steps:', 'info');
    log('1. Verify data in Appwrite dashboard', 'info');
    log('2. Test authentication and application features', 'info');
    log('3. Send password reset emails to all users', 'info');
    log('4. Monitor application for any issues', 'info');
    log('5. Keep Supabase active until fully verified', 'info');
  } catch (error: any) {
    log(`\n❌ Migration failed with fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.$disconnect();
  }
}

// Run migration
main();
