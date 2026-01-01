---
title: "Complete Backend Migration Guide: Supabase to Appwrite"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Complete Backend Migration Guide: Supabase to Appwrite

## Executive Summary

This comprehensive guide documents the complete process of migrating a production Next.js application from Supabase to Appwrite. This migration was complex, expensive, and time-consuming, involving authentication, database, real-time subscriptions, and API route transformations.

**Migration Scope:**
- **Authentication System**: Complete OAuth and email/password migration
- **Database**: 8 collections with 100+ attributes
- **Real-time Subscriptions**: Live data updates
- **API Routes**: 50+ endpoints
- **File Storage**: Photo uploads and credential generation
- **Integration Services**: Cloudinary, Switchboard, OneSimpleAPI

**Timeline:** 4-6 weeks of full-time development
**Complexity:** High - requires deep understanding of both platforms
**Risk Level:** High - production data and user authentication at stake


---

## Table of Contents

1. [Pre-Migration Planning](#pre-migration-planning)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Authentication Migration](#authentication-migration)
4. [Database Schema Migration](#database-schema-migration)
5. [Data Migration](#data-migration)
6. [API Routes Migration](#api-routes-migration)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [File Storage Migration](#file-storage-migration)
9. [Testing Strategy](#testing-strategy)
10. [Deployment & Rollback](#deployment--rollback)
11. [Post-Migration Optimization](#post-migration-optimization)
12. [Lessons Learned](#lessons-learned)
13. [Cost Analysis](#cost-analysis)

---

## Pre-Migration Planning

### Phase 1: Assessment (Week 1)

#### 1.1 Inventory Your Current System

**Critical Questions:**
- How many database tables/collections do you have?
- What authentication methods are you using?
- Do you have real-time subscriptions?
- What file storage are you using?
- How many API routes need migration?
- What are your current query patterns?

**Create a Migration Inventory:**
```markdown
## Database
- [ ] Users table (X records)
- [ ] Roles table (X records)
- [ ] Attendees table (X records)
- [ ] Custom fields (X records)
- [ ] Event settings (X records)
- [ ] Logs (X records)
- [ ] Log settings (X records)

## Authentication
- [ ] Email/password users (X users)
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] Session management
- [ ] Password reset flows

## API Routes
- [ ] List all API endpoints
- [ ] Document dependencies
- [ ] Identify critical paths

## Real-time Features
- [ ] List all subscriptions
- [ ] Document event types
- [ ] Identify update patterns
```


#### 1.2 Understand Platform Differences

**Key Differences Between Supabase and Appwrite:**

| Feature | Supabase | Appwrite | Migration Impact |
|---------|----------|----------|------------------|
| **Database** | PostgreSQL (relational) | NoSQL (document-based) | HIGH - Schema redesign required |
| **Queries** | SQL, PostgREST | Query builder, no SQL | HIGH - All queries must be rewritten |
| **Relationships** | Foreign keys, joins | Manual references | HIGH - Relationship logic changes |
| **Attributes** | Unlimited columns | 27 attributes per collection | CRITICAL - May need collection splitting |
| **Auth** | Built on PostgreSQL | Separate auth service | MEDIUM - Different API patterns |
| **Real-time** | PostgreSQL LISTEN/NOTIFY | WebSocket subscriptions | MEDIUM - Different event structure |
| **Storage** | S3-compatible | Built-in storage | LOW - Similar API |
| **Permissions** | Row Level Security (RLS) | Document-level permissions | HIGH - Complete permission redesign |

**⚠️ CRITICAL LIMITATION: Appwrite's 27-Attribute Limit**

This is the most significant constraint you'll face. If you have tables with more than 27 columns, you MUST split them into multiple collections.

**Example from our migration:**
```
Original Supabase table: event_settings (38 columns)
↓
Appwrite collections:
- event_settings (14 attributes)
- cloudinary_integrations (10 attributes)
- switchboard_integrations (8 attributes)
- onesimpleapi_integrations (6 attributes)
```


#### 1.3 Create a Migration Timeline

**Realistic Timeline for Medium-Sized Application:**

```
Week 1: Planning & Assessment
- Inventory current system
- Study Appwrite documentation
- Design new schema
- Create migration plan

Week 2: Infrastructure Setup
- Create Appwrite project
- Set up development environment
- Create database collections
- Configure authentication

Week 3-4: Code Migration
- Migrate authentication system
- Migrate API routes (batch by feature)
- Update database queries
- Implement real-time subscriptions

Week 5: Data Migration
- Write migration scripts
- Test data migration in staging
- Validate data integrity
- Create rollback procedures

Week 6: Testing & Deployment
- Comprehensive testing
- Performance optimization
- Production deployment
- Monitor for issues
```

**⚠️ WARNING:** This timeline assumes:
- Full-time dedicated developer
- No major architectural changes
- Existing test coverage
- Staging environment available

**Reality Check:** Our migration took 6 weeks with unexpected challenges. Budget 50% more time than estimated.


#### 1.4 Risk Assessment & Mitigation

**High-Risk Areas:**

1. **Authentication Migration**
   - **Risk:** Users locked out of accounts
   - **Mitigation:** Maintain parallel auth systems during transition
   - **Rollback:** Keep Supabase auth active for 30 days

2. **Data Loss**
   - **Risk:** Data corruption or loss during migration
   - **Mitigation:** Multiple backups, validation scripts, dry runs
   - **Rollback:** Full database backup before migration

3. **Downtime**
   - **Risk:** Service interruption during deployment
   - **Mitigation:** Blue-green deployment, feature flags
   - **Rollback:** Instant DNS/routing switch back

4. **Permission Errors**
   - **Risk:** Users seeing/editing wrong data
   - **Mitigation:** Extensive permission testing
   - **Rollback:** Immediate rollback if permission issues detected

5. **Performance Degradation**
   - **Risk:** Slower queries, higher latency
   - **Mitigation:** Load testing, query optimization
   - **Rollback:** Performance monitoring with automatic rollback triggers

**Create a Risk Register:**
```markdown
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Data loss | Low | Critical | Backups + validation | DevOps |
| Auth failure | Medium | Critical | Parallel systems | Backend |
| Downtime | Medium | High | Blue-green deploy | DevOps |
| Permission bugs | High | High | Extensive testing | Backend |
| Performance | Medium | Medium | Load testing | Backend |
```


---

## Infrastructure Setup

### Phase 2: Appwrite Project Setup (Days 1-3)

#### 2.1 Create Appwrite Project

**Step-by-Step:**

1. **Sign up for Appwrite Cloud**
   - Go to https://cloud.appwrite.io
   - Create account (or use self-hosted)
   - Choose region closest to users (affects latency)

2. **Create Project**
   ```
   Project Name: CredentialStudio
   Region: [Choose based on user location]
   ```

3. **Get Credentials**
   - Project ID: Found in Settings
   - API Endpoint: `https://cloud.appwrite.io/v1`
   - Create API Key with ALL scopes (for server-side operations)

4. **Environment Variables**
   ```env
   # Appwrite Configuration
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key_with_all_scopes
   
   # Keep Supabase active during migration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

**⚠️ CRITICAL:** Keep both Supabase and Appwrite credentials active during migration for rollback capability.


#### 2.2 Design Database Schema

**Critical Considerations:**

1. **27-Attribute Limit Per Collection**
   - Count your current table columns
   - If > 27, plan to split into multiple collections
   - Consider normalization opportunities

2. **No SQL Joins**
   - Appwrite doesn't support joins
   - You must fetch related data separately
   - Consider denormalization for performance

3. **Document-Based Structure**
   - Each record is a JSON document
   - Nested objects are allowed (but count toward attribute limit)
   - Arrays are supported

**Schema Design Example:**

```typescript
// Original Supabase table (38 columns)
CREATE TABLE event_settings (
  id UUID PRIMARY KEY,
  event_name TEXT,
  event_date DATE,
  // ... 35 more columns including:
  // - Cloudinary settings (10 columns)
  // - Switchboard settings (8 columns)
  // - OneSimpleAPI settings (6 columns)
);

// New Appwrite schema (4 collections)
Collection: event_settings (14 attributes)
- id (string)
- eventName (string)
- eventDate (datetime)
- barcodeType (string)
- barcodeLength (integer)
- ... (9 more core attributes)

Collection: cloudinary_integrations (10 attributes)
- id (string)
- eventSettingsId (string) // Reference
- enabled (boolean)
- cloudName (string)
- apiKey (string)
- ... (5 more Cloudinary attributes)

Collection: switchboard_integrations (8 attributes)
- id (string)
- eventSettingsId (string) // Reference
- enabled (boolean)
- apiEndpoint (string)
- ... (4 more Switchboard attributes)

Collection: onesimpleapi_integrations (6 attributes)
- id (string)
- eventSettingsId (string) // Reference
- enabled (boolean)
- url (string)
- ... (2 more OneSimpleAPI attributes)
```


#### 2.3 Create Collections with Setup Script

**Create a setup script** (`scripts/setup-appwrite.ts`):

```typescript
import { Client, Databases, ID, Permission, Role, IndexType } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = 'credentialstudio';

async function createDatabase() {
  try {
    await databases.create(DATABASE_ID, 'CredentialStudio Database');
    console.log('✓ Database created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Database already exists');
    } else {
      throw error;
    }
  }
}

async function createUsersCollection() {
  try {
    await databases.createCollection(
      DATABASE_ID,
      'users',
      'Users',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(DATABASE_ID, 'users', 'userId', 255, true);
    await databases.createStringAttribute(DATABASE_ID, 'users', 'email', 255, true);
    await databases.createStringAttribute(DATABASE_ID, 'users', 'name', 255, false);
    await databases.createStringAttribute(DATABASE_ID, 'users', 'roleId', 255, false);
    
    // Create indexes for performance
    await databases.createIndex(DATABASE_ID, 'users', 'email_idx', IndexType.Unique, ['email']);
    await databases.createIndex(DATABASE_ID, 'users', 'userId_idx', IndexType.Key, ['userId']);
    
    console.log('✓ Users collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Users collection already exists');
    } else {
      throw error;
    }
  }
}

// Repeat for all collections...
```

**Run the setup:**
```bash
npx tsx scripts/setup-appwrite.ts
```


#### 2.4 Configure Permissions

**Appwrite Permission Model:**

Unlike Supabase's Row Level Security (RLS), Appwrite uses document-level permissions with roles.

**Permission Types:**
- `Permission.read(Role.any())` - Anyone can read
- `Permission.read(Role.users())` - Only authenticated users
- `Permission.read(Role.user(userId))` - Specific user only
- `Permission.create(Role.users())` - Authenticated users can create
- `Permission.update(Role.user(userId))` - Only document creator can update
- `Permission.delete(Role.user(userId))` - Only document creator can delete

**Example Permission Strategy:**

```typescript
// Public read, authenticated write
[
  Permission.read(Role.any()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
]

// User-specific data
[
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
]

// Admin-only
[
  Permission.read(Role.team('admins')),
  Permission.update(Role.team('admins')),
  Permission.delete(Role.team('admins')),
]
```

**⚠️ IMPORTANT:** Permissions are set at collection creation AND can be overridden per document. Plan your permission strategy carefully.


---

## Authentication Migration

### Phase 3: Auth System Migration (Days 4-7)

#### 3.1 Understand Authentication Differences

**Supabase Auth:**
```typescript
// Supabase
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Sign out
await supabase.auth.signOut();
```

**Appwrite Auth:**
```typescript
// Appwrite
import { Client, Account } from 'appwrite';
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);
const account = new Account(client);

// Sign in (creates session automatically)
const session = await account.createEmailPasswordSession(email, password);

// Get current user
const user = await account.get();

// Sign out (deletes current session)
await account.deleteSession('current');
```

**Key Differences:**
1. Appwrite sessions are managed differently (session IDs vs JWT)
2. No automatic session refresh (you must implement)
3. Different OAuth flow
4. User metadata stored separately


#### 3.2 Create Auth Context

**Create a new AuthContext for Appwrite:**

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Client, Account, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    await account.createEmailPasswordSession(email, password);
    await checkUser();
  }

  async function signUp(email: string, password: string, name: string) {
    await account.create(ID.unique(), email, password, name);
    await signIn(email, password);
  }

  async function signOut() {
    await account.deleteSession('current');
    setUser(null);
  }

  async function resetPassword(email: string) {
    await account.createRecovery(
      email,
      `${window.location.origin}/reset-password`
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```


#### 3.3 User Migration Strategy

**⚠️ CRITICAL DECISION:** How to migrate existing users?

**Option 1: Force Password Reset (Recommended)**
- Migrate user records to Appwrite
- Send password reset emails to all users
- Users set new passwords in Appwrite
- **Pros:** Secure, clean break
- **Cons:** User friction, support tickets

**Option 2: Parallel Authentication**
- Keep Supabase auth active
- Gradually migrate users on login
- **Pros:** Seamless for users
- **Cons:** Complex, maintains two systems

**Option 3: Password Hash Migration**
- Export password hashes from Supabase
- Import to Appwrite with compatible hashing
- **Pros:** No user action needed
- **Cons:** Complex, security risks, may not be possible

**Our Approach (Option 1):**
```typescript
// Migration script
async function migrateUsers() {
  // 1. Export users from Supabase
  const { data: supabaseUsers } = await supabase
    .from('users')
    .select('*');

  // 2. Create users in Appwrite
  for (const user of supabaseUsers) {
    try {
      // Create user account (they'll need to reset password)
      await account.create(
        ID.unique(),
        user.email,
        generateTemporaryPassword(), // Random password
        user.name
      );
      
      // Send password reset email
      await account.createRecovery(
        user.email,
        `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      );
      
      console.log(`✓ Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`✗ Failed to migrate user: ${user.email}`, error);
    }
  }
}
```


---

## Database Schema Migration

### Phase 4: Schema Transformation (Days 8-10)

#### 4.1 Handle the 27-Attribute Limit

**Problem:** Appwrite limits collections to 27 attributes. Many Supabase tables exceed this.

**Solution Strategies:**

**Strategy 1: Normalize Related Data**
```
Before (Supabase): users table (35 columns)
- id, email, name, role_id
- profile_photo, bio, phone, address
- preferences_theme, preferences_language, preferences_notifications
- settings_email_notifications, settings_sms_notifications
- ... (25 more columns)

After (Appwrite): 3 collections
Collection: users (10 attributes)
- id, email, name, roleId, profilePhoto, bio, phone, address, createdAt, updatedAt

Collection: user_preferences (8 attributes)
- id, userId, theme, language, notifications, timezone, dateFormat, currency

Collection: user_settings (9 attributes)
- id, userId, emailNotifications, smsNotifications, pushNotifications, ...
```

**Strategy 2: Use JSON for Flexible Data**
```typescript
// Instead of 10 separate attributes for preferences
Collection: users
- preferences (JSON object)
  {
    theme: 'dark',
    language: 'en',
    notifications: true,
    timezone: 'America/New_York',
    ...
  }
```

**⚠️ WARNING:** JSON attributes can't be queried/filtered. Only use for data you don't need to search.


#### 4.2 Replace SQL Queries with Appwrite Queries

**Supabase (SQL-based):**
```typescript
// Complex query with joins
const { data } = await supabase
  .from('attendees')
  .select(`
    *,
    custom_fields (*)
  `)
  .eq('event_id', eventId)
  .gte('created_at', startDate)
  .order('last_name', { ascending: true })
  .limit(50);
```

**Appwrite (Query Builder):**
```typescript
import { Query } from 'appwrite';

// No joins - must fetch separately
const attendees = await databases.listDocuments(
  DATABASE_ID,
  'attendees',
  [
    Query.equal('eventId', eventId),
    Query.greaterThanEqual('createdAt', startDate),
    Query.orderAsc('lastName'),
    Query.limit(50)
  ]
);

// Fetch related data separately
const customFieldIds = attendees.documents.map(a => a.customFieldId);
const customFields = await databases.listDocuments(
  DATABASE_ID,
  'custom_fields',
  [Query.equal('$id', customFieldIds)]
);

// Manually join in code
const attendeesWithFields = attendees.documents.map(attendee => ({
  ...attendee,
  customField: customFields.documents.find(cf => cf.$id === attendee.customFieldId)
}));
```

**Available Query Methods:**
```typescript
Query.equal('field', value)
Query.notEqual('field', value)
Query.lessThan('field', value)
Query.lessThanEqual('field', value)
Query.greaterThan('field', value)
Query.greaterThanEqual('field', value)
Query.search('field', 'search term')
Query.isNull('field')
Query.isNotNull('field')
Query.between('field', start, end)
Query.startsWith('field', 'prefix')
Query.endsWith('field', 'suffix')
Query.select(['field1', 'field2'])
Query.orderAsc('field')
Query.orderDesc('field')
Query.limit(number)
Query.offset(number)
Query.cursorAfter(documentId)
Query.cursorBefore(documentId)
```


#### 4.3 Create Helper Functions for Complex Queries

**Problem:** Fetching related data requires multiple queries.

**Solution:** Create helper functions to abstract complexity.

```typescript
// lib/appwrite-helpers.ts
import { Databases, Query } from 'node-appwrite';

export async function getEventSettingsWithIntegrations(
  databases: Databases,
  eventSettingsId: string
) {
  // Fetch main event settings
  const eventSettings = await databases.getDocument(
    DATABASE_ID,
    'event_settings',
    eventSettingsId
  );

  // Fetch related integrations in parallel
  const [cloudinary, switchboard, oneSimpleApi] = await Promise.all([
    databases.listDocuments(DATABASE_ID, 'cloudinary_integrations', [
      Query.equal('eventSettingsId', eventSettingsId)
    ]),
    databases.listDocuments(DATABASE_ID, 'switchboard_integrations', [
      Query.equal('eventSettingsId', eventSettingsId)
    ]),
    databases.listDocuments(DATABASE_ID, 'onesimpleapi_integrations', [
      Query.equal('eventSettingsId', eventSettingsId)
    ])
  ]);

  // Combine into single object
  return {
    ...eventSettings,
    cloudinary: cloudinary.documents[0] || null,
    switchboard: switchboard.documents[0] || null,
    oneSimpleApi: oneSimpleApi.documents[0] || null
  };
}

export async function getAttendeesWithCustomFields(
  databases: Databases,
  eventId: string,
  filters: any[] = []
) {
  // Fetch attendees
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    'attendees',
    [Query.equal('eventId', eventId), ...filters]
  );

  // Get unique custom field IDs
  const customFieldIds = [...new Set(
    attendees.documents
      .map(a => a.customFieldValues)
      .flat()
      .map(v => v.fieldId)
  )];

  // Fetch custom fields
  const customFields = await databases.listDocuments(
    DATABASE_ID,
    'custom_fields',
    [Query.equal('$id', customFieldIds)]
  );

  // Map custom fields to attendees
  return attendees.documents.map(attendee => ({
    ...attendee,
    customFields: customFields.documents.filter(cf =>
      attendee.customFieldValues.some(v => v.fieldId === cf.$id)
    )
  }));
}
```

**Usage:**
```typescript
// Instead of multiple queries in your API route
const settings = await getEventSettingsWithIntegrations(databases, eventId);
const attendees = await getAttendeesWithCustomFields(databases, eventId);
```


---

## Data Migration

### Phase 5: Migrating Production Data (Days 11-14)

#### 5.1 Create Migration Scripts

**Step 1: Export from Supabase**

```typescript
// scripts/export-from-supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportData() {
  console.log('Exporting data from Supabase...');

  // Export each table
  const tables = ['users', 'roles', 'attendees', 'custom_fields', 'event_settings', 'logs'];
  
  for (const table of tables) {
    console.log(`Exporting ${table}...`);
    
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error(`Error exporting ${table}:`, error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allData = allData.concat(data);
      page++;
      
      console.log(`  Exported ${allData.length} records...`);
    }
    
    // Save to file
    fs.writeFileSync(
      `./migration-data/${table}.json`,
      JSON.stringify(allData, null, 2)
    );
    
    console.log(`✓ Exported ${allData.length} ${table} records`);
  }
  
  console.log('Export complete!');
}

exportData();
```


**Step 2: Transform and Import to Appwrite**

```typescript
// scripts/import-to-appwrite.ts
import { Client, Databases, ID } from 'node-appwrite';
import * as fs from 'fs';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = 'credentialstudio';

async function importData() {
  console.log('Importing data to Appwrite...');

  // Import in order (respect dependencies)
  await importRoles();
  await importUsers();
  await importEventSettings();
  await importCustomFields();
  await importAttendees();
  await importLogs();

  console.log('Import complete!');
}

async function importRoles() {
  console.log('Importing roles...');
  const roles = JSON.parse(fs.readFileSync('./migration-data/roles.json', 'utf-8'));
  
  for (const role of roles) {
    try {
      await databases.createDocument(
        DATABASE_ID,
        'roles',
        role.id, // Use same ID from Supabase
        {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isDefault: role.is_default,
          createdAt: role.created_at,
          updatedAt: role.updated_at
        }
      );
      console.log(`✓ Imported role: ${role.name}`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  Role already exists: ${role.name}`);
      } else {
        console.error(`✗ Failed to import role: ${role.name}`, error);
      }
    }
  }
}

async function importEventSettings() {
  console.log('Importing event settings...');
  const settings = JSON.parse(fs.readFileSync('./migration-data/event_settings.json', 'utf-8'));
  
  for (const setting of settings) {
    try {
      // Split into multiple collections due to 27-attribute limit
      
      // 1. Main event settings
      await databases.createDocument(
        DATABASE_ID,
        'event_settings',
        setting.id,
        {
          eventName: setting.event_name,
          eventDate: setting.event_date,
          barcodeType: setting.barcode_type,
          barcodeLength: setting.barcode_length,
          // ... other core fields
        }
      );
      
      // 2. Cloudinary integration
      if (setting.cloudinary_enabled) {
        await databases.createDocument(
          DATABASE_ID,
          'cloudinary_integrations',
          ID.unique(),
          {
            eventSettingsId: setting.id,
            enabled: setting.cloudinary_enabled,
            cloudName: setting.cloudinary_cloud_name,
            apiKey: setting.cloudinary_api_key,
            // ... other Cloudinary fields
          }
        );
      }
      
      // 3. Switchboard integration
      if (setting.switchboard_enabled) {
        await databases.createDocument(
          DATABASE_ID,
          'switchboard_integrations',
          ID.unique(),
          {
            eventSettingsId: setting.id,
            enabled: setting.switchboard_enabled,
            apiEndpoint: setting.switchboard_api_endpoint,
            // ... other Switchboard fields
          }
        );
      }
      
      console.log(`✓ Imported event settings: ${setting.event_name}`);
    } catch (error) {
      console.error(`✗ Failed to import event settings`, error);
    }
  }
}

// Similar functions for other collections...

importData();
```


#### 5.2 Data Validation

**Create validation scripts to ensure data integrity:**

```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  console.log('Validating migration...');
  
  const errors: string[] = [];
  
  // 1. Count records
  const supabaseRoles = JSON.parse(fs.readFileSync('./migration-data/roles.json', 'utf-8'));
  const appwriteRoles = await databases.listDocuments(DATABASE_ID, 'roles');
  
  if (supabaseRoles.length !== appwriteRoles.total) {
    errors.push(`Role count mismatch: Supabase=${supabaseRoles.length}, Appwrite=${appwriteRoles.total}`);
  }
  
  // 2. Validate relationships
  const users = await databases.listDocuments(DATABASE_ID, 'users');
  for (const user of users.documents) {
    if (user.roleId) {
      try {
        await databases.getDocument(DATABASE_ID, 'roles', user.roleId);
      } catch (error) {
        errors.push(`User ${user.email} references non-existent role ${user.roleId}`);
      }
    }
  }
  
  // 3. Validate required fields
  const attendees = await databases.listDocuments(DATABASE_ID, 'attendees');
  for (const attendee of attendees.documents) {
    if (!attendee.firstName || !attendee.lastName) {
      errors.push(`Attendee ${attendee.$id} missing required fields`);
    }
  }
  
  // 4. Validate data integrity
  const eventSettings = await databases.listDocuments(DATABASE_ID, 'event_settings');
  for (const setting of eventSettings.documents) {
    // Check if integrations exist
    const cloudinary = await databases.listDocuments(
      DATABASE_ID,
      'cloudinary_integrations',
      [Query.equal('eventSettingsId', setting.$id)]
    );
    
    if (cloudinary.total === 0) {
      errors.push(`Event setting ${setting.$id} missing Cloudinary integration`);
    }
  }
  
  // Report results
  if (errors.length === 0) {
    console.log('✓ Validation passed! No errors found.');
  } else {
    console.error(`✗ Validation failed with ${errors.length} errors:`);
    errors.forEach(error => console.error(`  - ${error}`));
  }
  
  return errors.length === 0;
}
```


#### 5.3 Migration Checklist

**Pre-Migration:**
- [ ] Backup all Supabase data
- [ ] Test migration scripts in development
- [ ] Validate data transformation logic
- [ ] Create rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users of upcoming changes

**During Migration:**
- [ ] Put application in maintenance mode
- [ ] Run export script from Supabase
- [ ] Verify export completeness
- [ ] Run import script to Appwrite
- [ ] Run validation script
- [ ] Fix any validation errors
- [ ] Re-run validation until clean
- [ ] Test critical user flows
- [ ] Deploy updated application code
- [ ] Remove maintenance mode

**Post-Migration:**
- [ ] Monitor error logs
- [ ] Check user authentication
- [ ] Verify data integrity
- [ ] Test all features
- [ ] Keep Supabase active for 30 days (rollback safety)
- [ ] Monitor performance metrics

**⚠️ CRITICAL:** Do NOT delete Supabase data until you're 100% confident in the migration (recommend 30-90 days).


---

## API Routes Migration

### Phase 6: Updating API Endpoints (Days 15-21)

#### 6.1 API Route Transformation Pattern

**Before (Supabase):**
```typescript
// pages/api/attendees/index.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('attendees')
      .insert(req.body)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }
}
```

**After (Appwrite):**
```typescript
// pages/api/attendees/index.ts
import { Client, Databases, ID, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const attendees = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderAsc('lastName')]
      );

      return res.status(200).json(attendees.documents);
    }

    if (req.method === 'POST') {
      const attendee = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        req.body
      );

      return res.status(201).json(attendee);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```


#### 6.2 Common Migration Patterns

**Pattern 1: Filtering and Searching**

```typescript
// Supabase
const { data } = await supabase
  .from('attendees')
  .select('*')
  .ilike('first_name', `%${searchTerm}%`)
  .eq('event_id', eventId);

