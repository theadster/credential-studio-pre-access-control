# Requirements Document

## Introduction

This specification outlines the complete migration of CredentialStudio from Supabase/Prisma to Appwrite. The migration encompasses three core areas: authentication system, database operations, and real-time functionality. The goal is to replace all Supabase and Prisma dependencies with Appwrite equivalents while maintaining feature parity and ensuring data continuity through a migration path.

## Requirements

### Requirement 1: Authentication System Migration

**User Story:** As a system administrator, I want to migrate the authentication system from Supabase Auth to Appwrite Auth, so that all user authentication flows work seamlessly with Appwrite.

#### Acceptance Criteria

1. WHEN a user attempts to log in THEN the system SHALL authenticate using Appwrite Auth instead of Supabase Auth
2. WHEN a user signs up THEN the system SHALL create the account in Appwrite Auth with all required user metadata
3. WHEN a user resets their password THEN the system SHALL use Appwrite's password recovery flow
4. WHEN a user session is validated THEN the system SHALL verify the session using Appwrite's session management
5. WHEN OAuth providers are used (Google) THEN the system SHALL integrate with Appwrite's OAuth implementation
6. WHEN magic link authentication is used THEN the system SHALL implement Appwrite's magic URL functionality
7. IF a user is authenticated THEN the AuthContext SHALL provide user data from Appwrite
8. WHEN authentication state changes THEN the system SHALL update the UI accordingly using Appwrite's auth state listeners

### Requirement 2: Database Schema Migration

**User Story:** As a developer, I want to migrate the database schema from Prisma/PostgreSQL to Appwrite Database, so that all data models are properly structured in Appwrite collections.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL create Appwrite collections for all existing Prisma models (User, Attendee, Role, CustomField, EventSettings, Log, Invitation)
2. WHEN collections are created THEN the system SHALL define appropriate attributes matching the Prisma schema types
3. WHEN relationships exist between models THEN the system SHALL implement them using Appwrite's relationship attributes or document references
4. WHEN unique constraints exist THEN the system SHALL configure unique indexes in Appwrite
5. WHEN default values are specified THEN the system SHALL handle them in application logic or collection configuration
6. WHEN JSON fields exist (permissions, customFieldValues) THEN the system SHALL store them as JSON attributes in Appwrite
7. WHEN timestamps are needed THEN the system SHALL utilize Appwrite's automatic createdAt and updatedAt fields

### Requirement 3: Database Operations Migration

**User Story:** As a developer, I want to replace all Prisma database queries with Appwrite Database SDK calls, so that all CRUD operations work with Appwrite.

#### Acceptance Criteria

1. WHEN API routes perform database queries THEN they SHALL use Appwrite Database SDK instead of Prisma Client
2. WHEN creating records THEN the system SHALL use Appwrite's createDocument method
3. WHEN reading records THEN the system SHALL use Appwrite's getDocument or listDocuments methods
4. WHEN updating records THEN the system SHALL use Appwrite's updateDocument method
5. WHEN deleting records THEN the system SHALL use Appwrite's deleteDocument method
6. WHEN filtering data THEN the system SHALL use Appwrite's Query class for filters
7. WHEN paginating results THEN the system SHALL use Appwrite's limit and offset queries
8. WHEN sorting data THEN the system SHALL use Appwrite's orderAsc/orderDesc queries
9. WHEN performing complex queries with joins THEN the system SHALL fetch related documents separately or use Appwrite relationships
10. WHEN transactions are needed THEN the system SHALL implement compensating logic since Appwrite doesn't support transactions

### Requirement 4: API Routes Refactoring

**User Story:** As a developer, I want to refactor all API routes to use Appwrite instead of Supabase/Prisma, so that the backend functionality remains intact.

#### Acceptance Criteria

1. WHEN an API route is called THEN it SHALL authenticate requests using Appwrite session validation
2. WHEN attendee endpoints are accessed THEN they SHALL perform operations using Appwrite Database
3. WHEN custom field endpoints are accessed THEN they SHALL manage custom fields in Appwrite collections
4. WHEN event settings are modified THEN they SHALL update Appwrite documents
5. WHEN role and permission endpoints are accessed THEN they SHALL manage roles using Appwrite collections
6. WHEN user management endpoints are accessed THEN they SHALL use Appwrite Users API for admin operations
7. WHEN invitation endpoints are accessed THEN they SHALL manage invitations in Appwrite
8. WHEN log endpoints are accessed THEN they SHALL store and retrieve logs from Appwrite
9. WHEN bulk operations are performed THEN they SHALL batch Appwrite operations appropriately
10. WHEN file uploads occur (photos) THEN they SHALL continue using Cloudinary (no change needed)

### Requirement 5: Real-time Functionality Migration

**User Story:** As a user, I want real-time updates to work with Appwrite Realtime, so that I see live changes without page refreshes.

