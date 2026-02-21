import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID',
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const LOG_SETTINGS_ATTRIBUTES = [
  'attendeeCreate',
  'attendeeUpdate',
  'attendeeDelete',
  'attendeeView',
  'attendeeBulkDelete',
  'attendeeImport',
  'attendeeExport',
  'credentialGenerate',
  'credentialClear',
  'userCreate',
  'userUpdate',
  'userDelete',
  'userView',
  'userInvite',
  'roleCreate',
  'roleUpdate',
  'roleDelete',
  'roleView',
  'eventSettingsUpdate',
  'customFieldCreate',
  'customFieldUpdate',
  'customFieldDelete',
  'customFieldReorder',
  'authLogin',
  'authLogout',
  'logsDelete',
  'logsExport',
  'logsView',
  'systemViewEventSettings',
  'systemViewAttendeeList',
  'systemViewRolesList',
  'systemViewUsersList'
];

async function fixLogSettingsCollection() {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID;

  if (!databaseId || !tableId) {
    throw new Error(
      'Missing required environment variables:\n' +
      `  NEXT_PUBLIC_APPWRITE_DATABASE_ID: ${databaseId ? '✓' : '✗'}\n` +
      `  NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID: ${tableId ? '✓' : '✗'}`
    );
  }

  console.log('Fixing log_settings collection...');
  console.log('Database ID:', databaseId);
  console.log('Collection ID:', tableId);

  // Get existing attributes
  try {
    const collection = await databases.getCollection(databaseId, tableId);
    const existingAttributes = collection.attributes.map((attr: any) => attr.key);
    
    console.log('\nExisting attributes:', existingAttributes);
    console.log('\nRequired attributes:', LOG_SETTINGS_ATTRIBUTES);

    // Find missing attributes
    const missingAttributes = LOG_SETTINGS_ATTRIBUTES.filter(
      attr => !existingAttributes.includes(attr)
    );

    console.log('\nMissing attributes:', missingAttributes);

    if (missingAttributes.length === 0) {
      console.log('\n✓ All attributes already exist!');
      return;
    }

    // Add missing attributes
    console.log(`\nAdding ${missingAttributes.length} missing attributes...`);
    
    for (const attr of missingAttributes) {
      try {
        await databases.createBooleanAttribute(
          databaseId,
          tableId,
          attr,
          false, // required
          true   // default value
        );
        console.log(`✓ Added attribute: ${attr}`);
        
        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  Attribute ${attr} already exists`);
        } else {
          console.error(`✗ Failed to add attribute ${attr}:`, error.message);
        }
      }
    }

    console.log('\n✓ Log settings collection fixed!');
    console.log('\nNote: You may need to wait a few moments for Appwrite to process the changes.');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    throw error;
  }
}

fixLogSettingsCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to fix log settings collection:', error);
    process.exit(1);
  });
