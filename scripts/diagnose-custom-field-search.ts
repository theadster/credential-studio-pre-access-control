#!/usr/bin/env tsx
/**
 * Diagnostic Script: Custom Field Search Investigation
 * 
 * This script helps diagnose why custom field search might not be working.
 * It checks:
 * 1. Custom field definitions and visibility settings
 * 2. Sample attendee data with custom field values
 * 3. Data format and structure
 * 
 * Usage:
 * npx tsx scripts/diagnose-custom-field-search.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function diagnoseCustomFieldSearch() {
  console.log('🔍 Custom Field Search Diagnostic\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
  const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

  try {
    // 1. Check custom fields
    console.log('📋 Step 1: Checking Custom Field Definitions\n');
    const customFields = await databases.listDocuments(
      databaseId,
      customFieldsCollectionId,
      [Query.isNull('deletedAt'), Query.orderAsc('order')]
    );

    if (customFields.documents.length === 0) {
      console.log('⚠️  No custom fields found!\n');
    } else {
      console.log(`Found ${customFields.documents.length} custom field(s):\n`);
      customFields.documents.forEach((field: any, index: number) => {
        console.log(`${index + 1}. ${field.fieldName}`);
        console.log(`   ID: ${field.$id}`);
        console.log(`   Type: ${field.fieldType}`);
        console.log(`   Required: ${field.required}`);
        console.log(`   Show on Main Page: ${field.showOnMainPage !== false ? 'YES' : 'NO'} ${field.showOnMainPage === false ? '⚠️  HIDDEN' : '✓'}`);
        console.log(`   Order: ${field.order}`);
        console.log();
      });
    }

    // 2. Check sample attendees
    console.log('👥 Step 2: Checking Sample Attendee Data\n');
    const attendees = await databases.listDocuments(
      databaseId,
      attendeesCollectionId,
      [Query.limit(5), Query.orderDesc('$createdAt')]
    );

    if (attendees.documents.length === 0) {
      console.log('⚠️  No attendees found!\n');
    } else {
      console.log(`Checking ${attendees.documents.length} most recent attendee(s):\n`);
      
      attendees.documents.forEach((attendee: any, index: number) => {
        console.log(`${index + 1}. ${attendee.firstName} ${attendee.lastName} (${attendee.barcodeNumber})`);
        console.log(`   ID: ${attendee.$id}`);
        
        // Parse custom field values
        let customFieldValues: any = {};
        if (attendee.customFieldValues) {
          try {
            customFieldValues = typeof attendee.customFieldValues === 'string'
              ? JSON.parse(attendee.customFieldValues)
              : attendee.customFieldValues;
          } catch (e) {
            console.log(`   ❌ Error parsing customFieldValues: ${e}`);
          }
        }

        // Check if it's object or array format
        if (Array.isArray(customFieldValues)) {
          console.log(`   Custom Fields (Legacy Array Format): ${customFieldValues.length} field(s)`);
          customFieldValues.forEach((cfv: any) => {
            const field = customFields.documents.find((f: any) => f.$id === cfv.customFieldId);
            const fieldName = field ? field.fieldName : 'Unknown Field';
            console.log(`      - ${fieldName}: "${cfv.value}"`);
          });
        } else if (customFieldValues && typeof customFieldValues === 'object') {
          const fieldCount = Object.keys(customFieldValues).length;
          console.log(`   Custom Fields (Object Format): ${fieldCount} field(s)`);
          Object.entries(customFieldValues).forEach(([fieldId, value]) => {
            const field = customFields.documents.find((f: any) => f.$id === fieldId);
            const fieldName = field ? field.fieldName : 'Unknown Field';
            const isVisible = field ? (field.showOnMainPage !== false) : false;
            const visibilityIcon = isVisible ? '✓' : '⚠️  HIDDEN';
            console.log(`      - ${fieldName} (${fieldId}): "${value}" ${visibilityIcon}`);
          });
        } else {
          console.log(`   Custom Fields: None`);
        }
        console.log();
      });
    }

    // 3. Summary and recommendations
    console.log('📊 Summary and Recommendations\n');
    
    const hiddenFields = customFields.documents.filter((f: any) => f.showOnMainPage === false);
    if (hiddenFields.length > 0) {
      console.log(`⚠️  ${hiddenFields.length} custom field(s) are hidden (showOnMainPage = false):`);
      hiddenFields.forEach((f: any) => {
        console.log(`   - ${f.fieldName} (ID: ${f.$id})`);
      });
      console.log('\n   These fields will NOT appear in search results on the main page.');
      console.log('   To make them searchable, set showOnMainPage = true.\n');
    }

    const attendeesWithCustomFields = attendees.documents.filter((a: any) => {
      if (!a.customFieldValues) return false;
      try {
        const parsed = typeof a.customFieldValues === 'string'
          ? JSON.parse(a.customFieldValues)
          : a.customFieldValues;
        return Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    });

    console.log(`✓ ${attendeesWithCustomFields.length} of ${attendees.documents.length} sampled attendees have custom field values\n`);

    if (attendeesWithCustomFields.length === 0 && attendees.documents.length > 0) {
      console.log('⚠️  None of the sampled attendees have custom field values!');
      console.log('   This could explain why search is not finding results.\n');
    }

    console.log('💡 Testing Tips:\n');
    console.log('1. Search for a value you see above (e.g., an email address)');
    console.log('2. Make sure the field is not hidden (showOnMainPage should be true)');
    console.log('3. Search is case-insensitive and uses "contains" matching');
    console.log('4. Check browser console for JavaScript errors during search\n');

  } catch (error: any) {
    console.error('\n❌ Diagnostic failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the diagnostic
diagnoseCustomFieldSearch();