// Appwrite
const attendees = await databases.listDocuments(
  DATABASE_ID,
  COLLECTION_ID,
  [
    Query.search('firstName', searchTerm),
    Query.equal('eventId', eventId)
  ]
);
```

**Pattern 2: Pagination**

```typescript
// Supabase
const { data } = await supabase
  .from('attendees')
  .select('*')
  .range(0, 49); // First 50 records

// Appwrite
const attendees = await databases.listDocuments(
  DATABASE_ID,
  COLLECTION_ID,
  [
    Query.limit(50),
    Query.offset(0)
  ]
);
```

**Pattern 3: Updating Records**

```typescript
// Supabase
const { data } = await supabase
  .from('attendees')
  .update({ first_name: 'John' })
  .eq('id', attendeeId)
  .select()
  .single();

// Appwrite
const attendee = await databases.updateDocument(
  DATABASE_ID,
  COLLECTION_ID,
  attendeeId,
  { firstName: 'John' }
);
```

**Pattern 4: Deleting Records**

```typescript
// Supabase
await supabase
  .from('attendees')
  .delete()
  .eq('id', attendeeId);

// Appwrite
await databases.deleteDocument(
  DATABASE_ID,
  COLLECTION_ID,
  attendeeId
);
```


#### 6.3 Batch Migration Strategy

**Don't migrate all routes at once!** Use a phased approach:

**Phase 1: Read-Only Routes (Low Risk)**
- GET endpoints that only fetch data
- No data modification
- Easy to test and rollback

**Phase 2: Simple CRUD Routes (Medium Risk)**
- Basic create, update, delete operations
- Single collection operations
- No complex business logic

**Phase 3: Complex Routes (High Risk)**
- Multiple collection operations
- Complex business logic
- Integration with external services

**Phase 4: Critical Routes (Highest Risk)**
- Authentication endpoints
- Payment processing
- User-facing critical features

**Example Migration Order:**
```
Week 1:
✓ GET /api/attendees
✓ GET /api/roles
✓ GET /api/custom-fields
✓ GET /api/event-settings

