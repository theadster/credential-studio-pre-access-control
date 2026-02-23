import { Client, TablesDB } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkSchema() {
  try {
    const apiKey = process.env.APPWRITE_API_KEY;
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID;

    if (!apiKey || !projectId || !databaseId || !tableId) {
      console.error('Missing required environment variables');
      console.log({ apiKey: !!apiKey, projectId, databaseId, tableId });
      return;
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const tablesDB = new TablesDB(client);

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
