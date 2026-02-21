import { createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

// Cache for log settings to avoid repeated database queries
let logSettingsCache: any = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function getLogSettings() {
  const now = Date.now();
  
  // Return cached settings if they're still fresh
  if (logSettingsCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return logSettingsCache;
  }
  
  try {
    const { tablesDB } = createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const logSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID!;

    const logSettingsResult = await tablesDB.listRows(
      dbId,
      logSettingsTableId,
      [Query.limit(1)]
    );
    
    let logSettings;
    if (logSettingsResult.rows.length === 0) {
      // Create default log settings if none exist
      logSettings = await tablesDB.createRow(
        dbId,
        logSettingsTableId,
        ID.unique(),
        {
          attendeeCreate: true,
          attendeeUpdate: true,
          attendeeDelete: true,
          attendeeView: false,
          attendeeBulkDelete: true,
          attendeeImport: true,
          attendeeExport: true,
          credentialGenerate: true,
          credentialClear: true,
          userCreate: true,
          userUpdate: true,
          userDelete: true,
          userView: false,
          userInvite: true,
          roleCreate: true,
          roleUpdate: true,
          roleDelete: true,
          roleView: false,
          eventSettingsUpdate: true,
          customFieldCreate: true,
          customFieldUpdate: true,
          customFieldDelete: true,
          customFieldReorder: true,
          authLogin: true,
          authLogout: true,
          logsDelete: true,
          logsExport: true,
          logsView: false,
          systemViewEventSettings: false,
          systemViewAttendeeList: false,
          systemViewRolesList: false,
          systemViewUsersList: false,
          // Access control logging settings
          accessControlUpdate: true,
          approvalProfileCreate: true,
          approvalProfileUpdate: true,
          approvalProfileDelete: true,
          scanLogsExport: true
        }
      );
    } else {
      logSettings = logSettingsResult.rows[0];
    }
    
    // Update cache
    logSettingsCache = logSettings;
    lastCacheUpdate = now;
    
    return logSettings;
  } catch (error) {
    console.error('Error fetching log settings:', error);
    // Return default settings if database query fails
    return {
      attendeeCreate: true,
      attendeeUpdate: true,
      attendeeDelete: true,
      attendeeView: false,
      attendeeBulkDelete: true,
      attendeeImport: true,
      attendeeExport: true,
      credentialGenerate: true,
      credentialClear: true,
      userCreate: true,
      userUpdate: true,
      userDelete: true,
      userView: false,
      userInvite: true,
      roleCreate: true,
      roleUpdate: true,
      roleDelete: true,
      roleView: false,
      eventSettingsUpdate: true,
      customFieldCreate: true,
      customFieldUpdate: true,
      customFieldDelete: true,
      customFieldReorder: true,
      authLogin: true,
      authLogout: true,
      logsDelete: true,
      logsExport: true,
      logsView: false,
      systemViewEventSettings: false,
      systemViewAttendeeList: false,
      systemViewRolesList: false,
      systemViewUsersList: false,
      // Access control logging settings
      accessControlUpdate: true,
      approvalProfileCreate: true,
      approvalProfileUpdate: true,
      approvalProfileDelete: true,
      scanLogsExport: true
    };
  }
}

export async function shouldLog(settingKey: string): Promise<boolean> {
  try {
    const settings = await getLogSettings();
    return settings[settingKey] !== false; // Default to true if setting doesn't exist
  } catch (error) {
    console.error('Error checking log setting:', error);
    return true; // Default to logging if there's an error
  }
}

// Clear cache when settings are updated
export function clearLogSettingsCache() {
  logSettingsCache = null;
  lastCacheUpdate = 0;
}