Week 2:
✓ POST /api/attendees
✓ PUT /api/attendees/[id]
✓ DELETE /api/attendees/[id]
✓ POST /api/custom-fields

Week 3:
✓ POST /api/attendees/bulk-import
✓ POST /api/attendees/bulk-export
✓ POST /api/attendees/bulk-delete
✓ POST /api/switchboard/test

Week 4:
✓ POST /api/auth/login
✓ POST /api/auth/signup
✓ POST /api/auth/reset-password
✓ POST /api/users/invite
```


---

## Real-time Subscriptions

### Phase 7: Migrating Real-time Features (Days 22-24)

#### 7.1 Understanding Real-time Differences

**Supabase Real-time:**
```typescript
// Subscribe to changes
const subscription = supabase
  .channel('attendees-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendees'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

**Appwrite Real-time:**
```typescript
// Subscribe to changes
const unsubscribe = client.subscribe(
  `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
  (response) => {
    console.log('Change received!', response);
    
    // response.events contains event types:
    // - databases.*.collections.*.documents.*.create
    // - databases.*.collections.*.documents.*.update
    // - databases.*.collections.*.documents.*.delete
  }
);
```

#### 7.2 Create Real-time Hook

```typescript
// hooks/useRealtimeSubscription.ts
import { useEffect, useState } from 'react';
import { Client } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export function useRealtimeSubscription(
  channel: string,
  callback: (payload: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = client.subscribe(channel, (response) => {
      setIsConnected(true);
      callback(response);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [channel, callback]);

  return { isConnected };
}
```

**Usage:**
```typescript
// In your component
const { isConnected } = useRealtimeSubscription(
  `databases.${DATABASE_ID}.collections.${ATTENDEES_COLLECTION}.documents`,
  (response) => {
    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
      // New attendee created
      refreshAttendees();
    }
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      // Attendee updated
      refreshAttendees();
    }
    if (response.events.includes('databases.*.collections.*.documents.*.delete')) {
      // Attendee deleted
      refreshAttendees();
    }
  }
);
```


---

## Testing Strategy

### Phase 8: Comprehensive Testing (Days 25-28)

#### 8.1 Unit Tests

**Test Database Operations:**
```typescript
// __tests__/lib/appwrite-helpers.test.ts
import { getEventSettingsWithIntegrations } from '@/lib/appwrite-helpers';

