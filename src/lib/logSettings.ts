import prisma from '@/lib/prisma';

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
    let logSettings = await prisma.logSettings.findFirst();
    
    if (!logSettings) {
      // Create default log settings if none exist
      logSettings = await prisma.logSettings.create({
        data: {}
      });
    }
    
    // Update cache
    logSettingsCache = logSettings;
    lastCacheUpdate = now;
    
    return logSettings;
  } catch (error) {
    console.error('Error fetching log settings:', error);
    // Return default settings if database query fails
    return {
      systemViewEventSettings: false,
      systemViewAttendeeList: false,
      systemViewRolesList: false,
      systemViewUsersList: false,
      // Add other default values as needed
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