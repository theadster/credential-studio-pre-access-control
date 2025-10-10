# Test Scripts

## Inject Test Logs

This script creates 1000 test log entries for testing the delete logs functionality.

### Prerequisites

1. Make sure you have the required environment variables in your `.env.local`:
   ```
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
   NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID=your-logs-collection-id
   NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=your-users-collection-id
   NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=your-attendees-collection-id
   APPWRITE_API_KEY=your-api-key
   ```

2. Install `tsx` if you haven't already:
   ```bash
   npm install -D tsx
   ```

### Usage

Run the script from the project root:

```bash
npx tsx scripts/inject-test-logs.ts
```

### What It Does

- Creates 1000 log entries with random actions
- Uses random dates between October 1, 2025 and October 6, 2025
- Randomly assigns logs to existing users
- Randomly assigns some logs to existing attendees
- **Uses enhanced log formatting** with proper capitalization and detailed descriptions
- Creates realistic log details based on action type
- Processes in batches of 10 with delays to avoid rate limiting

### Log Actions Generated

All logs use the enhanced formatting utility for consistent, detailed descriptions:

- `create` - "Created attendee John Doe (EVT12345)" or "Created user John Doe (john@example.com) with role \"Administrator\""
- `update` - "Updated attendee Jane Smith (firstName, email, company and 2 more)"
- `delete` - "Deleted attendee Bob Johnson (EVT67890)"
- `view` - "Viewed attendee Alice Williams"
- `print` - "Printed badge for Charlie Brown (EVT24680)"
- `login` - "User logged in"
- `logout` - "User logged out"
- `export` - "Exported 150 attendees as CSV (attendees_export_2025-10-09.csv)"
- `import` - "Imported 100 attendees from attendees_2025.csv including John Doe, Jane Smith, Bob Johnson and 97 more"
- `delete_logs` - "Deleted 500 logs"

### Testing Delete Logs

After running this script:

1. Go to the Activity Logs tab in your dashboard
2. Click "Delete Logs"
3. Select a date range (e.g., before October 5, 2025)
4. Optionally filter by action type or user
5. Click "Delete Logs" and observe:
   - Progress indicator shows "Processing..."
   - No rate limit errors in console
   - Completion shows actual count deleted
   - Page refreshes after 3 seconds

### Note

⚠️ **Important**: Appwrite doesn't allow setting custom `$createdAt` timestamps via the API. The logs will be created with the current timestamp, but the intended test dates are stored in the `details` field for reference.

If you need logs with actual past dates for testing, you would need to:
1. Use the Appwrite Console to manually adjust timestamps, or
2. Use a database migration script with direct database access, or
3. Test with "before today's date" as the deletion criteria

### Cleanup

To remove all test logs:

1. Go to Activity Logs tab
2. Click "Delete Logs"
3. Select "before" today's date
4. Click "Delete Logs"
