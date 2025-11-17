# Running Integration Tests

This guide explains how to run integration tests that require a live database connection.

## Overview

Some tests in this project require a live Appwrite database connection to verify real-world behavior. These tests are implemented as standalone scripts rather than traditional unit tests because they:

- Need to interact with a real database
- Require valid API keys and credentials
- Test actual migration scripts
- Verify state changes before and after operations

## Available Integration Tests

### Logs Timestamp Fix Test

Tests the logs timestamp fix implementation, including migration and display logic.

**Command**:
```bash
npm run test:logs-timestamp-fix
```

**What it tests**:
- Logs display correctly using `$createdAt` ordering
- Migration script backfills timestamp field correctly
- Logs display correctly after migration
- Pagination and filtering work correctly
- New logs integrate with old logs

**Duration**: ~2-3 seconds

**Requirements**:
- Appwrite instance running
- Valid API key in `.env.local`
- At least one user in database

---

## Prerequisites

### 1. Environment Variables

Ensure your `.env.local` file contains:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database IDs
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID=your-logs-collection-id
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=your-users-collection-id
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=your-attendees-collection-id
```

### 2. Appwrite Instance

- Appwrite instance must be running and accessible
- Database and collections must be created
- API key must have admin permissions

### 3. Test Data

- At least one user must exist in the database
- Tests will create and clean up their own test data

## Running Tests

### Quick Start

```bash
# Run a specific integration test
npm run test:logs-timestamp-fix

# Or use npx directly
npx tsx scripts/test-logs-timestamp-fix.ts
```

### Expected Output

Successful test run:
```
🧪 Starting Logs Timestamp Fix Tests

============================================================
✓ Found test user: [user-id]

Test 1: Creating test logs without timestamp field...
✓ Created 3 test logs

[... more tests ...]

============================================================

📊 Test Summary

Total Tests: 8
Passed: 8 ✓
Failed: 0 ✗

🎉 All tests passed!
```

Failed test run:
```
Test 2: Verify logs display correctly...
✗ Failed: Logs not in correct chronological order

============================================================

📊 Test Summary

Total Tests: 8
Passed: 7 ✓
Failed: 1 ✗

❌ Some tests failed
```

## Test Environments

### Development

Run tests against your local development database:

```bash
# Ensure .env.local points to development Appwrite
npm run test:logs-timestamp-fix
```

### Staging

Run tests against staging before production deployment:

```bash
# Update .env.local to point to staging Appwrite
npm run test:logs-timestamp-fix
```

### Production

⚠️ **Caution**: Only run tests in production if absolutely necessary. Tests create and delete data.

```bash
# Update .env.local to point to production Appwrite
npm run test:logs-timestamp-fix
```

## Troubleshooting

### Connection Errors

**Symptom**: `ENOTFOUND` or connection timeout

**Solutions**:
1. Verify Appwrite instance is running
2. Check `NEXT_PUBLIC_APPWRITE_ENDPOINT` in `.env.local`
3. Verify network connectivity
4. Check firewall settings

### Authentication Errors

**Symptom**: 401 or 403 errors

**Solutions**:
1. Verify `APPWRITE_API_KEY` in `.env.local`
2. Ensure API key has admin permissions
3. Check API key is not expired
4. Verify project ID is correct

### No Users Found

**Symptom**: "No users found in database"

**Solutions**:
1. Create at least one user in the application
2. Use the signup page to create a test user
3. Verify users collection ID is correct

### Test Failures

**Symptom**: One or more tests fail

**Solutions**:
1. Check test output for specific error messages
2. Verify database schema is correct
3. Check for data corruption
4. Review recent code changes
5. Run tests again to rule out transient issues

## Creating New Integration Tests

When creating new integration tests that require database access:

### 1. Create Test Script

Create a new script in `scripts/` directory:

```typescript
// scripts/test-my-feature.ts
import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runTests() {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  // Your test logic here
  console.log('🧪 Starting My Feature Tests\n');
  
  try {
    // Test 1
    console.log('Test 1: ...');
    // ... test logic ...
    console.log('✓ Test 1 passed\n');

    // Test 2
    console.log('Test 2: ...');
    // ... test logic ...
    console.log('✓ Test 2 passed\n');

    console.log('🎉 All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
```

### 2. Add npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "test:my-feature": "tsx scripts/test-my-feature.ts"
  }
}
```

### 3. Create Documentation

Create test documentation in `docs/testing/`:

- `MY_FEATURE_TESTING_GUIDE.md` - How to run tests
- `MY_FEATURE_TEST_RESULTS.md` - Test results

### 4. Best Practices

1. **Always Clean Up**: Delete test data after tests complete
2. **Use Try/Finally**: Ensure cleanup runs even if tests fail
3. **Clear Output**: Use emojis and formatting for readability
4. **Error Handling**: Catch and report errors clearly
5. **Exit Codes**: Use 0 for success, 1 for failure
6. **Progress Logging**: Show progress for long-running tests
7. **Summary**: Provide clear pass/fail summary at end

### Example Template

```typescript
import { Client, Databases, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runTests() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const testDataIds: string[] = [];

  console.log('🧪 Starting Tests\n');
  console.log('='.repeat(60));

  try {
    // Test 1
    console.log('Test 1: Description...');
    // ... test logic ...
    console.log('✓ Test 1 passed\n');

    // Test 2
    console.log('Test 2: Description...');
    // ... test logic ...
    console.log('✓ Test 2 passed\n');

    console.log('='.repeat(60));
    console.log('\n🎉 All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);

  } finally {
    // Cleanup
    console.log('\nCleaning up test data...');
    for (const id of testDataIds) {
      try {
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          'collection-id',
          id
        );
      } catch (error) {
        console.error(`Failed to delete ${id}`);
      }
    }
    console.log('✓ Cleanup complete');
  }
}

runTests();
```

## CI/CD Integration

### GitHub Actions

For CI/CD pipelines, you can run integration tests against a test database:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        env:
          NEXT_PUBLIC_APPWRITE_ENDPOINT: ${{ secrets.TEST_APPWRITE_ENDPOINT }}
          NEXT_PUBLIC_APPWRITE_PROJECT_ID: ${{ secrets.TEST_PROJECT_ID }}
          APPWRITE_API_KEY: ${{ secrets.TEST_API_KEY }}
          # ... other env vars ...
        run: npm run test:logs-timestamp-fix
```

## Summary

Integration tests provide confidence that features work correctly with real database operations. Follow these guidelines:

✅ **Always run tests before production deployment**  
✅ **Clean up test data automatically**  
✅ **Provide clear output and error messages**  
✅ **Document test requirements and procedures**  
✅ **Use npm scripts for easy execution**  
✅ **Test against staging before production**  

## Related Documentation

- [Logs Timestamp Fix Testing Guide](./LOGS_TIMESTAMP_FIX_TESTING_GUIDE.md)
- [Logs Timestamp Fix Test Results](./LOGS_TIMESTAMP_FIX_TEST_RESULTS.md)
- [Testing Configuration](../../.kiro/steering/testing.md)

---

**Last Updated**: November 17, 2025  
**Maintainer**: Development Team
