---
title: "Appwrite Transactions Code Examples"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts"]
---

# Appwrite Transactions Code Examples

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Bulk Operations](#bulk-operations)
3. [Multi-Step Workflows](#multi-step-workflows)
4. [Error Handling](#error-handling)
5. [Advanced Patterns](#advanced-patterns)
6. [API Route Examples](#api-route-examples)

---

## Basic Examples

### Example 1: Simple Create with Audit Log

```typescript
import { createSessionClient } from '@/lib/appwrite';
import { executeTransactionWithRetry } from '@/lib/transactions';
import { ID } from 'appwrite';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tablesDB } = createSessionClient(req);
  const { name, email } = req.body;
  const attendeeId = ID.unique();

  const operations = [
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: attendeeId,
      data: { name, email }
    },
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId: 'user123',
        action: 'CREATE_ATTENDEE',
        details: JSON.stringify({ attendeeId, name }),
        timestamp: new Date().toISOString()
      }
    }
  ];

  try {
    await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');
    return res.status(200).json({ success: true, id: attendeeId });
  } catch (error) {
    return handleTransactionError(error, res);
  }
}
```

### Example 2: Update with Audit Log

```typescript
const attendeeId = 'existing-id';
const updates = { status: 'checked-in' };

const operations = [
  {
    action: 'update',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'attendees',
    rowId: attendeeId,
    data: updates
  },
  {
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: {
      userId: user.$id,
      action: 'UPDATE_ATTENDEE',
      details: JSON.stringify({ attendeeId, changes: updates }),
      timestamp: new Date().toISOString()
    }
  }
];

await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_update');
```


### Example 3: Delete with Audit Log

```typescript
const attendeeId = 'id-to-delete';

const operations = [
  {
    action: 'delete',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'attendees',
    rowId: attendeeId
  },
  {
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: {
      userId: user.$id,
      action: 'DELETE_ATTENDEE',
      details: JSON.stringify({ attendeeId }),
      timestamp: new Date().toISOString()
    }
  }
];

await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_delete');
```

---

## Bulk Operations

### Example 4: Bulk Import

```typescript
import { bulkImportWithFallback } from '@/lib/bulkOperations';

const attendees = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' }
];

const result = await bulkImportWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  items: attendees.map(data => ({ data })),
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_IMPORT_ATTENDEES',
    details: {
      count: attendees.length,
      source: 'csv',
      timestamp: new Date().toISOString()
    }
  }
});

console.log(`Imported ${result.createdCount} attendees`);
console.log(`Used transactions: ${result.usedTransactions}`);
if (result.batchCount) {
  console.log(`Completed in ${result.batchCount} batches`);
}
```

### Example 5: Bulk Delete

```typescript
import { bulkDeleteWithFallback } from '@/lib/bulkOperations';

const attendeeIds = ['id1', 'id2', 'id3', 'id4', 'id5'];

const result = await bulkDeleteWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  rowIds: attendeeIds,
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_DELETE_ATTENDEES',
    details: {
      count: attendeeIds.length,
      reason: 'cleanup',
      timestamp: new Date().toISOString()
    }
  }
});

console.log(`Deleted ${result.deletedCount} attendees`);
```

### Example 6: Bulk Edit

```typescript
import { bulkEditWithFallback } from '@/lib/bulkOperations';

const updates = [
  { rowId: 'id1', data: { status: 'checked-in' } },
  { rowId: 'id2', data: { status: 'checked-in' } },
  { rowId: 'id3', data: { status: 'checked-in' } }
];

const result = await bulkEditWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  updates,
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_EDIT_ATTENDEES',
    details: {
      count: updates.length,
      changes: { status: 'checked-in' },
      timestamp: new Date().toISOString()
    }
  }
});

console.log(`Updated ${result.updatedCount} attendees`);
```

---

## Multi-Step Workflows

### Example 7: User Linking (Profile + Team Membership)

```typescript
async function linkUserWithTeam(
  tablesDB: TablesDB,
  userData: {
    name: string;
    email: string;
    role: string;
  },
  teamId: string,
  userId: string
) {
  const userProfileId = ID.unique();
  const membershipId = ID.unique();

  const operations = [
    // 1. Create user profile
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'user_profiles',
      rowId: userProfileId,
      data: {
        name: userData.name,
        email: userData.email,
        role: userData.role
      }
    },
    // 2. Create team membership
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'team_memberships',
      rowId: membershipId,
      data: {
        userId: userProfileId,
        teamId,
        role: 'member',
        joinedAt: new Date().toISOString()
      }
    },
    // 3. Audit log
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId,
        action: 'LINK_USER',
        details: JSON.stringify({
          userProfileId,
          teamId,
          membershipId
        }),
        timestamp: new Date().toISOString()
      }
    }
  ];

  await executeTransactionWithRetry(tablesDB, operations, {}, 'user_linking');

  return { userProfileId, membershipId };
}
```

### Example 8: Event Settings Update (Multiple Related Updates)

```typescript
async function updateEventSettings(
  tablesDB: TablesDB,
  settingsId: string,
  updates: {
    eventName?: string;
    barcodeLength?: number;
    customFields?: any[];
  },
  customFieldsToDelete: string[],
  userId: string
) {
  const operations = [
    // 1. Update core settings
    {
      action: 'update',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'event_settings',
      rowId: settingsId,
      data: {
        eventName: updates.eventName,
        barcodeLength: updates.barcodeLength
      }
    }
  ];

  // 2. Delete old custom fields
  customFieldsToDelete.forEach(fieldId => {
    operations.push({
      action: 'delete',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'custom_fields',
      rowId: fieldId
    });
  });

  // 3. Create new custom fields
  if (updates.customFields) {
    updates.customFields.forEach(field => {
      operations.push({
        action: 'create',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: 'custom_fields',
        rowId: ID.unique(),
        data: field
      });
    });
  }

  // 4. Audit log
  operations.push({
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: {
      userId,
      action: 'UPDATE_EVENT_SETTINGS',
      details: JSON.stringify({
        settingsId,
        deletedFields: customFieldsToDelete.length,
        newFields: updates.customFields?.length || 0
      }),
      timestamp: new Date().toISOString()
    }
  });

  await executeTransactionWithRetry(
    tablesDB,
    operations,
    {},
    'event_settings_update'
  );
}
```

---

## Error Handling

### Example 9: Comprehensive Error Handling

```typescript
import { handleTransactionError, detectTransactionErrorType, TransactionErrorType } from '@/lib/transactions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tablesDB } = createSessionClient(req);

  try {
    await executeTransactionWithRetry(tablesDB, operations, {}, 'operation');
    return res.status(200).json({ success: true });
  } catch (error: any) {
    // Option 1: Use standardized error handling
    return handleTransactionError(error, res);

    // Option 2: Custom error handling
    const errorType = detectTransactionErrorType(error);

    switch (errorType) {
      case TransactionErrorType.CONFLICT:
        return res.status(409).json({
          error: 'Conflict',
          message: 'Data was modified by another user. Please refresh.',
          retryable: true
        });

      case TransactionErrorType.VALIDATION:
        return res.status(400).json({
          error: 'Validation error',
          message: error.message,
          retryable: false
        });

      case TransactionErrorType.PERMISSION:
        return res.status(403).json({
          error: 'Permission denied',
          message: 'You do not have permission for this operation',
          retryable: false
        });

      default:
        return res.status(500).json({
          error: 'Internal server error',
          message: error.message,
          retryable: false
        });
    }
  }
}
```

### Example 10: Retry with Custom Configuration

```typescript
try {
  await executeTransactionWithRetry(
    tablesDB,
    operations,
    {
      maxRetries: 5,      // More retries for high-concurrency
      retryDelay: 200     // Longer initial delay
    },
    'high_concurrency_operation'
  );
} catch (error) {
  console.error('Failed after 5 retries:', error);
  return handleTransactionError(error, res);
}
```

---

## Advanced Patterns

### Example 11: Conditional Operations

```typescript
async function updateAttendeeWithConditionalFields(
  tablesDB: TablesDB,
  attendeeId: string,
  updates: any,
  shouldUpdatePhoto: boolean,
  photoUrl?: string,
  userId: string
) {
  const operations = [
    // 1. Update attendee
    {
      action: 'update',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: attendeeId,
      data: updates
    }
  ];

  // 2. Conditionally update photo
  if (shouldUpdatePhoto && photoUrl) {
    operations.push({
      action: 'update',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: attendeeId,
      data: { photoUrl }
    });
  }

  // 3. Audit log
  operations.push({
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: {
      userId,
      action: 'UPDATE_ATTENDEE',
      details: JSON.stringify({
        attendeeId,
        updatedPhoto: shouldUpdatePhoto
      }),
      timestamp: new Date().toISOString()
    }
  });

  await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_update');
}
```

### Example 12: Batching with Manual Control

```typescript
import { getTransactionLimit } from '@/lib/transactions';

async function manualBatchImport(
  tablesDB: TablesDB,
  items: any[],
  userId: string
) {
  const limit = getTransactionLimit();
  const batchSize = limit - 1; // Leave room for audit log

  console.log(`Batching ${items.length} items into batches of ${batchSize}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    console.log(`Processing batch ${batchNumber}/${totalBatches}`);

    const operations = batch.map(item => ({
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: ID.unique(),
      data: item
    }));

    // Add audit log for this batch
    operations.push({
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId,
        action: 'BATCH_IMPORT',
        details: JSON.stringify({
          batchNumber,
          totalBatches,
          itemCount: batch.length
        }),
        timestamp: new Date().toISOString()
      }
    });

    await executeTransactionWithRetry(
      tablesDB,
      operations,
      {},
      `batch_import_${batchNumber}`
    );
  }

  console.log('All batches completed');
}
```

### Example 13: Validation Before Transaction

```typescript
async function createAttendeeWithValidation(
  tablesDB: TablesDB,
  attendeeData: any,
  userId: string
) {
  // 1. Validate data first
  const validationErrors = [];

  if (!attendeeData.name || attendeeData.name.trim() === '') {
    validationErrors.push('Name is required');
  }

  if (!attendeeData.email || !isValidEmail(attendeeData.email)) {
    validationErrors.push('Valid email is required');
  }

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // 2. Check for duplicates
  const existing = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    'attendees',
    [Query.equal('email', attendeeData.email)]
  );

  if (existing.total > 0) {
    throw new Error('Attendee with this email already exists');
  }

  // 3. Execute transaction
  const attendeeId = ID.unique();
  const operations = [
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: attendeeId,
      data: attendeeData
    },
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId,
        action: 'CREATE_ATTENDEE',
        details: JSON.stringify({ attendeeId }),
        timestamp: new Date().toISOString()
      }
    }
  ];

  await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');

  return attendeeId;
}
```

---

## API Route Examples

### Example 14: Complete API Route for Bulk Import

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { bulkImportWithFallback } from '@/lib/bulkOperations';
import { handleTransactionError } from '@/lib/transactions';
import { hasPermission } from '@/lib/permissions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get clients
    const { account, databases, tablesDB } = createSessionClient(req);
    const user = await account.get();

    // 2. Check permissions
    if (!hasPermission(user.labels, 'attendees', 'create')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 3. Validate input
    const { attendees } = req.body;

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ error: 'Invalid attendees array' });
    }

    // 4. Validate each attendee
    const validationErrors = [];
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      if (!attendee.name || !attendee.email) {
        validationErrors.push({
          row: i + 1,
          error: 'Name and email are required'
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // 5. Execute bulk import
    const result = await bulkImportWithFallback(tablesDB, databases, {
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
      items: attendees.map(data => ({ data })),
      auditLog: {
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        userId: user.$id,
        action: 'BULK_IMPORT_ATTENDEES',
        details: {
          count: attendees.length,
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }
    });

    // 6. Return success response
    return res.status(200).json({
      success: true,
      createdCount: result.createdCount,
      usedTransactions: result.usedTransactions,
      batchCount: result.batchCount,
      message: `Successfully imported ${result.createdCount} attendees`
    });
  } catch (error) {
    console.error('[Bulk Import Error]', error);
    return handleTransactionError(error, res);
  }
}
```

