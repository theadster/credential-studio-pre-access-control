# Appwrite Setup Guide

This guide walks you through setting up Appwrite infrastructure for CredentialStudio.

## Prerequisites

1. **Appwrite Account**: Create an account at [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. **Node.js 20.x**: Ensure you have Node.js installed
3. **Environment Variables**: Your `.env.local` file should have the following Appwrite variables configured:
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY`

## Step 1: Create Appwrite Project

1. Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Click "Create Project"
3. Enter project name: "CredentialStudio"
4. Select your preferred region (e.g., New York, Frankfurt, etc.)
5. Click "Create"

## Step 2: Get Project Credentials

### Project ID
1. In your Appwrite project dashboard, click on "Settings" in the left sidebar
2. Copy the "Project ID" value
3. Add it to `.env.local` as `NEXT_PUBLIC_APPWRITE_PROJECT_ID`

### API Endpoint
1. The endpoint is typically `https://cloud.appwrite.io/v1` for Appwrite Cloud
2. If using self-hosted, use your custom endpoint
3. Add it to `.env.local` as `NEXT_PUBLIC_APPWRITE_ENDPOINT`

### API Key (Server-Side)
1. In your Appwrite project, go to "Settings" → "API Keys"
2. Click "Create API Key"
3. Name it "Server API Key"
4. Set expiration (or leave as "Never")
5. Under "Scopes", select ALL scopes for:
   - `databases.*`
   - `collections.*`
   - `documents.*`
   - `users.*`
   - `sessions.*`
6. Click "Create"
7. Copy the API key and add it to `.env.local` as `APPWRITE_API_KEY`
8. **Important**: Keep this key secret! Never commit it to version control.

## Step 3: Run the Setup Script

The setup script will automatically create:
- Database: `credentialstudio`
- 8 Collections with proper attributes, indexes, and permissions

Run the setup script:

```bash
npm run setup:appwrite
```

The script will:
1. Create the database
2. Create all required collections
3. Configure attributes for each collection
4. Set up indexes for performance
5. Configure basic permissions
6. Output the collection IDs to add to your `.env.local`

## Step 4: Update Environment Variables

After running the setup script, it will output environment variables. These should already be in your `.env.local` file, but verify they match:

```env
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=roles
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=attendees
NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID=custom_fields
NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID=event_settings
NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID=logs
NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID=log_settings
```

## Step 5: Configure OAuth Providers (Optional)

If you want to enable Google Sign-In:

1. In Appwrite Console, go to "Auth" → "Settings"
2. Scroll to "OAuth2 Providers"
3. Find "Google" and click "Enable"
4. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Set the redirect URL to: `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/[PROJECT_ID]`
6. Add this redirect URL to your Google Cloud Console OAuth configuration
7. Click "Update"

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen if prompted
6. Select "Web application"
7. Add authorized redirect URIs:
   - `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/[PROJECT_ID]`
   - `http://localhost:3000/auth/callback` (for local development)
8. Copy Client ID and Client Secret

## Step 6: Configure Permissions (Advanced)

The setup script configures basic permissions. You may want to refine these in the Appwrite Console:

### Collection Permissions Overview

- **Users**: Read by any authenticated user, write by admins only
- **Roles**: Read by any authenticated user, write by admins only
- **Attendees**: Read/write based on user permissions
- **Custom Fields**: Read by all, write by admins
- **Event Settings**: Read by all, write by admins
- **Logs**: Read by users with log permissions, create by any authenticated user
- **Log Settings**: Read by all, write by admins
- **Invitations**: Read/write by admins and creators

To modify permissions:
1. Go to "Databases" → "credentialstudio"
2. Click on a collection
3. Go to "Settings" → "Permissions"
4. Adjust as needed

## Step 7: Verify Setup

You can verify the setup in the Appwrite Console:

1. Go to "Databases" in the left sidebar
2. Click on "credentialstudio"
3. You should see 8 collections:
   - users
   - roles
   - attendees
   - custom_fields
   - event_settings
   - logs
   - log_settings
   - invitations
4. Click on each collection to verify attributes and indexes

## Troubleshooting

### Error: "Invalid API Key"
- Verify your `APPWRITE_API_KEY` is correct
- Ensure the API key has all necessary scopes
- Check that the API key hasn't expired

### Error: "Collection already exists"
- This is normal if you've run the script before
- The script will skip existing collections
- To start fresh, delete the database in Appwrite Console and run again

### Error: "Project not found"
- Verify `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is correct
- Ensure you're using the correct endpoint

### Attribute Creation Delays
- Appwrite processes attribute creation asynchronously
- If you see errors about attributes not being ready, wait a few seconds and try again
- Check the Appwrite Console to see attribute status

## Next Steps

After completing the setup:

1. ✅ Appwrite infrastructure is ready
2. 📝 Continue with task 2: Implement core Appwrite utilities
3. 🔐 Migrate authentication system (task 3)
4. 📊 Migrate API routes (tasks 4-12)
5. 🔄 Run data migration from Supabase (task 14)

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Rotate API keys** regularly
3. **Use environment-specific** projects (dev, staging, production)
4. **Review permissions** regularly in Appwrite Console
5. **Enable 2FA** on your Appwrite account
6. **Monitor API usage** in Appwrite Console

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Database Guide](https://appwrite.io/docs/products/databases)
- [Appwrite Auth Guide](https://appwrite.io/docs/products/auth)
- [Appwrite Permissions](https://appwrite.io/docs/advanced/platform/permissions)
