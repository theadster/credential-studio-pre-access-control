import { createAdminClient } from '@/lib/appwrite';

async function checkSchema() {
  try {
    // Validate required environment variables
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID;

    if (!databaseId) {
      throw new Error('Missing environment variable: NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    }
    if (!tableId) {
      throw new Error('Missing environment variable: NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID');
    }

    const { tablesDB } = createAdminClient();

    console.log(`Checking schema for table: ${tableId}`);
    
    const table = await tablesDB.getTable({ databaseId, tableId });
    
    console.log('\nColumns in scan_logs table:');
    const columns = (table as any).columns || [];
    columns.forEach((col: any) => {
      console.log(`  - ${col.key} (${col.type}, required: ${col.required})`);
    });

    const hasResult = columns.some((col: any) => col.key === 'result');
    console.log(`\n✓ Has 'result' column: ${hasResult}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkSchema();
