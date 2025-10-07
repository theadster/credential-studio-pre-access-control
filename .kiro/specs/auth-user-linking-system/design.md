# Design Document

## Overview

This design transforms the user management system from creating new Appwrite auth users to linking existing auth users to the application. The system will search for existing Appwrite auth users, allow administrators to select them, assign roles, and optionally manage team memberships.

### Key Design Principles

1. **Separation of Concerns**: Authentication (Appwrite Auth) is separate from authorization (application roles)
2. **Backward Compatibility**: Existing user profiles continue to work without modification
3. **Progressive Enhancement**: Team membership is optional and can be enabled/disabled
4. **Error Resilience**: Failures in team membership don't block user linking
5. **Security First**: All operations require proper permissions and validation

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  Administrator  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   User Management UI (Dashboard)    │
│  - Search existing auth users       │
│  - Select user to link              │
│  - Assign role                      │
│  - Optional: Add to team            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   API: POST /api/users              │
│  - Validate authUserId              │
│  - Check for existing link          │
│  - Create user profile              │
│  - Optional: Create team membership │
│  - Log action                       │
└────────┬────────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Appwrite   │   │   Appwrite   │   │   Appwrite   │
│    Users     │   │   Database   │   │    Teams     │
│     API      │   │  (Profiles)  │   │     API      │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Component Architecture

```
Frontend (React)
├── UserForm.tsx (Modified)
│   ├── AuthUserSearch component (New)
│   ├── AuthUserList component (New)
│   └── RoleSelector component (Existing)
│
Backend (Next.js API)
├── /api/users/index.ts (Modified)
│   ├── GET: List linked users (Existing)
│   ├── POST: Link auth user (Modified)
│   ├── PUT: Update user role (Existing)
│   └── DELETE: Unlink user (Modified)
│
├── /api/users/search.ts (New)
│   └── GET: Search Appwrite auth users
│
└── /api/users/teams.ts (New - Optional)
    ├── POST: Add user to team
    └── DELETE: Remove user from team
```

## Components and Interfaces

### Frontend Components

#### 1. AuthUserSearch Component (New)

**Purpose**: Search and filter Appwrite auth users

**Props**:
```typescript
interface AuthUserSearchProps {
  onSelect: (authUser: AppwriteAuthUser) => void;
  selectedUserId?: string;
  linkedUserIds: string[]; // Users already linked to app
}
```

**State**:
```typescript
{
  searchTerm: string;
  authUsers: AppwriteAuthUser[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
}
```

**Key Features**:
- Real-time search with debouncing (300ms)
- Pagination (25 users per page)
- Visual indication of already-linked users
- Loading states and error handling

#### 2. AuthUserList Component (New)

**Purpose**: Display list of auth users with selection

**Props**:
```typescript
interface AuthUserListProps {
  users: AppwriteAuthUser[];
  selectedUserId?: string;
  linkedUserIds: string[];
  onSelect: (user: AppwriteAuthUser) => void;
  loading: boolean;
}
```

**Features**:
- Displays user email, name, and creation date
- Shows email verification status badge (Verified/Unverified)
- Shows "Already Linked" badge for linked users
- Provides "Send Verification Email" button for unverified users
- Disables selection for linked users
- Highlights selected user

#### 3. UserForm Component (Modified)

**Current State**: Creates new auth users with email/password
**New State**: Links existing auth users with role assignment

**Modified Props**:
```typescript
interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: LinkUserData) => Promise<void>;
  user?: User | null; // For editing existing links
  roles: Role[];
  mode: 'link' | 'edit'; // New prop to distinguish modes
}
```

**New Data Structure**:
```typescript
interface LinkUserData {
  authUserId: string;      // Replaces email/password
  roleId: string;
  addToTeam?: boolean;     // Optional team membership
  teamRole?: string;       // Optional team role
}
```

**UI Changes**:
- Remove: Email input, Password input, Name input
- Add: Auth user search component
- Add: Selected user display card
- Add: Optional team membership checkbox
- Keep: Role selector, Submit/Cancel buttons

### Backend API Endpoints

#### 1. GET /api/users/search (New)

**Purpose**: Search Appwrite auth users

**Query Parameters**:
```typescript
{
  q?: string;          // Search term (email or name)
  page?: number;       // Page number (default: 1)
  limit?: number;      // Results per page (default: 25)
}
```

