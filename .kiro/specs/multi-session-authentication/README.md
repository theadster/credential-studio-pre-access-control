# Multi-Session Authentication System

## Overview

This specification documents the implementation of a robust multi-session authentication system for CredentialStudio. The system automatically manages JWT token refresh, maintains sessions across page refreshes and browser tabs, and provides graceful handling of session expiration.

## Key Features

✅ **Automatic Token Refresh** - JWT tokens are automatically refreshed before expiration  
✅ **Session Persistence** - Sessions persist across page refreshes and navigation  
✅ **Multi-Session Support** - Users can be logged in from multiple devices simultaneously  
✅ **Multi-Tab Coordination** - Browser tabs coordinate to prevent redundant refresh requests  
✅ **Graceful Error Handling** - Clear feedback and recovery from session expiration  
✅ **Consistent API Authentication** - Unified middleware for all protected API routes  
✅ **Comprehensive Logging** - Full audit trail of authentication events  

## Documentation

### For Developers

- **[Developer Quick Reference](./DEVELOPER_QUICK_REFERENCE.md)** - Quick start guide and common patterns
- **[Authentication Guide](./AUTHENTICATION_GUIDE.md)** - Complete documentation covering:
  - Token refresh configuration
  - API middleware usage
  - Error handling patterns
  - Multi-session behavior
  - Troubleshooting guide

### Specification Documents

- **[Requirements](./requirements.md)** - Detailed requirements with acceptance criteria
- **[Design](./design.md)** - Architecture, components, and technical design
- **[Tasks](./tasks.md)** - Implementation plan and task checklist

## Quick Start

### Protecting an API Route

```typescript
import { withAuth } from '@/lib/apiMiddleware';
import type { AuthenticatedRequest } from '@/lib/apiMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { user, userProfile } = req;
  // Your logic here
}

export default withAuth(handler);
```

### Accessing User Information

```typescript
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user.$id;
  const userEmail = req.user.email;
  const userRole = req.userProfile.role?.name;
  const canManageUsers = req.userProfile.role?.permissions.manageUsers;
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

## Architecture

### Client-Side Components

```
AuthContext
    ├── TokenRefreshManager (automatic token refresh)
    ├── TabCoordinator (multi-tab coordination)
    └── Session Restoration (page load handling)
```

### Server-Side Components

```
API Routes
    ├── withAuth Middleware (authentication)
    ├── Token Validation (JWT verification)
    └── Error Handler (consistent responses)
```

### Token Lifecycle

```
Login → JWT Created → Refresh Timer Started → Auto Refresh (every 10 min)
                                                      ↓
                                              New JWT Created
                                                      ↓
                                              Timer Restarted
```

## Implementation Status

All tasks have been completed:

- [x] Token refresh infrastructure
- [x] Cross-tab coordination system
- [x] API error handling utilities
- [x] API authentication middleware
- [x] AuthContext integration
- [x] Session restoration
- [x] Session expiration notifications
- [x] API route updates (all routes)
- [x] Token refresh monitoring and logging
- [x] OAuth callback integration
- [x] Magic link callback integration
- [x] Integration tests
- [x] Unit tests
- [x] Documentation

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/tokenRefresh.ts` | Manages automatic JWT token refresh |
| `src/lib/tabCoordinator.ts` | Coordinates refresh across browser tabs |
| `src/lib/apiMiddleware.ts` | Authentication middleware for API routes |
| `src/lib/apiErrorHandler.ts` | Centralized error handling utilities |
| `src/contexts/AuthContext.tsx` | Main authentication context provider |

## Configuration

### Default Settings

```typescript
{
  refreshBeforeExpiry: 5 * 60 * 1000,  // Refresh 5 min before expiry
  retryAttempts: 3,                     // Retry 3 times on failure
  retryDelay: 1000                      // 1 second base delay
}
```

### Token Timing

- **JWT Expiration**: 15 minutes
- **Refresh Trigger**: 10 minutes (5 minutes before expiration)
- **Retry Delays**: 1s, 2s, 4s (exponential backoff)

## Multi-Session Behavior

### Supported Scenarios

✅ Login from multiple devices  
✅ Multiple browser tabs  
✅ Independent session lifecycles  
✅ Per-session token refresh  
✅ Device-specific logout  

### Limitations

⚠️ No session management UI  
⚠️ No remote logout capability  
⚠️ No session limit enforcement  
⚠️ Password change doesn't invalidate sessions  

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable message",
  "code": 401,
  "type": "token_expired",
  "tokenExpired": true
}
```

### Common Error Types

- `token_expired` (401) - JWT token has expired
- `user_jwt_invalid` (401) - Invalid JWT token
- `unauthorized` (401) - Not authenticated
- `forbidden` (403) - Insufficient permissions
- `not_found` (404) - Resource not found

## Testing

### Test Coverage

- ✅ Unit tests for TokenRefreshManager
- ✅ Unit tests for TabCoordinator
- ✅ Unit tests for error handlers
- ✅ Integration tests for token refresh flow
- ✅ Integration tests for session lifecycle
- ✅ Integration tests for API middleware

### Running Tests

```bash
# Run all authentication tests
npx vitest --run src/lib/__tests__/tokenRefresh.test.ts
npx vitest --run src/lib/__tests__/tabCoordinator.test.ts
npx vitest --run src/__tests__/integration/session-lifecycle.test.ts

# Run all tests
npx vitest --run
```

## Troubleshooting

### Common Issues

1. **Session expires quickly** - Check token refresh is starting
2. **Multiple notifications** - Verify deduplication logic
3. **Session not restored** - Check cookie storage
4. **Network errors** - Verify Appwrite connectivity
5. **401 errors** - Check JWT token in requests

See [Authentication Guide](./AUTHENTICATION_GUIDE.md#troubleshooting-guide) for detailed solutions.

## Monitoring

### Key Metrics

- Token refresh success rate (target: >99%)
- Average refresh time (target: <500ms)
- Session restoration success rate (target: >95%)
- Authentication error frequency

### Logging

```javascript
// Client-side
[TokenRefresh] Token refreshed successfully
[Auth] Session restored successfully

// Server-side
[API] Authentication failed: token_expired
[Middleware] Token validation failed
```

## Security Considerations

✅ JWT tokens stored in HTTP cookies  
✅ SameSite=Lax cookie attribute  
✅ Secure flag in production (HTTPS)  
✅ Token expiration enforced  
✅ Server-side validation required  
✅ No sensitive data in error messages  

## Future Enhancements

Potential improvements for future iterations:

1. **Session Management UI** - View and manage active sessions
2. **Remote Logout** - Terminate sessions from other devices
3. **Refresh Token Pattern** - Longer-lived sessions with token rotation
4. **Device Fingerprinting** - Enhanced security tracking
5. **Suspicious Activity Detection** - Automatic threat detection
6. **Offline Support** - Handle offline scenarios gracefully

## Support

### Getting Help

1. Check the [Authentication Guide](./AUTHENTICATION_GUIDE.md)
2. Review the [Developer Quick Reference](./DEVELOPER_QUICK_REFERENCE.md)
3. Check console logs and network requests
4. Consult [Appwrite documentation](https://appwrite.io/docs)
5. Contact your development team

### Additional Resources

- [Appwrite Authentication](https://appwrite.io/docs/authentication)
- [Appwrite JWT](https://appwrite.io/docs/authentication-security#jwt)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-06 | Initial implementation complete |

## Contributors

This feature was implemented as part of the CredentialStudio authentication enhancement project.

---

**Last Updated**: October 6, 2025  
**Status**: ✅ Complete and Production Ready
