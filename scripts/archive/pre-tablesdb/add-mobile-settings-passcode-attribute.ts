#!/usr/bin/env tsx
/**
 * Migration Script: Add mobileSettingsPasscode attribute to event_settings collection
 * 
 * This script adds a new String attribute to store a 4-digit numerical passcode
 * for mobile app settings protection in the event_settings collection.
 * 
 * Usage:
 * npx tsx scripts/archive/pre-tablesdb/add-mobile-settings-passcode-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

  try {
    console.log('Adding mobileSettingsPasscode attribute to event_settings collection...');
    
    // Create a String attribute to store the 4-digit passcode
    // Size: 4 characters (exactly 4 digits)
    // Required: false (optional field - passcode protection is optional)
    // Default: undefined (no passcode protection by default)
    await databases.createStringAttribute(
      databaseId,
      tableId,
      'mobileSettingsPasscode',
      4,        // size: exactly 4 characters
      false,    // not required
      undefined, // default value: undefined (will be null in database)
      false     // not an array
    );

    console.log('✓ Successfully added mobileSettingsPasscode attribute');
    console.log('  - Type: String');
    console.log('  - Size: 4 characters');
    console.log('  - Required: false');
    console.log('  - Default: null');
    
    // Wait for attribute to be ready
    console.log('\nWaiting for attribute to be available...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const attribute: any = await databases.getAttribute(databaseId, tableId, 'mobileSettingsPasscode');
        console.log('✓ Attribute is now available and ready to use');
        console.log('  - Status:', attribute.status);
        console.log('  - Key:', attribute.key);
        console.log('  - Type:', attribute.type);
        console.log('  - Size:', attribute.size);
        console.log('  - Required:', attribute.required);
        console.log('  - Default:', attribute.default);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('⚠ Attribute created but may still be processing. Please wait a moment before using it.');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now set a 4-digit passcode for mobile app settings protection.');
    console.log('The passcode will be available through the Mobile Event Info API.');
    
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ Attribute already exists, skipping creation...');
      
      // Verify the existing attribute
      try {
        const attribute: any = await databases.getAttribute(databaseId, tableId, 'mobileSettingsPasscode');
        console.log('\n✓ Verified existing attribute:');
        console.log('  - Status:', attribute.status);
        console.log('  - Key:', attribute.key);
        console.log('  - Type:', attribute.type);
        console.log('  - Size:', attribute.size);
        console.log('  - Required:', attribute.required);
        console.log('  - Default:', attribute.default);
        console.log('\n✅ Migration check completed - attribute already exists!');
      } catch (verifyError) {
        console.error('❌ Error verifying existing attribute:', verifyError);
        process.exit(1);
      }
    } else {
      console.error('❌ Error adding attribute:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

main().catch(console.error);
