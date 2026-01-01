# Multi-Tenancy Quick Start

## TL;DR

Each site deployment needs two unique IDs in its environment variables:
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID` - Which database to use
- `NEXT_PUBLIC_APPWRITE_TEAM_ID` - Which team users belong to

Users are automatically added to the team when created/linked.

## 5-Minute Setup

### 1. Create Team in Appwrite Console

```
Appwrite Console → Auth → Teams → Create Team
Copy the Team ID: 68de0080001c8d0b67a7
```

### 2. Create Database in Appwrite Console

```
Appwrite Console → Databases → Create Database
Name: credentialstudio_site1
Copy the Database ID: credentialstudio_site1
```

### 3. Set Database Permissions

```
Database → Settings → Permissions
Add Team: 68de0080001c8d0b67a7
Permissions: Read, Create, Update, Delete ✓
```

### 4. Run Setup Script

```bash
export NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_site1
export NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67a7
npm run setup:appwrite
```

### 5. Configure Environment Variables

```env
# .env.local for Site 1
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_site1
NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67a7
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true
```

### 6. Deploy

Deploy with these environment variables set.

## What Happens Automatically

✅ When you create/link a user → They're added to the site's team  
❌ When a user self-signs up → They are NOT added to any team (must be manually approved)  
✅ Team membership → Grants access to the site's database  
✅ Data isolation → Each site's data stays in its own database  

## Common Scenarios

### Scenario 1: New Site Deployment

```bash
# 1. Create team and database in Appwrite Console
# 2. Set environment variables
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio_site2
NEXT_PUBLIC_APPWRITE_TEAM_ID=68de0080001c8d0b67b8

# 3. Run setup
npm run setup:appwrite

# 4. Deploy
```

### Scenario 2: Give User Access to Multiple Sites

**Site 1 Admin:**
1. Go to Users page
2. Click "Link Existing User"
3. Select the user
4. Assign role
5. User is automatically added to Site 1's team

**Site 2 Admin:**
1. Go to Users page
2. Click "Link Existing User"
3. Select the same user
4. Assign role
5. User is automatically added to Site 2's team

**Result:** User can now access both Site 1 and Site 2

### Scenario 3: Remove User from Site

**Option A: Unlink (Preserve Auth Account)**
1. Go to Users page
2. Click delete on user
3. Uncheck "Delete from authentication"
4. Check "Remove from team"
5. Confirm

**Result:** User removed from this site only, can still access other sites

**Option B: Delete Completely**
1. Go to Users page
2. Click delete on user
3. Check "Delete from authentication"
4. Check "Remove from team"
5. Confirm

**Result:** User deleted from all sites

## Environment Variables Checklist

### Shared Across All Sites (Same Values)
- ✅ `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- ✅ `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- ✅ `APPWRITE_API_KEY`
- ✅ `APPWRITE_TEAM_MEMBERSHIP_ENABLED=true`

### Unique Per Site (Different Values)
- 🔴 `NEXT_PUBLIC_APPWRITE_DATABASE_ID` - **MUST BE DIFFERENT**
- 🔴 `NEXT_PUBLIC_APPWRITE_TEAM_ID` - **MUST BE DIFFERENT**

### Same Names, Different Data
- ✅ `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users`
- ✅ `NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=roles`
- ✅ `NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=attendees`
- ✅ (All other collection IDs use same names)

## Troubleshooting

### "User already linked to team"

**Problem:** User is already in this team.

**Solution:** This is normal. If you want them in a different site's team, use that site's deployment.

### "Team ID not configured"

**Problem:** Missing `NEXT_PUBLIC_APPWRITE_TEAM_ID` in environment variables.

**Solution:** 
```bash
# Add to .env.local
NEXT_PUBLIC_APPWRITE_TEAM_ID=your_team_id_here

# Restart dev server
npm run dev
```

### Users can't see data

**Problem:** Database permissions not set.

**Solution:**
```
1. Appwrite Console → Databases → [Your Database]
2. Settings → Permissions
3. Add your team with full permissions
4. Save
```

### Wrong database being accessed

**Problem:** Environment variable not set correctly.

**Solution:**
```bash
# Verify in .env.local
echo $NEXT_PUBLIC_APPWRITE_DATABASE_ID

# Should match your intended database
# If not, update .env.local and restart
```

## Verification Checklist

After setup, verify:

- [ ] Team created in Appwrite Console
- [ ] Database created in Appwrite Console
- [ ] Database permissions include the team
- [ ] Environment variables set correctly
- [ ] Setup script ran successfully
- [ ] Collections created in database
- [ ] Can create a test user
- [ ] Test user added to team automatically
- [ ] Test user can access the site

## Next Steps

- Read the [Full Multi-Tenancy Setup Guide](./MULTI_TENANCY_SETUP_GUIDE.md) for detailed information
- Set up monitoring for team membership operations
- Document your team-to-database mappings
- Create a backup strategy for each database

## Quick Reference

| What | Where | Example |
|------|-------|---------|
| Create Team | Appwrite Console → Auth → Teams | `68de0080001c8d0b67a7` |
| Create Database | Appwrite Console → Databases | `credentialstudio_site1` |
| Set Permissions | Database → Settings → Permissions | Team + Full Access |
| Run Setup | Terminal | `npm run setup:appwrite` |
| Configure Env | `.env.local` | See Step 5 above |
| Deploy | Your platform | Vercel, Docker, etc. |

## Support

For detailed documentation, see:
- [Multi-Tenancy Setup Guide](./MULTI_TENANCY_SETUP_GUIDE.md) - Complete guide
- [Appwrite Teams Documentation](https://appwrite.io/docs/products/auth/teams) - Official docs
- Application logs - Check for team membership errors