**Response**:
```typescript
{
  users: Array<{
    $id: string;
    email: string;
    name: string;
    $createdAt: string;
    emailVerification: boolean;  // Verification status
    phoneVerification: boolean;
    isLinked: boolean;           // Computed field
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Implementation**:
```typescript
// Use Appwrite Admin Client to list users
const { users } = createAdminClient();
const authUsers = await users.list([
  Query.search('email', searchTerm),
  Query.limit(limit),
  Query.offset((page - 1) * limit)
]);

// Check which users are already linked
const linkedUserIds = await databases.listDocuments(
  DATABASE_ID,
  USERS_COLLECTION_ID,
  [Query.select(['userId'])]
);

// Mark linked users
const usersWithLinkStatus = authUsers.users.map(user => ({
  ...user,
  isLinked: linkedUserIds.some(u => u.userId === user.$id)
}));
```

#### 2. POST /api/users (Modified)

**Current Behavior**: Creates new auth user + profile
**New Behavior**: Links existing auth user + creates profile

**Request Body**:
```typescript
{
  authUserId: string;      // Required: Appwrite auth user ID
  roleId: string;          // Required: Application role ID
  addToTeam?: boolean;     // Optional: Add to team
  teamId?: string;         // Optional: Team ID (default: project team)
  teamRole?: string;       // Optional: Team role (default: 'member')
}
```

**Response**:
```typescript
{
  id: string;              // User profile ID
  userId: string;          // Auth user ID
  email: string;
  name: string;
  roleId: string;
  role: Role;
  createdAt: string;
  teamMembership?: {       // Optional
    teamId: string;
    role: string;
    status: 'success' | 'failed';
    error?: string;
  };
}
```

**Implementation Flow**:
```typescript
1. Validate permissions (users.create)
2. Validate authUserId exists in Appwrite Auth
3. Check if user is already linked
4. Validate roleId exists
5. Create user profile in database
6. If addToTeam: Create team membership (non-blocking)
7. Log the action
8. Return user profile with team status
```

**Error Handling**:
- 400: Invalid authUserId or roleId
- 403: Insufficient permissions
- 409: User already linked
- 500: Database or API errors

#### 3. POST /api/users/verify-email (New)

**Purpose**: Send email verification to an unverified auth user

**Request Body**:
```typescript
{
  authUserId: string;      // Appwrite auth user ID
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  userId: string;
}
```

**Implementation**:
```typescript
// Use Appwrite Admin Client to create email verification
const { users } = createAdminClient();
await users.createVerification(authUserId);
```

**Error Handling**:
- 400: Invalid authUserId
- 403: Insufficient permissions
- 409: Email already verified
- 429: Rate limit exceeded (max 3 per user per hour)
- 500: API errors

**Rate Limiting**:
- Maximum 3 verification emails per user per hour
- Maximum 20 verification emails per admin per hour
- Store rate limit data in cache or database

#### 4. POST /api/users/teams (New - Optional)

**Purpose**: Manage team memberships separately

**Request Body**:
```typescript
{
  userId: string;          // User profile ID
  teamId: string;          // Team ID
  role: string;            // Team role (owner, admin, member)
}
```

**Implementation**:
```typescript
// Use Appwrite Teams API
const { teams } = createAdminClient();
await teams.createMembership(
  teamId,
  ['member'],              // Roles
  authUser.email,          // Email
  authUserId,              // User ID
  undefined,               // Phone (optional)
  `${SITE_URL}/accept-invite` // Redirect URL
);
```

**Note**: Team membership may require investigation of Appwrite SDK capabilities

## Data Models

### Existing User Profile (No Changes)

```typescript
// Appwrite Database Collection: users
{
  $id: string;             // Profile ID
  userId: string;          // Appwrite auth user ID
  email: string;
  name: string | null;
  roleId: string | null;   // Application role
  isInvited: boolean;      // Legacy field
  $createdAt: string;
  $updatedAt: string;
}
```

### Appwrite Auth User (Read-Only)

```typescript
// From Appwrite Users API
{
  $id: string;
  email: string;
  name: string;
  password?: string;       // Hashed, not accessible
  phone?: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  prefs: object;
  $createdAt: string;
  $updatedAt: string;
}
```

### Team Membership (Optional)

```typescript
// From Appwrite Teams API
{
  $id: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  roles: string[];
  invited: string;         // Invitation date
  joined: string;          // Join date
  confirm: boolean;
}
```

## Error Handling

### Frontend Error States

1. **Search Errors**:
   - Network failure: "Unable to connect to server"
   - API error: Display error message from API
   - No results: "No users found matching your search"

2. **Linking Errors**:
   - Already linked: "This user already has access to the application"
   - Invalid user: "Selected user not found"
   - Permission denied: "You don't have permission to link users"
   - Team membership failed: "User linked successfully, but team membership failed. You can add them to the team later."

3. **Validation Errors**:
   - No user selected: "Please select a user to link"
   - No role selected: "Please select a role for this user"

4. **Verification Email Errors**:
   - Already verified: "This user's email is already verified"
   - Rate limit exceeded: "Too many verification emails sent. Please try again later."
   - Send failed: "Failed to send verification email. Please try again."
   - Permission denied: "You don't have permission to send verification emails"

### Backend Error Handling

```typescript
// Standardized error response
{
  error: string;           // User-friendly message
  code: string;            // Error code for debugging
  details?: any;           // Additional error details
}
```

**Error Codes**:
- `USER_ALREADY_LINKED`: User is already linked to application
- `INVALID_AUTH_USER`: Auth user ID not found
- `INVALID_ROLE`: Role ID not found
- `PERMISSION_DENIED`: Insufficient permissions
- `TEAM_MEMBERSHIP_FAILED`: Team membership creation failed
- `DATABASE_ERROR`: Database operation failed
- `EMAIL_ALREADY_VERIFIED`: Email is already verified
- `VERIFICATION_RATE_LIMIT`: Too many verification emails sent
- `VERIFICATION_SEND_FAILED`: Failed to send verification email

## Testing Strategy

### Unit Tests

1. **API Endpoints**:
   - Test user search with various queries
   - Test linking with valid/invalid data
   - Test permission checks
   - Test error handling

2. **Components**:
   - Test AuthUserSearch rendering and search
   - Test AuthUserList selection logic
   - Test UserForm submission with new data structure

### Integration Tests

1. **User Linking Flow**:
   - Search for auth user
   - Select user
   - Assign role
   - Verify profile creation
   - Verify logging

2. **Team Membership Flow** (if implemented):
   - Link user with team membership
   - Verify team membership created
   - Handle team membership failures gracefully

3. **Backward Compatibility**:
   - Verify existing user profiles load correctly
   - Verify existing users can log in
   - Verify editing existing profiles works

### Manual Testing Scenarios

1. **Happy Path**:
   - Admin searches for user
   - Selects user
   - Assigns role
   - User is linked successfully

2. **Error Scenarios**:
   - Try to link already-linked user
   - Try to link with invalid auth user ID
   - Try to link without permissions
   - Handle network failures

3. **Edge Cases**:
   - Search with no results
   - Search with special characters
   - Link user with no name
   - Link user with unverified email
   - Send verification email to already verified user
   - Send multiple verification emails rapidly (rate limiting)

## Security Considerations

### Authentication & Authorization

1. **Permission Checks**:
   - All user management operations require `users.create`, `users.read`, `users.update`, or `users.delete` permissions
   - Permission checks happen on both frontend (UI) and backend (API)

2. **Input Validation**:
   - Validate authUserId format and existence
   - Validate roleId exists in database
   - Sanitize search queries to prevent injection

3. **Rate Limiting**:
   - Implement rate limiting on search endpoint (100 requests/minute)
   - Implement rate limiting on link endpoint (20 requests/minute)

### Data Privacy

1. **Sensitive Data**:
   - Never expose password hashes
   - Never expose JWT tokens in responses
   - Log only necessary user information

2. **Audit Trail**:
   - Log all user linking/unlinking actions
   - Include administrator ID, timestamp, and affected user
   - Store logs in secure, append-only collection

## Performance Considerations

### Frontend Optimization

1. **Search Debouncing**:
   - Debounce search input by 300ms to reduce API calls
   - Show loading indicator during search

2. **Pagination**:
   - Load 25 users per page
   - Implement virtual scrolling for large lists

3. **Caching**:
   - Cache search results for 30 seconds
   - Invalidate cache on user linking/unlinking

### Backend Optimization

1. **Database Queries**:
   - Index userId field for fast lookups
   - Use Query.select() to fetch only needed fields
   - Batch check for linked users

2. **API Calls**:
   - Use Appwrite Admin Client connection pooling
   - Implement retry logic for transient failures
   - Set reasonable timeouts (5 seconds)

## Migration Strategy

### Phase 1: Preparation

1. **Code Changes**:
   - Implement new API endpoints
   - Create new UI components
   - Add feature flag for gradual rollout

2. **Testing**:
   - Test in development environment
   - Test with existing user profiles
   - Verify backward compatibility

### Phase 2: Deployment

1. **Deploy Backend**:
   - Deploy new API endpoints
   - Keep old endpoints functional
   - Monitor error rates

2. **Deploy Frontend**:
   - Deploy new UI components
   - Use feature flag to enable for admins only
   - Gather feedback

### Phase 3: Cleanup

1. **Remove Old Code**:
   - Remove auth user creation code
   - Remove password/email fields from form
   - Update documentation

2. **Monitor**:
   - Monitor user linking success rates
   - Monitor error logs
   - Collect user feedback

## Team Membership Investigation

### Appwrite Teams API Capabilities

**Available Methods** (from node-appwrite SDK):
```typescript
teams.create(teamId, name, roles?)
teams.list(queries?, search?)
teams.get(teamId)
teams.update(teamId, name)
teams.delete(teamId)
teams.listMemberships(teamId, queries?, search?)
teams.createMembership(teamId, roles, email?, userId?, phone?, url?)
teams.getMembership(teamId, membershipId)
teams.updateMembership(teamId, membershipId, roles)
teams.deleteMembership(teamId, membershipId)
```

### Implementation Approach

**Option 1: Project-Level Team** (Recommended)
- Create a single team for the entire project
- All linked users are added to this team
- Team roles map to application roles:
  - Super Administrator → owner
  - Event Manager → admin
  - Registration Staff → member
  - Viewer → member (read-only)

**Option 2: Role-Based Teams**
- Create separate teams for each role
- Users are added to team matching their role
- More granular control but more complex

**Option 3: No Team Management**
- Skip team membership entirely
- Rely on application-level permissions only
- Simpler but less integrated with Appwrite

### Recommended Configuration

```typescript
// Environment variables
NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID=<team-id>
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true

