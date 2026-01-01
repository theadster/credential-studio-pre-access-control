# Appwrite Attribute Polling - Environment Variable Examples

## Quick Reference

Add these to your `.env.local` file to configure attribute polling behavior in migration scripts.

## Default Configuration (Recommended)

No configuration needed - the script uses sensible defaults:
- Timeout: 60 seconds
- Initial delay: 2 seconds
- Max attempts: 20

```bash
# No env vars needed - defaults work well for most cases
```

## Fast Local Development

For local Appwrite instances or fast networks:

```bash
# Faster polling for local development
APPWRITE_ATTRIBUTE_READY_TIMEOUT=30000        # 30 seconds
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=1000   # 1 second
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=15      # 15 attempts
```

## Production / Slow Networks

For production Appwrite Cloud or slower networks:

```bash
# More patient polling for production
APPWRITE_ATTRIBUTE_READY_TIMEOUT=120000       # 2 minutes
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=5000   # 5 seconds
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=30      # 30 attempts
```

## Aggressive (Fail Fast)

For CI/CD or when you want to fail quickly:

```bash
# Fail fast if attributes aren't ready quickly
APPWRITE_ATTRIBUTE_READY_TIMEOUT=20000        # 20 seconds
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=1000   # 1 second
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=10      # 10 attempts
```

## Conservative (Very Patient)

For very slow networks or busy Appwrite instances:

```bash
# Very patient - wait up to 5 minutes
APPWRITE_ATTRIBUTE_READY_TIMEOUT=300000       # 5 minutes
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=10000  # 10 seconds
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=50      # 50 attempts
```

## Complete .env.local Example

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID=event-settings
APPWRITE_API_KEY=your-api-key

# Attribute Polling Configuration (Optional - defaults are usually fine)
APPWRITE_ATTRIBUTE_READY_TIMEOUT=60000        # 60 seconds (default)
APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY=2000   # 2 seconds (default)
APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS=20      # 20 attempts (default)
```

## Understanding the Values

### APPWRITE_ATTRIBUTE_READY_TIMEOUT
- **What it does:** Maximum total time to wait before giving up
- **Units:** Milliseconds
- **Default:** 60000 (60 seconds)
- **When to increase:** Slow networks, busy Appwrite instances
- **When to decrease:** Fast local development, CI/CD

### APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY
- **What it does:** Starting delay between polls (grows exponentially)
- **Units:** Milliseconds
- **Default:** 2000 (2 seconds)
- **When to increase:** Reduce API load, very slow attribute creation
- **When to decrease:** Fast local development, quick feedback

### APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS
- **What it does:** Maximum number of times to check before giving up
- **Units:** Count
- **Default:** 20
- **When to increase:** Very slow networks, want more retries
- **When to decrease:** Fail fast, CI/CD environments

## Exponential Backoff Explained

The delay between attempts grows exponentially:
- Attempt 1: 2000ms (2s)
- Attempt 2: 3000ms (3s)
- Attempt 3: 4500ms (4.5s)
- Attempt 4: 6750ms (6.75s)
- Attempt 5: 10000ms (10s) - capped
- Attempt 6+: 10000ms (10s) - stays at cap

This means:
- Early attempts are quick (good for fast cases)
- Later attempts are patient (good for slow cases)
- Never waits more than 10 seconds between attempts

## Troubleshooting

### "Timeout exceeded" Error

```
❌ Timeout exceeded (60000ms). Attributes not ready after 15 attempts.
```

**Solutions:**
1. Increase `APPWRITE_ATTRIBUTE_READY_TIMEOUT`
2. Increase `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`
3. Check Appwrite dashboard for errors
4. Verify API key has proper permissions

### "Attributes not ready after X attempts" Error

```
❌ Failed to verify attributes after 20 attempts and 45000ms
```

**Solutions:**
1. Increase `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`
2. Increase `APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY`
3. Check network connectivity
4. Verify collection is empty before running

### Script Completes Too Slowly

If the script takes too long:
1. Decrease `APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY`
2. Check if attributes are actually taking that long (see logs)
3. Consider if your Appwrite instance is slow

### Script Fails Too Quickly

If the script fails before attributes are ready:
1. Increase `APPWRITE_ATTRIBUTE_READY_TIMEOUT`
2. Increase `APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS`
3. Increase `APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY`

## Testing Your Configuration

Run the migration script and watch the logs:

```bash
npx tsx src/scripts/fix-event-settings-consolidated.ts
```

Look for lines like:
```
⏳ Waiting for attributes to be ready (timeout: 60000ms, max attempts: 20)...
   Attempt 1/20 (elapsed: 0ms, delay: 2000ms)...
   Attempt 2/20 (elapsed: 2150ms, delay: 3000ms)...
✅ All 8 attributes are ready! (took 9800ms, 3 attempts)
```

This tells you:
- How long it actually took
- How many attempts were needed
- If your configuration is appropriate

## Recommendations

1. **Start with defaults** - They work well for most cases
2. **Monitor the logs** - See how long it actually takes
3. **Adjust if needed** - Only change if you see issues
4. **Document changes** - Note why you changed values
5. **Test thoroughly** - Verify your configuration works

## See Also

- [Appwrite Attribute Polling Configuration Guide](./APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md)
- [Appwrite Attribute Polling Fix](../fixes/APPWRITE_ATTRIBUTE_POLLING_FIX.md)
- [Migration Status](../migration/MIGRATION_STATUS.md)