### Example 15: Complete API Route for Single Create

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { executeTransactionWithRetry, handleTransactionError } from '@/lib/transactions';
import { hasPermission } from '@/lib/permissions';
import { ID } from 'appwrite';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get clients
    const { account, tablesDB } = createSessionClient(req);
    const user = await account.get();

    // 2. Check permissions
    if (!hasPermission(user.labels, 'attendees', 'create')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 3. Validate input
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and email are required'
      });
    }

    // 4. Create transaction operations
    const attendeeId = ID.unique();
    const operations = [
      {
        action: 'create',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
        rowId: attendeeId,
        data: { name, email, phone }
      },
      {
        action: 'create',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        data: {
          userId: user.$id,
          action: 'CREATE_ATTENDEE',
          details: JSON.stringify({
            attendeeId,
            name,
            email
          }),
          timestamp: new Date().toISOString()
        }
      }
    ];

    // 5. Execute transaction
    await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');

    // 6. Return success response
    return res.status(200).json({
      success: true,
      id: attendeeId,
      message: 'Attendee created successfully'
    });
  } catch (error) {
    console.error('[Create Attendee Error]', error);
    return handleTransactionError(error, res);
  }
}
```

---

## Additional Resources

- [Transaction Developer Guide](./TRANSACTIONS_DEVELOPER_GUIDE.md)
- [Transaction Best Practices](./TRANSACTIONS_BEST_PRACTICES.md)
- [Transaction Utilities Source Code](../../src/lib/transactions.ts)
- [Bulk Operations Source Code](../../src/lib/bulkOperations.ts)

---

**Last Updated:** January 2025  
**Version:** 1.0.0