describe('Appwrite Helpers', () => {
  it('should fetch event settings with integrations', async () => {
    const settings = await getEventSettingsWithIntegrations(databases, 'test-id');
    
    expect(settings).toHaveProperty('eventName');
    expect(settings).toHaveProperty('cloudinary');
    expect(settings).toHaveProperty('switchboard');
  });

  it('should handle missing integrations gracefully', async () => {
    const settings = await getEventSettingsWithIntegrations(databases, 'no-integrations');
    
    expect(settings.cloudinary).toBeNull();
    expect(settings.switchboard).toBeNull();
  });
});
```

#### 8.2 Integration Tests

**Test API Routes:**
```typescript
// __tests__/api/attendees.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/attendees';

describe('/api/attendees', () => {
  it('GET returns list of attendees', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toBeInstanceOf(Array);
  });

  it('POST creates new attendee', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('$id');
    expect(data.firstName).toBe('John');
  });
});
```


#### 8.3 End-to-End Tests

**Test Critical User Flows:**
```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up, log in, and access dashboard', async ({ page }) => {
  // Sign up
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePassword123!');
  await page.fill('[name="name"]', 'Test User');
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome, Test User')).toBeVisible();

  // Log out
  await page.click('button:has-text("Log Out")');
  await expect(page).toHaveURL('/login');

  // Log back in
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');

  // Should be back on dashboard
  await expect(page).toHaveURL('/dashboard');
});

