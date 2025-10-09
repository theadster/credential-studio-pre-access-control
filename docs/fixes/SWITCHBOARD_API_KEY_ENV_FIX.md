# Switchboard API Key Environment Variable Fix

## Issue

After moving API keys from the database to environment variables, the Switchboard Canvas integration was failing with the error:

```
Error: Switchboard Canvas is not properly configured
```

## Root Cause

The API routes were still checking for `switchboardIntegration.apiKey` from the database, which no longer exists after the security migration.

## Files Fixed

### 1. `src/pages/api/attendees/[id]/generate-credential.ts`

**Before:**
```typescript
if (!switchboardIntegration.apiKey || !switchboardIntegration.apiEndpoint) {
  return res.status(400).json({ error: 'Switchboard Canvas is not properly configured' });
}

// Later in the code...
if (authHeaderType === 'Bearer') {
  headers['Authorization'] = `Bearer ${switchboardIntegration.apiKey}`;
} else {
  headers[authHeaderType] = switchboardIntegration.apiKey || '';
}
```

**After:**
```typescript
// Get API key from environment variable (not stored in database for security)
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;

if (!switchboardApiKey || !switchboardIntegration.apiEndpoint) {
  return res.status(400).json({ 
    error: 'Switchboard Canvas is not properly configured. Check SWITCHBOARD_API_KEY environment variable.' 
  });
}

// Later in the code...
if (authHeaderType === 'Bearer') {
  headers['Authorization'] = `Bearer ${switchboardApiKey}`;
} else {
  headers[authHeaderType] = switchboardApiKey;
}
```

### 2. `src/pages/api/switchboard/test.ts`

**Before:**
```typescript
if (!settings.switchboard.apiEndpoint || !settings.switchboard.apiKey) {
  return res.status(400).json({ error: 'Switchboard Canvas is not properly configured' });
}

// Later in the code...
if (authHeaderType === 'Bearer') {
  headers['Authorization'] = `Bearer ${settings.switchboard.apiKey}`;
} else {
  headers[authHeaderType] = settings.switchboard.apiKey || '';
}
```

**After:**
```typescript
// Get API key from environment variable (not stored in database for security)
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;

if (!settings.switchboard.apiEndpoint || !switchboardApiKey) {
  return res.status(400).json({ 
    error: 'Switchboard Canvas is not properly configured. Check SWITCHBOARD_API_KEY environment variable.' 
  });
}

// Later in the code...
if (authHeaderType === 'Bearer') {
  headers['Authorization'] = `Bearer ${switchboardApiKey}`;
} else {
  headers[authHeaderType] = switchboardApiKey;
}
```

## Changes Summary

1. ✅ Read API key from `process.env.SWITCHBOARD_API_KEY` instead of database
2. ✅ Updated validation to check environment variable
3. ✅ Improved error message to mention environment variable
4. ✅ Updated API call headers to use environment variable
5. ✅ Added security comments

## Configuration Required

Add to `.env.local`:

```bash
# Switchboard Canvas Configuration
# Get your API key from Switchboard Canvas dashboard
SWITCHBOARD_API_KEY=your_switchboard_api_key_here
```

## Testing

After adding the environment variable:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Test credential generation:
   - Go to an attendee
   - Click "Generate Credential"
   - Should work without the "not properly configured" error

3. Test the Switchboard test endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/switchboard/test \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie"
   ```

## Related Documentation

- [Integration API Keys Guide](../guides/INTEGRATION_API_KEYS_GUIDE.md)
- [API Keys Removal Migration](../migration/API_KEYS_REMOVAL_MIGRATION.md)

## Security Benefits

✅ API key no longer stored in database  
✅ API key only accessible server-side  
✅ Easy to rotate without database changes  
✅ Environment-specific keys (dev/staging/production)  