// Team role mapping
const TEAM_ROLE_MAP = {
  'Super Administrator': ['owner'],
  'Event Manager': ['admin'],
  'Registration Staff': ['member'],
  'Viewer': ['member']
};
```

### Error Handling for Team Membership

```typescript
try {
  // Create team membership
  await teams.createMembership(
    teamId,
    roles,
    authUser.email,
    authUserId
  );
  teamMembershipStatus = 'success';
} catch (error) {
  // Log error but don't fail user linking
  console.error('Team membership failed:', error);
  teamMembershipStatus = 'failed';
  teamMembershipError = error.message;
}

// Return success even if team membership failed
return {
  ...userProfile,
  teamMembership: {
    status: teamMembershipStatus,
    error: teamMembershipError
  }
};
```

## Open Questions

1. **Team Membership**:
   - Should team membership be required or optional?
   - What team roles should map to application roles?
   - How to handle team membership failures?

2. **User Discovery**:
   - Should we support inviting users who don't have Appwrite accounts yet?
   - ~~Should we show email verification status in search results?~~ **RESOLVED: Yes, with ability to send verification emails**

3. **Backward Compatibility**:
   - Should we migrate existing "invited" users to the new system?
   - Should we keep the `isInvited` field or deprecate it?

4. **UI/UX**:
   - Should we show a preview of the user's details before linking?
   - Should we allow bulk user linking?

## Success Criteria

1. **Functional**:
   - Administrators can search and link existing auth users
   - User profiles are created correctly
   - Permissions are enforced properly
   - Existing user profiles continue to work

2. **Performance**:
   - Search results return in < 1 second
   - User linking completes in < 3 seconds
   - No performance degradation for existing features

3. **User Experience**:
   - Clear error messages for all failure scenarios
   - Intuitive search and selection interface
   - Smooth transition from old to new system

4. **Security**:
   - All operations require proper permissions
   - No sensitive data exposed in responses
   - All actions are logged for audit trail