#### Acceptance Criteria

1. WHEN data changes in Appwrite collections THEN subscribed clients SHALL receive real-time updates
2. WHEN a component subscribes to real-time updates THEN it SHALL use Appwrite's subscribe method
3. WHEN a component unmounts THEN it SHALL properly unsubscribe from Appwrite Realtime
4. WHEN attendee data changes THEN the dashboard SHALL update in real-time
5. WHEN logs are created THEN the logs view SHALL update in real-time
6. IF real-time updates fail THEN the system SHALL gracefully fall back to polling or manual refresh

### Requirement 6: Client-Side Integration

**User Story:** As a developer, I want to update all client-side code to use Appwrite SDK, so that frontend components interact correctly with Appwrite services.

#### Acceptance Criteria

1. WHEN components make API calls THEN they SHALL use Appwrite SDK methods where appropriate
2. WHEN the AuthContext is used THEN it SHALL provide Appwrite user sessions and account data
3. WHEN protected routes are accessed THEN they SHALL verify authentication using Appwrite
4. WHEN forms submit data THEN they SHALL send data to API routes that use Appwrite
5. WHEN the application initializes THEN it SHALL configure the Appwrite client with correct endpoint and project ID
6. WHEN environment variables are used THEN they SHALL include Appwrite configuration (endpoint, project ID, API keys)

### Requirement 7: Permission and Security Model

**User Story:** As a system administrator, I want to implement proper permissions in Appwrite, so that data access is controlled according to user roles.

#### Acceptance Criteria

1. WHEN collections are created THEN they SHALL have appropriate read/write permissions configured
2. WHEN a user accesses documents THEN Appwrite SHALL enforce collection-level permissions
3. WHEN role-based access is needed THEN the system SHALL use Appwrite's team-based permissions or custom role attributes
4. WHEN admin operations are performed THEN they SHALL use Appwrite API keys with appropriate scopes
5. WHEN users access their own data THEN permissions SHALL allow user-level access
6. WHEN public data is accessed THEN permissions SHALL allow appropriate public read access

### Requirement 8: Data Migration Tool

**User Story:** As a system administrator, I want a migration script to transfer data from Supabase to Appwrite, so that existing production data is preserved.

#### Acceptance Criteria

1. WHEN the migration script runs THEN it SHALL connect to both Supabase and Appwrite
2. WHEN data is exported from Supabase THEN it SHALL retrieve all records from all tables
3. WHEN data is imported to Appwrite THEN it SHALL create documents in corresponding collections
4. WHEN relationships exist THEN the migration SHALL preserve foreign key relationships using document IDs
5. WHEN user accounts exist THEN the migration SHALL create corresponding Appwrite Auth users
6. WHEN errors occur during migration THEN the script SHALL log errors and continue with remaining records
7. WHEN the migration completes THEN it SHALL provide a summary report of migrated records
8. IF data validation fails THEN the script SHALL report validation errors without stopping the migration
9. WHEN sensitive data is migrated THEN the script SHALL handle it securely

### Requirement 9: Dependency Cleanup

**User Story:** As a developer, I want to remove all Supabase and Prisma dependencies, so that the codebase only contains Appwrite-related code.

#### Acceptance Criteria

1. WHEN cleanup is performed THEN the system SHALL remove @supabase/* packages from package.json
2. WHEN cleanup is performed THEN the system SHALL remove @prisma/* packages from package.json
3. WHEN cleanup is performed THEN the system SHALL delete the prisma/ directory and schema files
4. WHEN cleanup is performed THEN the system SHALL remove all Supabase utility files from src/util/supabase/
5. WHEN cleanup is performed THEN the system SHALL remove Prisma client imports and references
6. WHEN cleanup is performed THEN the system SHALL update documentation to remove Supabase/Prisma references
7. WHEN cleanup is performed THEN the system SHALL remove database setup scripts that reference Supabase
8. WHEN cleanup is performed THEN the system SHALL update npm scripts to remove Prisma commands
9. WHEN cleanup is performed THEN the system SHALL remove environment variables related to Supabase

### Requirement 10: Documentation and Configuration Updates

**User Story:** As a developer, I want updated documentation and configuration, so that the project reflects the Appwrite architecture.

#### Acceptance Criteria

1. WHEN documentation is updated THEN README.md SHALL describe Appwrite setup instead of Supabase
2. WHEN documentation is updated THEN tech.md SHALL list Appwrite as the database and auth provider
3. WHEN documentation is updated THEN all setup guides SHALL reference Appwrite configuration
4. WHEN environment variables are documented THEN they SHALL include Appwrite-specific variables
5. WHEN configuration files are updated THEN they SHALL remove Supabase-specific settings
6. WHEN the .env.local template is provided THEN it SHALL include Appwrite endpoint and project ID
7. WHEN build scripts are documented THEN they SHALL not reference Prisma generate or migrate commands
