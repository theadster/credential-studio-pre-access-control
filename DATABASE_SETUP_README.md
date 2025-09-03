# CredentialStudio Database Setup

This directory contains the SQL setup file for creating a complete CredentialStudio database from scratch.

## Files

- `database_setup.sql` - Complete database schema and initial data setup
- `DATABASE_SETUP_README.md` - This file with setup instructions

## Prerequisites

- PostgreSQL database (version 12 or higher recommended)
- Database user with CREATE, INSERT, UPDATE, DELETE privileges
- UUID extension support (automatically enabled in the script)

## Setup Instructions

### 1. Create a New Database

```sql
CREATE DATABASE credentialstudio;
```

### 2. Connect to the Database

```bash
psql -h your-host -U your-username -d credentialstudio
```

### 3. Run the Setup Script

```bash
psql -h your-host -U your-username -d credentialstudio -f database_setup.sql
```

Or from within psql:

```sql
\i database_setup.sql
```

## What Gets Created

### Tables

1. **User** - Application users with authentication data
2. **Role** - User roles with JSON-based permissions
3. **EventSettings** - Global event configuration and integration settings
4. **CustomField** - Dynamic custom fields for attendee data collection
5. **Attendee** - Event attendees with custom field support
6. **AttendeeCustomFieldValue** - Values for custom fields per attendee
7. **ActivityLog** - System activity and audit logging
8. **LogSettings** - Configuration for activity logging features

### Default Data

#### Roles Created
- **Super Administrator** - Full access to all features
- **Administrator** - Full attendee management, limited user management
- **Manager** - Attendee management, view-only for users and settings
- **Editor** - Basic attendee management, no admin features
- **Viewer** - Read-only access to attendees

#### Default Settings
- Event settings with sample event data
- Log settings with comprehensive logging enabled
- Sample custom fields (Company, Registration Type, Dietary Restrictions)

### Indexes

Performance indexes are created on:
- User email, role, and creation date
- Attendee names, email, barcode, and timestamps
- Custom field relationships
- Activity log user, action, and timestamp
- Custom field ordering

## Environment Variables

After setting up the database, ensure your `.env.local` file contains:

```env
DATABASE_URL="postgresql://username:password@host:port/credentialstudio"
DIRECT_URL="postgresql://username:password@host:port/credentialstudio"
```

## Post-Setup Steps

1. **Create Your First User**: Use the Supabase Auth system or the application's signup process
2. **Assign Super Administrator Role**: Update the first user's `roleId` to `super-admin-role-id`
3. **Configure Event Settings**: Update the default event settings through the application
4. **Set Up Integrations**: Configure Cloudinary, Switchboard Canvas, and OneSimpleAPI as needed

## Sample SQL for First User Setup

```sql
-- After creating your first user through the application, assign Super Admin role
UPDATE "User" 
SET "roleId" = 'super-admin-role-id' 
WHERE "email" = 'your-email@example.com';
```

## Customization

### Removing Sample Data

If you don't want the sample custom fields, remove these lines from the SQL file:

```sql
-- Remove the INSERT INTO "CustomField" section
```

### Modifying Default Roles

Edit the role permissions in the `INSERT INTO "Role"` section to match your organization's needs.

### Changing Default Event Settings

Modify the `INSERT INTO "EventSettings"` section to set your default event configuration.

## Troubleshooting

### Permission Errors
Ensure your database user has sufficient privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE credentialstudio TO your_username;
GRANT ALL ON SCHEMA public TO your_username;
```

### UUID Extension Error
If you get an error about the UUID extension, run as a superuser:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Foreign Key Constraint Errors
Ensure you're running the complete script in order. The foreign key constraints depend on the tables being created first.

## Backup and Migration

### Creating a Backup
```bash
pg_dump -h your-host -U your-username credentialstudio > backup.sql
```

### Restoring from Backup
```bash
psql -h your-host -U your-username credentialstudio < backup.sql
```

## Security Notes

- Change default role IDs in production
- Regularly backup your database
- Monitor activity logs for security events
- Use strong database credentials
- Enable SSL connections in production

## Support

For issues with the database setup, check:
1. PostgreSQL logs for detailed error messages
2. Ensure all environment variables are correctly set
3. Verify database user permissions
4. Check network connectivity to the database server