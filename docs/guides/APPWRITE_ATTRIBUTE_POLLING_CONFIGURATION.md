# Appwrite Attribute Polling Configuration

## Overview

The Event Settings migration script (`src/scripts/fix-event-settings-consolidated.ts`) uses intelligent retry logic with exponential backoff to wait for Appwrite attributes to be ready after creation, instead of a hardcoded sleep timer.

## Environment Variables

Configure the attribute polling behavior using these environment variables in your `.env.local` file:

### `APPWRITE_ATTRIBUTE_READY_TIMEOUT`

**Type:** Integer (milliseconds)  
**Default:** `60000` (60 seconds)  
**Description:** Maximum time to wait for attributes to become ready before timing out.

```bash
# Wait up to 2 minutes
APPWRITE_ATTRIBUTE_READY_TIMEOUT=120000

# Wait up to 30 seconds (faster, but may fail on slow networks)
APPWRITE_ATTRIBUTE_READY_TIMEOUT=30000
```

### `APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY`

**Type:** Integer (milliseconds)  
**Default:** `2000` (2 seconds)  
**Description:** Initial delay before the first polling attempt. This delay increases exponentially with each retry.

```bash
# Start with 5 second delay
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=5000

# Start with 1 second delay (more aggressive)
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=1000
```

### `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`

**Type:** Integer  
**Default:** `20`  
**Description:** Maximum number of polling attempts before giving up.

```bash
# Allow more attempts
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=30

# Fewer attempts (fail faster)
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=10
```

## How It Works

1. **Initial Wait:** After creating attributes, the script waits for the initial delay period
2. **Polling:** The script polls Appwrite to check if all required attributes exist
3. **Exponential Backoff:** Each retry waits 1.5x longer than the previous attempt (capped at 10 seconds)
4. **Success:** Once all attributes are confirmed, the script proceeds immediately
5. **Failure:** If timeout or max attempts is reached, the script throws an error

## Example Configurations

### Fast Network / Local Development
```bash
APPWRITE_ATTRIBUTE_READY_TIMEOUT=30000
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=1000
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=15
```

### Slow Network / Production
```bash
APPWRITE_ATTRIBUTE_READY_TIMEOUT=120000
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=5000
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=30
```

### Default (Balanced)
```bash
# These are the defaults if not specified
APPWRITE_ATTRIBUTE_READY_TIMEOUT=60000
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=2000
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=20
```

## Logging

The script logs detailed information about each retry attempt:

```
⏳ Waiting for attributes to be ready (timeout: 60000ms, max attempts: 20)...
   Required attributes: eventDate, eventTime, eventLocation, timeZone, barcodeUnique, cloudinaryConfig, oneSimpleApiConfig, additionalSettings
   Attempt 1/20 (elapsed: 0ms, delay: 2000ms)...
   ⏳ Still waiting for 3 attributes: cloudinaryConfig, oneSimpleApiConfig, additionalSettings
   📊 Found 5 attributes so far
   Attempt 2/20 (elapsed: 2150ms, delay: 3000ms)...
   ⏳ Still waiting for 1 attributes: additionalSettings
   📊 Found 7 attributes so far
   Attempt 3/20 (elapsed: 5200ms, delay: 4500ms)...
✅ All 8 attributes are ready! (took 9800ms, 3 attempts)
```

## Troubleshooting

### Timeout Errors

If you see:
```
❌ Timeout exceeded (60000ms). Attributes not ready after 15 attempts.
```

**Solutions:**
1. Increase `APPWRITE_ATTRIBUTE_READY_TIMEOUT`
2. Increase `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`
3. Check Appwrite dashboard to see if attributes are being created
4. Verify your Appwrite API key has proper permissions

### Max Attempts Exceeded

If you see:
```
❌ Failed to verify attributes after 20 attempts and 45000ms
```

**Solutions:**
1. Increase `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`
2. Increase `APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY` to give Appwrite more time
3. Check network connectivity to Appwrite endpoint

### Attributes Not Found

If attributes are never found:
1. Ensure the collection is empty before running the script
2. Verify your Appwrite API key has admin permissions
3. Check the Appwrite dashboard for error messages
4. Review the script logs for attribute creation errors

## Best Practices

1. **Start with defaults:** The default values work well for most scenarios
2. **Monitor logs:** Watch the retry attempts to understand your Appwrite instance's behavior
3. **Adjust for environment:** Use faster settings for local development, more conservative for production
4. **Don't set too low:** Very low timeouts may cause false failures on slower networks
5. **Validate integers:** The script parses env vars as integers; invalid values fall back to defaults

## Related Scripts

- `src/scripts/fix-event-settings-consolidated.ts` - Main migration script using this configuration
- `src/scripts/setup-appwrite.ts` - Initial Appwrite setup (may benefit from similar logic)
- `src/scripts/verify-appwrite-setup.ts` - Verification script

## See Also

- [Appwrite Documentation](https://appwrite.io/docs)
- [Event Settings Migration Guide](../migration/MIGRATION_STATUS.md)
- [Testing Configuration](../testing.md)
