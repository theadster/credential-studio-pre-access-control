# Multi-Session Authentication - Developer Quick Reference

## Quick Start

### Protecting an API Route

```typescript
import { withAuth } from '@/lib/apiMiddleware';
import type { AuthenticatedRequest } from '@/lib/apiMiddleware';
import type { NextApiResponse } from 'next';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Access user info
  const { user, userProfile } = req;
  
  // Your logic here
  return res.status(200).json({ success: true });
}

export default withAuth(handler);
```

### Checking Permissions

```typescript
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!req.userProfile.role?.permissions.manageAttendees) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Proceed with logic
}
```

### Handling Errors

```typescript
import { handleApiError } from '@/lib/apiErrorHandler';

try {
  // Your logic
} catch (error) {
  return handleApiError(error, res);
}
```

## Common Patterns

### Method-Based Permission Check

```typescript
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method, userProfile } = req;
  
  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      if (!userProfile.role?.permissions.create) {
        return res.status(403).json({ error: 'Cannot create' });
      }
      return handlePost(req, res);
    case 'DELETE':
      if (!userProfile.role?.permissions.delete) {
        return res.status(403).json({ error: 'Cannot delete' });
      }
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### Client-Side API Call

```typescript
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.tokenExpired) {
      // AuthContext handles logout automatically
      throw new Error('Session expired');
    }
    throw new Error(error.message);
  }
  
  return await response.json();
} catch (error) {
  console.error('API call failed:', error);
  toast({ variant: "destructive", title: "Error", description: error.message });
}
```

## Configuration

### Token Refresh Timing

```typescript
// Default: Refresh 5 minutes before expiration
const config = {
  refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000
};
```

### Custom Configuration

```typescript
// In AuthContext.tsx
const [tokenRefreshManager] = useState(() => 
  new TokenRefreshManagerImpl({
    refreshBeforeExpiry: 3 * 60 * 1000, // 3 minutes
    retryAttempts: 5,
    retryDelay: 2000
  })
);
```

## Error Response Format

```typescript
{
  error: string;           // Human-readable message
  code: number;            // HTTP status code
  type: string;            // Error type
  tokenExpired?: boolean;  // Token expiration flag
}
```

## Common Error Types

| Type | Code | Description |
|------|------|-------------|
| `token_expired` | 401 | JWT token has expired |
| `user_jwt_invalid` | 401 | Invalid JWT token |
| `unauthorized` | 401 | Not authenticated |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `validation_error` | 400 | Invalid input |

## Debugging

### Enable Debug Logging

```bash
# .env.local
NEXT_PUBLIC_DEBUG_AUTH=true
```

### Check Token Status

```javascript
// Browser console
document.cookie.split(';').find(c => c.includes('appwrite-session'))
```

### Monitor Token Refresh

```javascript
// Look for these console messages
[TokenRefresh] Starting token refresh
[TokenRefresh] Token refreshed successfully
[TokenRefresh] Token refresh failed
```

### Test Manual Refresh

```javascript
// Browser console
const { refreshToken } = useAuth();
refreshToken().then(success => console.log('Refresh:', success));
```

## Troubleshooting Checklist

- [ ] Is `withAuth` middleware applied to the route?
- [ ] Are environment variables set correctly?
- [ ] Is the JWT token present in cookies?
- [ ] Are there any console errors?
- [ ] Is the Appwrite service accessible?
- [ ] Are permissions configured correctly?
- [ ] Is the user's role properly assigned?

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/tokenRefresh.ts` | Token refresh manager |
| `src/lib/tabCoordinator.ts` | Multi-tab coordination |
| `src/lib/apiMiddleware.ts` | API authentication middleware |
| `src/lib/apiErrorHandler.ts` | Error handling utilities |
| `src/contexts/AuthContext.tsx` | Authentication context |

## Best Practices

1. ✅ Always use `withAuth` for protected routes
2. ✅ Check permissions before sensitive operations
3. ✅ Use `handleApiError` for consistent error responses
4. ✅ Log authentication events for monitoring
5. ✅ Handle token expiration gracefully on client
6. ❌ Don't expose sensitive info in error messages
7. ❌ Don't bypass authentication checks
8. ❌ Don't store tokens in localStorage

## Quick Links

- [Full Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Requirements Document](./requirements.md)
- [Design Document](./design.md)
- [Implementation Tasks](./tasks.md)