test('user can create and edit attendee', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');

  // Navigate to attendees
  await page.click('text=Attendees');
  
  // Create new attendee
  await page.click('button:has-text("Add Attendee")');
  await page.fill('[name="firstName"]', 'Jane');
  await page.fill('[name="lastName"]', 'Smith');
  await page.fill('[name="email"]', 'jane@example.com');
  await page.click('button:has-text("Save")');

  // Verify attendee appears in list
  await expect(page.locator('text=Jane Smith')).toBeVisible();

  // Edit attendee
  await page.click('text=Jane Smith');
  await page.click('button:has-text("Edit")');
  await page.fill('[name="firstName"]', 'Janet');
  await page.click('button:has-text("Save")');

  // Verify update
  await expect(page.locator('text=Janet Smith')).toBeVisible();
});
```


#### 8.4 Performance Testing

**Load Testing Script:**
```typescript
// scripts/load-test.ts
import { Client, Databases, Query } from 'node-appwrite';

async function loadTest() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  
  console.log('Starting load test...');
  
  // Test 1: Concurrent reads
  const startRead = Date.now();
  const readPromises = Array.from({ length: 100 }, () =>
    databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.limit(50)])
  );
  await Promise.all(readPromises);
  const readTime = Date.now() - startRead;
  console.log(`100 concurrent reads: ${readTime}ms (avg: ${readTime / 100}ms)`);
  
  // Test 2: Sequential writes
  const startWrite = Date.now();
  for (let i = 0; i < 10; i++) {
    await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      firstName: `Test${i}`,
      lastName: 'User',
      email: `test${i}@example.com`
    });
  }
  const writeTime = Date.now() - startWrite;
  console.log(`10 sequential writes: ${writeTime}ms (avg: ${writeTime / 10}ms)`);
  
  // Test 3: Complex queries
  const startQuery = Date.now();
  await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
    Query.search('firstName', 'John'),
    Query.equal('status', 'active'),
    Query.greaterThan('createdAt', '2024-01-01'),
    Query.orderDesc('lastName'),
    Query.limit(100)
  ]);
  const queryTime = Date.now() - startQuery;
  console.log(`Complex query: ${queryTime}ms`);
}

