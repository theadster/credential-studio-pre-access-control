---
title: Appwrite TablesDB Test Migration
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code:
  - src/test/mocks/appwrite.ts
---

# Appwrite TablesDB Test Migration

## Issue

Session-level `mockTablesDB.getRow` is set to return `mockAdminRole`, which conflicts with admin-specific `mockAdminTablesDB.getRow`. Tests that rely on session-level `tablesDB.getRow` to return attendee or user profile rows will instead receive an admin role object, causing incorrect test behavior and false positives/negatives.

## Root Cause

Mock setup doesn't properly separate session-level and admin-level mocks:

```typescript
// ❌ WRONG - Session mock returns admin role
const mockTablesDB = {
  getRow: vi.fn().mockResolvedValue(mockAdminRole),
};

const mockAdminTablesDB = {
  getRow: vi.fn().mockResolvedValue(mockAdminRole),
};

// Both return the same thing - no separation!
```

## Solution

Create separate mock instances for different user contexts:

```typescript
// ✅ CORRECT - Separate mocks for different contexts
const mockSessionTablesDB = {
  getRow: vi.fn().mockImplementation(({ rowId }) => {
    // Return appropriate data based on rowId
    if (rowId === 'attendee-1') {
      return Promise.resolve(mockAttendee);
    }
    if (rowId === 'user-1') {
      return Promise.resolve(mockUserProfile);
    }
    return Promise.reject(new Error('Not found'));
  }),
};

const mockAdminTablesDB = {
  getRow: vi.fn().mockImplementation(({ rowId }) => {
    // Admin can access any row
    if (rowId === 'admin-role') {
      return Promise.resolve(mockAdminRole);
    }
    if (rowId === 'attendee-1') {
      return Promise.resolve(mockAttendee);
    }
    return Promise.reject(new Error('Not found'));
  }),
};
```

## Implementation

### Mock Setup

```typescript
// Mock data
const mockAttendee = {
  $id: 'attendee-1',
  firstName: 'John',
  lastName: 'Doe',
  barcodeNumber: '123456',
  customFieldValues: '{}',
};

const mockUserProfile = {
  $id: 'user-1',
  userId: 'auth-user-1',
  email: 'user@example.com',
  name: 'John User',
  roleId: 'role-1',
};

const mockAdminRole = {
  $id: 'admin-role',
  name: 'Administrator',
  permissions: {
    attendees: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
  },
};

// Session-level mock (regular user)
const mockSessionTablesDB = {
  getRow: vi.fn().mockImplementation(({ rowId }) => {
    switch (rowId) {
      case 'attendee-1':
        return Promise.resolve(mockAttendee);
      case 'user-1':
        return Promise.resolve(mockUserProfile);
      default:
        return Promise.reject(new Error(`Row ${rowId} not found`));
    }
  }),
  
  listRows: vi.fn().mockResolvedValue({
    rows: [mockAttendee],
    total: 1,
  }),
  
  createRow: vi.fn().mockResolvedValue(mockAttendee),
  updateRow: vi.fn().mockResolvedValue(mockAttendee),
  deleteRow: vi.fn().mockResolvedValue({}),
};

// Admin-level mock (admin user)
const mockAdminTablesDB = {
  getRow: vi.fn().mockImplementation(({ rowId }) => {
    switch (rowId) {
      case 'admin-role':
        return Promise.resolve(mockAdminRole);
      case 'attendee-1':
        return Promise.resolve(mockAttendee);
      case 'user-1':
        return Promise.resolve(mockUserProfile);
      default:
        return Promise.reject(new Error(`Row ${rowId} not found`));
    }
  }),
  
  listRows: vi.fn().mockResolvedValue({
    rows: [mockAttendee, mockUserProfile, mockAdminRole],
    total: 3,
  }),
  
  createRow: vi.fn().mockResolvedValue(mockAttendee),
  updateRow: vi.fn().mockResolvedValue(mockAttendee),
  deleteRow: vi.fn().mockResolvedValue({}),
};
```

### Usage in Tests

```typescript
describe('Attendee API', () => {
  it('should fetch attendee as regular user', async () => {
    // Use session mock
    const tablesDB = mockSessionTablesDB;
    
    const result = await tablesDB.getRow({
      databaseId: 'db',
      tableId: 'attendees',
      rowId: 'attendee-1',
    });
    
    expect(result).toEqual(mockAttendee);
    expect(result.firstName).toBe('John');
  });

  it('should fetch admin role as admin', async () => {
    // Use admin mock
    const tablesDB = mockAdminTablesDB;
    
    const result = await tablesDB.getRow({
      databaseId: 'db',
      tableId: 'roles',
      rowId: 'admin-role',
    });
    
    expect(result).toEqual(mockAdminRole);
    expect(result.name).toBe('Administrator');
  });

  it('should not allow regular user to access admin role', async () => {
    // Use session mock
    const tablesDB = mockSessionTablesDB;
    
    await expect(
      tablesDB.getRow({
        databaseId: 'db',
        tableId: 'roles',
        rowId: 'admin-role',
      })
    ).rejects.toThrow('not found');
  });
});
```

### Context-Based Mock Selection

```typescript
// Helper to get appropriate mock based on user role
function getMockTablesDB(userRole: 'user' | 'admin'): any {
  return userRole === 'admin' ? mockAdminTablesDB : mockSessionTablesDB;
}

describe('Role-based access', () => {
  it('should return different data for different roles', async () => {
    // Regular user - should reject for unknown rowIds
    const userMock = getMockTablesDB('user');
    await expect(userMock.getRow({
      databaseId: 'db',
      tableId: 'roles',
      rowId: 'admin-role',
    })).rejects.toThrow();

    // Admin user
    const adminMock = getMockTablesDB('admin');
    const adminResult = await adminMock.getRow({
      databaseId: 'db',
      tableId: 'roles',
      rowId: 'admin-role',
    });
    expect(adminResult).toEqual(mockAdminRole);
  });
});
```

## Testing Patterns

### Pattern 1: Separate Mocks by User Type

```typescript
describe('User-specific operations', () => {
  it('should work for regular users', async () => {
    const tablesDB = mockSessionTablesDB;
    // Test regular user operations
  });

  it('should work for admins', async () => {
    const tablesDB = mockAdminTablesDB;
    // Test admin operations
  });
});
```

### Pattern 2: Mock Implementation Based on Context

```typescript
const createContextualMock = (context: 'session' | 'admin') => {
  return {
    getRow: vi.fn().mockImplementation(({ rowId }) => {
      if (context === 'admin') {
        return Promise.resolve(mockAdminRole);
      }
      if (rowId === 'attendee-1') {
        return Promise.resolve(mockAttendee);
      }
      return Promise.reject(new Error('Unauthorized'));
    }),
  };
};
```

## Files Modified

- `src/test/mocks/appwrite.ts` - Separate session and admin mocks

## Verification

✅ Session mock returns appropriate user/attendee data
✅ Admin mock returns admin role data
✅ No cross-contamination between mocks
✅ Tests verify correct data for each context
✅ False positives/negatives eliminated

