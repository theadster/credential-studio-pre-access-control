# API Middleware Usage Guide

This document explains how to use the `withAuth` and `withPermission` middleware for API routes.

## Overview

The API middleware provides:
- Automatic JWT token validation
- User authentication verification
- User profile and role fetching
- Consistent error handling
- TypeScript type safety for authenticated requests

## Basic Usage with `withAuth`

### Before (Manual Authentication)

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { Query } from 'appwrite';
import { createSessionClient } from '@/lib/appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { account, databases } = createSessionClient(req);
    
    // Manual authentication
    let user;
    try {
      user = await account.get();
    } catch (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Manual profile fetching
    const userDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.documents.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.documents[0];

    // Manual role fetching
    let role = null;
    if (userProfile.roleId) {
      try {
        const roleDoc = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          userProfile.roleId
        );
        
        const permissions = typeof roleDoc.permissions === 'string' 
          ? JSON.parse(roleDoc.permissions) 
          : roleDoc.permissions;
        
        role = {
          id: roleDoc.$id,
          name: roleDoc.name,
          description: roleDoc.description,
          permissions: permissions
        };
      } catch (error) {
        console.warn('Failed to fetch role:', error);
      }
    }

    // Your actual logic here
    return res.status(200).json({ user, userProfile, role });
    
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
```

### After (With Middleware)

```typescript
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and profile are already authenticated and attached to req
  const { user, userProfile } = req;
  
  // Your actual logic here
  return res.status(200).json({ 
    user, 
    userProfile 
  });
});
```

## Permission-Based Access Control

Use `withPermission` to require specific permissions:

```typescript
import { NextApiResponse } from 'next';
import { withPermission, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withPermission('canManageUsers', async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User is guaranteed to have 'canManageUsers' permission
  const { user, userProfile } = req;
  
  // Perform admin operations
  return res.status(200).json({ success: true });
});
```

## Checking Permissions Manually

If you need more complex permission logic, use `hasPermission`:

```typescript
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, hasPermission } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { userProfile } = req;
  
  // Check multiple permissions
  const canView = hasPermission(userProfile, 'canViewUsers');
  const canEdit = hasPermission(userProfile, 'canEditUsers');
  
  if (!canView) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Return different data based on permissions
  return res.status(200).json({ 
    canEdit,
    data: canEdit ? fullData : limitedData 
  });
});
```

## Available Request Properties

When using `withAuth` or `withPermission`, the request object has these additional properties:

```typescript
interface AuthenticatedRequest extends NextApiRequest {
  user: Models.User<Models.Preferences>;  // Appwrite user object
  userProfile: UserProfile;                // User profile with role
}

interface UserProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleId: string | null;
  isInvited: boolean;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description: string;
    permissions: Record<string, any>;
  } | null;
}
```

## Error Handling

The middleware automatically handles:
- **401 Unauthorized**: Invalid or expired JWT tokens
- **404 Not Found**: User profile doesn't exist
- **403 Forbidden**: Insufficient permissions (when using `withPermission`)
- **500 Internal Server Error**: Unexpected errors

All errors use the standardized error format from `apiErrorHandler`:

```typescript
{
  error: string;
  code: number;
  type: string;
  message: string;
  tokenExpired?: boolean;
}
```

## Migration Guide

To migrate existing API routes:

1. Import the middleware:
   ```typescript
   import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
   ```

2. Wrap your handler with `withAuth`:
   ```typescript
   export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
     // Your code here
   });
   ```

3. Remove manual authentication code:
   - Remove `createSessionClient` calls
   - Remove `account.get()` calls
   - Remove manual profile fetching
   - Remove manual role fetching

4. Access user data from request:
   ```typescript
   const { user, userProfile } = req;
   ```

5. Remove manual error handling (middleware handles it automatically)

## Benefits

- **Less Boilerplate**: Reduces ~50 lines of code per route
- **Consistency**: All routes handle authentication the same way
- **Type Safety**: TypeScript knows about `user` and `userProfile` properties
- **Error Handling**: Consistent error responses across all routes
- **Maintainability**: Changes to auth logic only need to be made in one place
- **Testing**: Easier to test routes when auth is handled separately