loadTest();
```

**Performance Benchmarks:**
- Simple read: < 100ms
- Simple write: < 200ms
- Complex query: < 500ms
- Real-time latency: < 1000ms


---

## Deployment & Rollback

### Phase 9: Production Deployment (Days 29-30)

#### 9.1 Pre-Deployment Checklist

**Code Readiness:**
- [ ] All API routes migrated and tested
- [ ] All database queries converted
- [ ] Real-time subscriptions working
- [ ] Authentication fully functional
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Error handling implemented
- [ ] Logging configured

**Infrastructure Readiness:**
- [ ] Appwrite project configured
- [ ] All collections created
- [ ] Indexes created for performance
- [ ] Permissions configured correctly
- [ ] Environment variables set
- [ ] SSL certificates valid
- [ ] CDN configured (if applicable)

**Data Readiness:**
- [ ] Data migration scripts tested
- [ ] Validation scripts ready
- [ ] Backup of Supabase data created
- [ ] Rollback plan documented
- [ ] Data integrity verified

**Team Readiness:**
- [ ] Team trained on Appwrite
- [ ] Documentation updated
- [ ] Support team briefed
- [ ] Monitoring dashboards configured
- [ ] Incident response plan ready


#### 9.2 Deployment Strategy

**Option 1: Blue-Green Deployment (Recommended)**

```
1. Current Production (Blue)
   - Running on Supabase
   - Serving all traffic

