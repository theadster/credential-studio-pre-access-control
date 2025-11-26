# Multi-Tenancy Setup Guide

## Overview

credential.studio supports multi-tenancy using a single Appwrite project with multiple databases and teams. Each site deployment is isolated to its own database and team, allowing you to manage multiple independent events/organizations within one Appwrite project.

## Architecture

```
Appwrite Project (Single)
├── Team A → Database A → Site Deployment A
├── Team B → Database B → Site Deployment B
└── Team C → Database C → Site Deployment C
```

**Key Concepts:**
- **One Appwrite Project**: All sites share the same project ID
- **Multiple Teams**: Each site has its own team for access control
- **Multiple Databases**: Each site has its own database for data isolation
- **Team-to-Database Mapping**: Configured via environment variables per deployment

## Setup Instructions

### Step 1: Create Teams in Appwrite Console

1. Go to your Appwrite Console → Auth → Teams
2. Create a new team for each site/tenant
3. Copy the Team ID for each team (you'll need this for environment variables)

**Example:**
- Site 1 (Event A): Team ID = `68de0080001c8d0b67a7`
- Site 2 (Event B): Team ID = `68de0080001c8d0b67b8`
- Site 3 (Event C): Team ID = `68de0080001c8d0b67c9`

### Step 2: Create Databases in Appwrite Console

1. Go to your Appwrite Console → Databases
2. Create a new database for each site/tenant
3. Copy the Database ID for each database

**Example:**
- Site 1 Database: `credentialstudio_event_a`
- Site 2 Database: `credentialstudio_event_b`
- Site 3 Database: `credentialstudio_event_c`

### Step 3: Configure Database Permissions

For each database, configure team-based permissions:

1. Go to Database → Settings → Permissions
2. Add the corresponding team with appropriate permissions:
   - Read: Allow
   - Create: Allow
   - Update: Allow
   - Delete: Allow

**Example for Site 1:**
- Database: `credentialstudio_event_a`
- Team: `68de0080001c8d0b67a7` (Team A)
- Permissions: Full access (CRUD)

### Step 4: Run Setup Script for Each Database

For each database, you need to create the collections and schema:

```bash
# Set environment variables for the target database
export NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_event_a
export NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67a7

# Run the setup script
npm run setup:appwrite
```

Repeat this for each database, changing the IDs accordingly.

### Step 5: Configure Environment Variables Per Deployment

Each site deployment needs its own `.env.local` file with unique values:

**Site 1 (.env.local):**
```env
# Appwrite Configuration (SHARED across all sites)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68daa3cd001938dc73a4
APPWRITE_API_KEY=your_api_key_here

# Site-Specific Configuration
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_event_a
NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67a7

# Team Membership (Enable automatic team assignment)
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true

# Collection IDs (same names across databases)
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=roles
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=attendees
# ... other collections
```

**Site 2 (.env.local):**
```env
# Appwrite Configuration (SHARED - same as Site 1)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68daa3cd001938dc73a4
APPWRITE_API_KEY=your_api_key_here

# Site-Specific Configuration (DIFFERENT)
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_event_b
NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67b8

# Team Membership (Enable automatic team assignment)
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true

# Collection IDs (same names across databases)
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=roles
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=attendees
# ... other collections
```

### Step 6: Deploy Each Site

Deploy each site instance with its corresponding environment variables:

**Vercel Example:**
1. Create separate Vercel projects for each site
2. Configure environment variables in Vercel dashboard for each project
3. Deploy each project

**Docker Example:**
```bash
# Site 1
docker run -e NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_event_a \
           -e NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67a7 \
           your-image:latest

# Site 2
docker run -e NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_event_b \
           -e NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67b8 \
           your-image:latest
```

## How It Works

### User Creation Flow

When an admin creates/links a user on a site:

1. User is created in Appwrite Auth (project-level)
2. User profile is created in the site's database
3. **User is automatically added to the site's team** (via `NEXT_PUBLIC_APPWRITE_TEAM_ID`)
4. User can now access the site's database through team permissions

### User Signup Flow

When a user self-signs up:

1. User is created in Appwrite Auth
2. User profile is created in the site's database
3. **User is NOT added to any team** (requires manual approval)
4. Admin must manually link the user to grant access to the site

### Multi-Site Access

If a user needs access to multiple sites:

1. Admin on Site A creates/links the user → User added to Team A
2. Admin on Site B creates/links the same user → User added to Team B
3. User now has access to both Site A and Site B
4. Each site's data remains isolated in separate databases

## Important Notes

### Shared vs. Isolated Resources

**Shared Across All Sites:**
- Appwrite Project ID
- Appwrite Auth users (user accounts)
- API keys

**Isolated Per Site:**
- Database (data storage)
- Team membership (access control)
- Collections and documents

### User Management

**Creating Users:**
- Users can be created on any site
- Once created in Auth, they exist project-wide
- Each site must explicitly link the user to access that site's data

**Linking Existing Users:**
- If a user already exists in Auth, you can link them to a new site
- This adds them to the new site's team
- They'll have access to both sites' data

**Deleting Users:**
- Deleting from database only: Removes access to that site
- Deleting from Auth: Removes user from entire project (all sites)

### Team Roles

When users are added to teams, they're assigned roles:

**Default Role Mapping (for manually linked users):**
- Super Administrator → `owner`
- Event Manager → `admin`
- Registration Staff → `member`
- Viewer → `member`

**Note:** Self-signup users are NOT automatically added to teams. They must be manually linked by an administrator.

You can customize this in `src/pages/api/users/index.ts`:

```typescript
const roleMapping: Record<string, string[]> = {
  'Super Administrator': ['owner'],
  'Event Manager': ['admin'],
  'Registration Staff': ['member'],
  'Viewer': ['member']
};
```

## Troubleshooting

### Error: "User already linked to team"

**Problem:** Trying to add a user to a team they're already in.

**Solution:** This is expected behavior. Users can be in multiple teams. The error means they're already in THIS specific team. If you want them in a different team (different site), use that site's deployment.

### Error: "Team ID not configured"

**Problem:** `NEXT_PUBLIC_APPWRITE_TEAM_ID` is not set in environment variables.

**Solution:** Add the team ID to your `.env.local` file and restart the development server.

### Users Can't Access Data

**Problem:** User is in the team but can't see data.

**Solution:** Check database permissions:
1. Go to Appwrite Console → Databases → [Your Database] → Settings → Permissions
2. Ensure the team has appropriate permissions (Read, Create, Update, Delete)
3. Check collection-level permissions as well

### Wrong Database Being Used

**Problem:** Site is accessing the wrong database.

**Solution:** 
1. Verify `NEXT_PUBLIC_APPWRITE_DATABASE_ID` in environment variables
2. Restart the development server or redeploy
3. Clear browser cache and cookies

## Best Practices

### 1. Naming Conventions

Use consistent naming for teams and databases:

```
Team: [organization]_[event]_team
Database: credentialstudio_[organization]_[event]
```

Example:
- Team: `acme_conference_2024_team`
- Database: `credentialstudio_acme_conference_2024`

### 2. Environment Variable Management

- Use a secrets manager (AWS Secrets Manager, Vercel Environment Variables, etc.)
- Never commit `.env.local` files to version control
- Document which variables are shared vs. site-specific

### 3. Database Migrations

When updating the schema:
1. Update the setup script (`scripts/setup-appwrite.ts`)
2. Run the script against ALL databases
3. Test on a staging database first

### 4. Monitoring

- Monitor team membership logs in each site's logs collection
- Track which users have access to which sites
- Set up alerts for failed team membership operations

### 5. Backup Strategy

- Backup each database separately
- Document team-to-database mappings
- Keep a record of all team IDs and database IDs

## Scaling Considerations

### Current Limits

- **Appwrite Free Plan**: 100 operations per transaction
- **Appwrite Pro Plan**: 1000 operations per transaction
- **Appwrite Scale Plan**: 2500 operations per transaction

### When to Split Projects

Consider using separate Appwrite projects when:
- You have 50+ sites/tenants
- You need complete isolation (compliance, security)
- You need different billing per tenant
- You need different geographic regions per tenant

### Performance Optimization

- Use database indexes for frequently queried fields
- Implement caching for team-to-database lookups
- Monitor API rate limits per project

## Migration Guide

### From Single-Tenant to Multi-Tenant

If you're migrating from a single-tenant setup:

1. **Backup existing data**
2. **Create new teams** for each tenant
3. **Create new databases** for each tenant
4. **Migrate data** from single database to tenant databases
5. **Update environment variables** for each deployment
6. **Test thoroughly** before switching production traffic

### From Multiple Projects to Single Project

If you're consolidating multiple projects:

1. **Export data** from each project
2. **Create teams** in the target project
3. **Create databases** in the target project
4. **Import data** into respective databases
5. **Update environment variables** to point to new project
6. **Migrate users** (may require re-authentication)

## Security Considerations

### Team Permissions

- Always use least-privilege principle
- Regularly audit team memberships
- Remove users from teams when they no longer need access

### API Keys

- Use separate API keys per environment (dev, staging, prod)
- Rotate API keys regularly
- Never expose API keys in client-side code

### Database Permissions

- Set appropriate collection-level permissions
- Use attribute-level permissions for sensitive fields
- Regularly review and audit permissions

## Support

For issues or questions:
1. Check Appwrite documentation: https://appwrite.io/docs
2. Review application logs for team membership errors
3. Verify environment variables are correctly set
4. Test with a single user first before bulk operations

## Summary

Multi-tenancy in credential.studio is achieved through:
- ✅ One Appwrite project (shared authentication)
- ✅ Multiple teams (access control per site)
- ✅ Multiple databases (data isolation per site)
- ✅ Environment variables (configuration per deployment)
- ✅ Automatic team membership (seamless user onboarding)

Each site deployment is completely isolated while sharing the same codebase and authentication system.
