---
title: "Custom Fields API Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/custom-fields/"]
---

# Custom Fields API Guide

Quick reference for working with the Custom Fields API.

## Table of Contents
- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Optimistic Locking](#optimistic-locking)
- [Soft Delete](#soft-delete)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The Custom Fields API supports:
- ✅ Version-based optimistic locking
- ✅ Soft delete with deletedAt timestamp
- ✅ Automatic filtering of deleted fields
- ✅ Comprehensive logging and monitoring

## API Endpoints

### List Custom Fields
```http
GET /api/custom-fields
```

**Response:** Array of active (non-deleted) custom fields
```json
[
  {
    "$id": "field123",
    "fieldName": "Company Name",
    "fieldType": "text",
    "version": 3,
    "order": 1,
    "required": false
  }
]
```

### Get Single Field
```http
GET /api/custom-fields/field123
```

**Success (200):**
```json
{
  "$id": "field123",
  "fieldName": "Company Name",
  "fieldType": "text",
  "version": 3
}
```

**Deleted (410):**
```json
{
  "error": "Custom field has been deleted",
  "deletedAt": "2025-10-08T15:30:00.000Z"
}
```

### Create Field
```http
POST /api/custom-fields
Content-Type: application/json

{
  "eventSettingsId": "event123",
  "fieldName": "Company Name",
  "fieldType": "text",
  "required": false,
  "order": 1
}
```

**Response (201):**
```json
{
  "$id": "field123",
  "fieldName": "Company Name",
  "fieldType": "text",
  "version": 0,
  "order": 1
}
```

### Update Field (with Optimistic Locking)
```http
PUT /api/custom-fields/field123
Content-Type: application/json

{
  "fieldName": "Updated Name",
  "fieldType": "text",
  "required": true,
  "order": 1,
  "version": 3
}
```

**Success (200):**
```json
{
  "$id": "field123",
  "fieldName": "Updated Name",
  "version": 4
}
```

**Version Conflict (409):**
```json
{
  "error": "Conflict: Document has been modified by another user",
  "details": {
    "message": "The document version you are trying to update is outdated",
    "currentVersion": 5,
    "providedVersion": 3
  }
}
```

**Missing Version (400):**
```json
{
  "error": "Version field is required for update operations",
  "details": "Include the current version number from the document you are updating"
}
```

### Delete Field (Soft Delete)
```http
DELETE /api/custom-fields/field123
```

**Success (200):**
```json
{
  "success": true,
  "message": "Custom field deleted successfully",
  "deletedAt": "2025-10-08T15:30:00.000Z",
  "note": "Field has been soft-deleted. Existing values in attendee records are preserved but will not be displayed."
}
```

**Already Deleted (410):**
```json
{
  "error": "Custom field already deleted",
  "deletedAt": "2025-10-08T15:30:00.000Z"
}
```

## Optimistic Locking

### How It Works
1. Fetch field (includes current version)
2. Modify field data
3. Send update with version from step 1
4. Server compares versions
5. Update succeeds if versions match, fails with 409 if mismatch

### Example: Update with Retry
```typescript
async function updateCustomField(fieldId: string, updates: any) {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch latest version
    const response = await fetch(`/api/custom-fields/${fieldId}`);
    
    if (response.status === 410) {
      throw new Error('Field has been deleted');
    }
    
    const currentField = await response.json();
    
    // Attempt update with current version
    const updateResponse = await fetch(`/api/custom-fields/${fieldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        version: currentField.version
      })
    });
    
    if (updateResponse.status === 409) {
      // Version conflict - retry
      console.log(`Conflict on attempt ${attempt + 1}, retrying...`);
      continue;
    }
    
    if (updateResponse.ok) {
      return await updateResponse.json();
    }
    
    throw new Error(`Update failed: ${updateResponse.status}`);
  }
  
  throw new Error('Max retries exceeded - field is being modified frequently');
}
```

### Example: Update with User Notification
```typescript
async function updateWithUserFeedback(fieldId: string, updates: any) {
  // Fetch current field
  const current = await fetch(`/api/custom-fields/${fieldId}`).then(r => r.json());
  
  // Attempt update
  const response = await fetch(`/api/custom-fields/${fieldId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, version: current.version })
  });
  
  if (response.status === 409) {
    // Show user-friendly message
    const conflict = await response.json();
    alert(
      'This field was modified by another user. ' +
      'Your changes cannot be saved. Please refresh and try again.'
    );
    return null;
  }
  
  if (response.status === 410) {
    alert('This field has been deleted and can no longer be modified.');
    return null;
  }
  
  return await response.json();
}
```

## Soft Delete

### How It Works
1. DELETE request sets `deletedAt` timestamp
2. Field remains in database but marked as deleted
3. All queries automatically filter out deleted fields
4. Orphaned values remain in attendee documents
5. Optional cleanup job can permanently delete old fields

### Example: Delete Field
```typescript
async function deleteCustomField(fieldId: string) {
  const response = await fetch(`/api/custom-fields/${fieldId}`, {
    method: 'DELETE'
  });
  
  if (response.status === 410) {
    const error = await response.json();
    console.log(`Already deleted at: ${error.deletedAt}`);
    return;
  }
  
  if (response.ok) {
    const result = await response.json();
    console.log(result.message);
    console.log(`Deleted at: ${result.deletedAt}`);
    // Refresh field list
  }
}
```

### Example: Handle Deleted Field
```typescript
async function getCustomField(fieldId: string) {
  const response = await fetch(`/api/custom-fields/${fieldId}`);
  
  if (response.status === 410) {
    // Field was deleted
    return null;
  }
  
  if (response.status === 404) {
    // Field never existed
    throw new Error('Field not found');
  }
  
  return await response.json();
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Field created successfully |
| 400 | Bad Request | Check request parameters (e.g., missing version) |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Field doesn't exist |
| 409 | Conflict | Version mismatch - refetch and retry |
| 410 | Gone | Field was deleted - stop trying to access it |
| 500 | Server Error | Retry or contact support |

### Example: Comprehensive Error Handler
```typescript
async function handleCustomFieldRequest(
  url: string, 
  options?: RequestInit
): Promise<any> {
  try {
    const response = await fetch(url, options);
    
    switch (response.status) {
      case 200:
      case 201:
        return await response.json();
        
      case 400:
        const badRequest = await response.json();
        throw new Error(`Invalid request: ${badRequest.error}`);
        
      case 403:
        throw new Error('You do not have permission to perform this action');
        
      case 404:
        throw new Error('Custom field not found');
        
      case 409:
        const conflict = await response.json();
        throw new ConflictError(
          'Field was modified by another user',
          conflict.details.currentVersion
        );
        
      case 410:
        const deleted = await response.json();
        throw new DeletedError(
          'Field has been deleted',
          deleted.deletedAt
        );
        
      case 500:
        throw new Error('Server error - please try again later');
        
      default:
        throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      // Handle version conflict
      console.log('Conflict detected, refetching...');
      throw error;
    } else if (error instanceof DeletedError) {
      // Handle deleted field
      console.log('Field was deleted');
      return null;
    } else {
      // Other errors
      console.error('Request failed:', error);
      throw error;
    }
  }
}

class ConflictError extends Error {
  constructor(message: string, public currentVersion: number) {
    super(message);
    this.name = 'ConflictError';
  }
}

class DeletedError extends Error {
  constructor(message: string, public deletedAt: string) {
    super(message);
    this.name = 'DeletedError';
  }
}
```

## Best Practices

### 1. Always Include Version in Updates
```typescript
// ❌ Bad - missing version
await fetch(`/api/custom-fields/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ fieldName: 'New Name' })
});

// ✅ Good - includes version
const field = await fetch(`/api/custom-fields/${id}`).then(r => r.json());
await fetch(`/api/custom-fields/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ 
    fieldName: 'New Name',
    version: field.version 
  })
});
```

### 2. Handle Conflicts Gracefully
```typescript
// ✅ Good - retry on conflict
async function updateWithRetry(id: string, updates: any) {
  for (let i = 0; i < 3; i++) {
    try {
      const field = await getField(id);
      return await updateField(id, { ...updates, version: field.version });
    } catch (error) {
      if (error instanceof ConflictError && i < 2) {
        await sleep(100 * Math.pow(2, i)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Check for Deleted Fields
```typescript
// ✅ Good - handle deleted fields
async function loadField(id: string) {
  try {
    return await getField(id);
  } catch (error) {
    if (error instanceof DeletedError) {
      // Show user-friendly message
      showNotification('This field is no longer available');
      return null;
    }
    throw error;
  }
}
```

### 4. Refresh After Conflicts
```typescript
// ✅ Good - refresh UI after conflict
async function handleUpdate(id: string, updates: any) {
  try {
    await updateField(id, updates);
    showSuccess('Field updated successfully');
  } catch (error) {
    if (error instanceof ConflictError) {
      showWarning('Field was modified by another user. Refreshing...');
      await refreshFieldList();
    } else {
      showError('Update failed');
    }
  }
}
```

### 5. Use Structured Logging
```typescript
// ✅ Good - log important operations
console.log('[CUSTOM_FIELDS] Updating field', {
  fieldId: id,
  version: currentVersion,
  timestamp: new Date().toISOString()
});
```

## React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface CustomField {
  $id: string;
  fieldName: string;
  fieldType: string;
  version: number;
  // ... other fields
}

export function useCustomField(fieldId: string) {
  const [field, setField] = useState<CustomField | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchField = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/custom-fields/${fieldId}`);
      
      if (response.status === 410) {
        setError('Field has been deleted');
        setField(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch field: ${response.status}`);
      }
      
      const data = await response.json();
      setField(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  const updateField = useCallback(async (updates: Partial<CustomField>) => {
    if (!field) {
      throw new Error('No field loaded');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          version: field.version
        })
      });
      
      if (response.status === 409) {
        // Conflict - refetch and notify user
        await fetchField();
        throw new Error('Field was modified by another user. Please try again.');
      }
      
      if (response.status === 410) {
        setError('Field has been deleted');
        setField(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      
      const updated = await response.json();
      setField(updated);
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [field, fieldId, fetchField]);

  const deleteField = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: 'DELETE'
      });
      
      if (response.status === 410) {
        // Already deleted
        setField(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      
      setField(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  return {
    field,
    loading,
    error,
    fetchField,
    updateField,
    deleteField
  };
}
```

## Related Documentation
- [Custom Fields Optimistic Locking](../fixes/CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md)
- [Custom Fields Soft Delete](../fixes/CUSTOM_FIELDS_SOFT_DELETE.md)
- [Custom Fields Enhancements Summary](../fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md)