2. New Environment (Green)
   - Running on Appwrite
   - Not serving traffic yet
   - Fully tested

3. Switch Traffic
   - Update DNS/load balancer
   - Route 10% traffic to Green
   - Monitor for errors
   - Gradually increase to 100%

4. Rollback if Needed
   - Switch traffic back to Blue
   - Investigate issues
   - Fix and retry
```

**Option 2: Feature Flag Deployment**

```typescript
// lib/feature-flags.ts
export const useAppwrite = process.env.NEXT_PUBLIC_USE_APPWRITE === 'true';

// In your API routes
if (useAppwrite) {
  // Appwrite code
  const attendees = await databases.listDocuments(...);
} else {
  // Supabase code (fallback)
  const { data: attendees } = await supabase.from('attendees').select('*');
}
```

**Option 3: Maintenance Window Deployment**

```
1. Schedule maintenance window (e.g., 2 AM - 4 AM)
2. Put site in maintenance mode
3. Run data migration
4. Deploy new code
5. Validate everything works
6. Remove maintenance mode
```


#### 9.3 Rollback Plan

**Immediate Rollback (< 5 minutes):**
```bash
# 1. Switch DNS/load balancer back to old infrastructure
# 2. Revert environment variables
export NEXT_PUBLIC_USE_APPWRITE=false

# 3. Redeploy previous version
git checkout previous-stable-tag
npm run build
npm run deploy

# 4. Verify old system is working
curl https://yourapp.com/api/health
```

**Partial Rollback (Specific Features):**
```typescript
// Use feature flags to disable specific Appwrite features
export const FEATURES = {
  useAppwriteAuth: false,  // Rollback auth to Supabase
  useAppwriteDatabase: true,  // Keep database on Appwrite
  useAppwriteRealtime: false,  // Rollback realtime to Supabase
};
```

**Data Rollback:**
```bash
# If data was corrupted, restore from backup
# 1. Export current Appwrite data (for investigation)
npx tsx scripts/export-from-appwrite.ts

# 2. Clear Appwrite collections
npx tsx scripts/clear-appwrite.ts

# 3. Re-import from Supabase backup
npx tsx scripts/import-from-backup.ts
```

**⚠️ CRITICAL:** Test your rollback plan BEFORE production deployment!


---

## Lessons Learned

### What Went Well

1. **Phased Migration Approach**
   - Migrating routes in batches reduced risk
   - Allowed for learning and adjustment
   - Easier to identify and fix issues

2. **Helper Functions**
   - Abstracting complex queries into helpers saved time
   - Made code more maintainable
   - Easier to optimize later

3. **Comprehensive Testing**
   - Caught many issues before production
   - Gave confidence in the migration
   - Reduced post-deployment bugs

4. **Documentation**
   - Detailed docs helped team understand changes
   - Made troubleshooting easier
   - Valuable for future reference

### What Was Challenging

1. **27-Attribute Limit**
   - **Impact:** Required splitting collections
   - **Solution:** Normalized data into related collections
   - **Lesson:** Plan schema carefully upfront

2. **No SQL Joins**
   - **Impact:** Multiple queries needed for related data
   - **Solution:** Helper functions and parallel fetching
   - **Lesson:** Consider denormalization for performance

3. **Permission Model Differences**
   - **Impact:** Complete redesign of access control
   - **Solution:** Document-level permissions with roles
   - **Lesson:** Test permissions extensively

4. **Real-time Event Structure**
   - **Impact:** Different event format than Supabase
   - **Solution:** Custom hook to normalize events
   - **Lesson:** Abstract platform-specific code

5. **Query Limitations**
   - **Impact:** Some complex Supabase queries impossible
   - **Solution:** Fetch more data, filter in code
   - **Lesson:** Understand platform limitations early


### Unexpected Issues

1. **Attribute Creation Delays**
   - Appwrite processes attributes asynchronously
   - Had to add delays in setup scripts
   - Solution: Poll for attribute status before proceeding

2. **Case Sensitivity**
   - Appwrite is case-sensitive for field names
   - Supabase was case-insensitive
   - Solution: Standardize on camelCase everywhere

3. **Date Handling**
   - Different date formats between platforms
   - Solution: Use ISO 8601 strings consistently

4. **File Upload Differences**
   - Different API for file storage
   - Solution: Create abstraction layer

5. **Rate Limiting**
   - Appwrite has stricter rate limits
   - Solution: Implement request batching and caching

### Best Practices Discovered

1. **Always Use Helper Functions**
   ```typescript
   // Don't repeat database queries everywhere
   // Create reusable helpers
   export async function getAttendeeWithRelations(id: string) {
     const attendee = await databases.getDocument(...);
     const customFields = await databases.listDocuments(...);
     return { ...attendee, customFields };
   }
   ```

2. **Implement Caching**
   ```typescript
   // Cache frequently accessed data
   const cache = new Map();
   
   export async function getEventSettings(id: string) {
     if (cache.has(id)) return cache.get(id);
     const settings = await databases.getDocument(...);
     cache.set(id, settings);
     return settings;
   }
   ```

3. **Use TypeScript Strictly**
   ```typescript
   // Define types for all Appwrite documents
   interface Attendee {
     $id: string;
     firstName: string;
     lastName: string;
     email: string;
     // ... all fields
   }
   ```

4. **Monitor Everything**
   ```typescript
   // Log all database operations
   const originalListDocuments = databases.listDocuments;
   databases.listDocuments = async (...args) => {
     const start = Date.now();
     const result = await originalListDocuments.apply(databases, args);
     console.log(`Query took ${Date.now() - start}ms`);
     return result;
   };
   ```


---

## Cost Analysis

### Migration Costs

**Development Time:**
- Planning & Assessment: 40 hours
- Infrastructure Setup: 24 hours
- Code Migration: 120 hours
- Testing: 40 hours
- Deployment: 16 hours
- **Total: 240 hours (6 weeks full-time)**

**At $100/hour developer rate: $24,000**

**Infrastructure Costs:**

**Supabase (Previous):**
- Pro Plan: $25/month
- Database: Included
- Auth: Included
- Storage: $0.021/GB
- Bandwidth: $0.09/GB
- **Estimated: $50-100/month**

**Appwrite (New):**
- Pro Plan: $15/month per member
- Database: Included
- Auth: Included
- Storage: $0.02/GB
- Bandwidth: $0.04/GB
- **Estimated: $30-80/month**

**Savings: ~$20-40/month**
**ROI: 600-1200 months to recover development costs**

### Hidden Costs

1. **Opportunity Cost**
   - 6 weeks not building features
   - Delayed product roadmap
   - Potential lost revenue

2. **Support Costs**
   - User confusion during transition
   - Password reset support tickets
   - Bug fixes post-migration

3. **Monitoring & Maintenance**
   - New monitoring tools
   - Learning curve for team
   - Ongoing optimization

### When Migration Makes Sense

✅ **Good Reasons to Migrate:**
- Supabase pricing becoming prohibitive
- Need features only Appwrite offers
- Compliance requirements
- Performance issues with Supabase
- Strategic business decision

❌ **Bad Reasons to Migrate:**
- "Just because" or following trends
- Minor cost savings
- Avoiding learning Supabase
- Grass-is-greener syndrome

**Reality Check:** Unless you're saving $500+/month or have specific requirements, the migration cost may not be worth it.


---

## Final Recommendations

### Before You Start

1. **Evaluate Alternatives**
   - Can you solve your problem without migrating?
   - Have you explored all Supabase features?
   - Is the cost/benefit truly worth it?

2. **Get Buy-In**
   - Stakeholder approval
   - Team commitment
   - Budget allocation
   - Timeline agreement

3. **Prepare Thoroughly**
   - Read ALL documentation
   - Build proof-of-concept
   - Test in staging extensively
   - Create detailed plan

### During Migration

1. **Take Your Time**
   - Don't rush
   - Test everything twice
   - Document as you go
   - Ask for help when stuck

2. **Communicate Constantly**
   - Keep stakeholders updated
   - Notify users of changes
   - Document decisions
   - Share progress

3. **Stay Flexible**
   - Plans will change
   - Issues will arise
   - Be ready to adapt
   - Don't be afraid to pause

### After Migration

1. **Monitor Closely**
   - Watch error logs
   - Track performance
   - Listen to user feedback
   - Be ready to rollback

2. **Optimize Gradually**
   - Don't optimize prematurely
   - Measure before optimizing
   - Focus on bottlenecks
   - Document improvements

3. **Keep Learning**
   - Appwrite is evolving
   - New features released
   - Community best practices
   - Stay updated

---

## Conclusion

Migrating from Supabase to Appwrite is a significant undertaking that requires careful planning, thorough execution, and constant vigilance. While the migration can be successful, it's expensive, time-consuming, and risky.

**Key Takeaways:**

1. **Plan Extensively** - The 27-attribute limit and lack of SQL joins require significant architectural changes
2. **Test Thoroughly** - Every query, every permission, every feature must be tested
3. **Migrate Gradually** - Phased approach reduces risk and allows for learning
4. **Document Everything** - Future you (and your team) will thank you
5. **Be Prepared to Rollback** - Things can go wrong; have a plan

**Final Advice:** Only migrate if you have a compelling business reason. The grass isn't always greener, and sometimes the devil you know is better than the devil you don't.

If you do decide to migrate, use this guide as your roadmap, but remember: every application is unique. Adapt these strategies to your specific needs, and don't hesitate to seek help from the Appwrite community.

Good luck! 🚀

---

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Discord Community](https://appwrite.io/discord)
- [Appwrite GitHub](https://github.com/appwrite/appwrite)
- [Supabase to Appwrite Migration Tools](https://github.com/appwrite/migration-tools)

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** CredentialStudio Team  
**Status:** Complete

